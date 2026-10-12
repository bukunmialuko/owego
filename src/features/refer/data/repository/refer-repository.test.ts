import { createAbsentReferRepository } from './absent-refer-repository';
import { createPreviewReferRepository } from './preview-refer-repository';

describe('createAbsentReferRepository', () => {
  const repository = createAbsentReferRepository();

  it('reports no code until one has been issued', async () => {
    await expect(repository.getSummary()).resolves.toEqual({ ok: true, value: undefined });
  });

  it('reports no payouts and no referrals', async () => {
    await expect(repository.getPayouts()).resolves.toEqual({ ok: true, value: [] });
    await expect(repository.getReferrals()).resolves.toEqual({ ok: true, value: [] });
  });
});

describe('createPreviewReferRepository', () => {
  it('quotes the code and the total the design prints', async () => {
    const result = await createPreviewReferRepository().getSummary();

    expect(result.ok && result.value).toMatchObject({
      code: 'FJFOW342',
      totalEarnedMinor: 513_698,
      currency: 'USD',
    });
  });

  it('dates its rows against now, so today is always today', async () => {
    const result = await createPreviewReferRepository().getPayouts();
    const today = new Date().toISOString().slice(0, 10);

    expect(result.ok && result.value.filter((row) => row.createdAt.startsWith(today))).toHaveLength(
      4,
    );
  });

  it('puts four rewards in today and three in yesterday', async () => {
    const result = await createPreviewReferRepository().getPayouts();
    const days = result.ok
      ? new Set(result.value.map((row) => new Date(row.createdAt).getDate()))
      : new Set();

    expect(result.ok && result.value).toHaveLength(7);
    expect(days.size).toBe(2);
  });

  it('reports a pending referral with no reward attached', async () => {
    const result = await createPreviewReferRepository().getReferrals();
    const pending = result.ok ? result.value.filter((row) => row.status === 'pending') : [];

    expect(pending).toHaveLength(4);
    expect(pending[0]).not.toHaveProperty('rewardMinor');
  });

  it('reports a settled referral with the fifty dollars it paid', async () => {
    const result = await createPreviewReferRepository().getReferrals();
    const settled = result.ok ? result.value.filter((row) => row.status === 'settled') : [];

    expect(settled).toHaveLength(3);
    expect(settled[0]).toMatchObject({ rewardMinor: 5000, currency: 'USD' });
  });

  it('hands out a copy of its lists rather than the lists themselves', async () => {
    const repository = createPreviewReferRepository();
    const first = await repository.getPayouts();
    const second = await repository.getPayouts();

    expect(first.ok && second.ok && first.value).not.toBe(second.ok && second.value);
  });
});
