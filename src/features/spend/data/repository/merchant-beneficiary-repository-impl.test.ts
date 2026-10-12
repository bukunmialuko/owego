import { offline } from '@/core/errors/app-error';
import { err, ok } from '@/core/result/result';
import { buildMerchantCode } from '@/test/qr-payloads';
import type { RecipientRemoteDataSource } from '../datasource/recipient-remote-datasource';
import { recipientResponseSchema } from '../model/recipient-model';
import { createMerchantBeneficiaryRepositoryImpl } from './merchant-beneficiary-repository-impl';

const STICKER = buildMerchantCode({ merchantName: 'PHO 24' });

function remoteAnswering(created: ReturnType<RecipientRemoteDataSource['create']>) {
  const bodies: unknown[] = [];
  const remoteDataSource: RecipientRemoteDataSource = {
    getPage: () => Promise.resolve(ok({ rows: [], next: undefined })),
    getRecent: () => Promise.resolve(ok([])),
    getById: () => Promise.resolve(err(offline())),
    create: (body) => {
      bodies.push(body);
      return created;
    },
    remove: () => Promise.resolve(ok(undefined)),
  };

  return { bodies, repository: createMerchantBeneficiaryRepositoryImpl({ remoteDataSource }) };
}

describe('the merchant beneficiary repository', () => {
  it('keeps the code as a QR beneficiary, and nothing else', async () => {
    const saved = recipientResponseSchema.parse({ data: { id: 'q1' } }).data;
    const { bodies, repository } = remoteAnswering(Promise.resolve(ok(saved)));

    const result = await repository.save({ qrString: STICKER });

    expect(result).toEqual(ok(undefined));
    expect(bodies).toEqual([{ beneficiary_type: 'qr', meta_data: { qr_string: STICKER } }]);
  });

  it('passes a refusal through', async () => {
    const { repository } = remoteAnswering(Promise.resolve(err(offline())));

    expect(await repository.save({ qrString: STICKER })).toEqual(err(offline()));
  });
});
