import { ErrorCode, offline } from '@/core/errors/app-error';
import { err, ok } from '@/core/result/result';
import { createAccountCaptureRemoteDataSource } from './account-capture-remote-datasource';

const STILL = {
  uri: 'file:///cache/capture.jpg',
  width: 1280,
  height: 720,
  mimeType: 'image/jpeg',
};

type Part = { name: string; value: unknown };

function withRecordingFormData() {
  const parts: Part[] = [];
  const host = globalThis as unknown as { FormData: typeof FormData };
  const original = host.FormData;

  class RecordingFormData {
    append(name: string, value: unknown) {
      parts.push({ name, value });
    }
  }

  host.FormData = RecordingFormData as unknown as typeof FormData;
  afterEach(() => {
    host.FormData = original;
  });

  return parts;
}

function build(response: unknown) {
  const post = jest.fn().mockResolvedValue(ok(response));

  return {
    dataSource: createAccountCaptureRemoteDataSource({ post }),
    post,
  };
}

describe('AccountCaptureRemoteDataSource', () => {
  const parts = withRecordingFormData();

  it('posts the photograph to /transaction/ocr', async () => {
    const { dataSource, post } = build({ data: {} });

    await dataSource.readAccount(STILL);

    expect(post).toHaveBeenCalledWith('/transaction/ocr', expect.anything());
  });

  it('sends it as a single part named image, as the endpoint expects', async () => {
    const { dataSource } = build({ data: {} });

    await dataSource.readAccount(STILL);

    expect(parts).toEqual([
      {
        name: 'image',
        value: { uri: 'file:///cache/capture.jpg', name: 'capture.jpg', type: 'image/jpeg' },
      },
    ]);
  });

  it('lets the platform set the content type, boundary and all', async () => {
    const { dataSource, post } = build({ data: {} });

    await dataSource.readAccount(STILL);

    expect(post).toHaveBeenCalledTimes(1);
    expect(post.mock.calls[0]).toHaveLength(2);
  });

  it('reads the account out of the envelope', async () => {
    const { dataSource } = build({
      data: {
        account_number: '1000000000',
        bank_name: 'Opay',
        bank_code: '100004',
        account_name: 'John Doe',
        is_verified: true,
      },
    });

    await expect(dataSource.readAccount(STILL)).resolves.toEqual({
      ok: true,
      value: {
        account_number: '1000000000',
        bank_name: 'Opay',
        bank_code: '100004',
        account_name: 'John Doe',
        is_verified: true,
      },
    });
  });

  it('passes a request that did not complete straight through', async () => {
    const post = jest.fn().mockResolvedValue(err(offline()));
    const dataSource = createAccountCaptureRemoteDataSource({ post });

    const result = await dataSource.readAccount(STILL);

    expect(result).toMatchObject({ ok: false, error: { code: ErrorCode.NetworkOffline } });
  });

  it('refuses a payload it cannot read rather than guessing at it', async () => {
    const { dataSource } = build({ data: { account_number: 42 } });

    const result = await dataSource.readAccount(STILL);

    expect(result.ok).toBe(false);
  });
});
