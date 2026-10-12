import { createPreviewCorridorLookupRepository } from './preview-corridor-lookup-repository';

const NIGERIA = { countryCode: 'NG' };

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('the preview corridor lookups', () => {
  it('offers a handful of Nigerian banks with their real codes', async () => {
    const options = await createPreviewCorridorLookupRepository().getOptions('bankList', NIGERIA);

    expect(options.ok ? options.value : []).toContainEqual({
      value: '058',
      label: 'Guaranty Trust Bank',
    });
  });

  it('resolves the numbers it knows to the same person every time', async () => {
    const pending = createPreviewCorridorLookupRepository().resolveAccount('058', '0123456789');
    await jest.runAllTimersAsync();

    expect(await pending).toEqual({
      ok: true,
      value: { accountName: 'Hannah Nuggest', accountNumber: '0123456789' },
    });
  });

  it('resolves an unknown number to nobody rather than to a plausible name', async () => {
    const pending = createPreviewCorridorLookupRepository().resolveAccount('058', '9999999999');
    await jest.runAllTimersAsync();

    expect(await pending).toEqual({ ok: true, value: undefined });
  });

  it('offers the same reference data production does', async () => {
    const repository = createPreviewCorridorLookupRepository();

    expect(await repository.getOptions('networks', NIGERIA)).toEqual(
      expect.objectContaining({ ok: true }),
    );
    expect((await repository.getOptions('beneficiaryCategories', NIGERIA)).ok).toBe(true);
  });
});
