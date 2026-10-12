import { createPreviewTransactionDetailRepository } from './preview-home-repository';

describe('createPreviewTransactionDetailRepository', () => {
  it('serves the payout to Hannah behind the dashboard row t2', async () => {
    const result = await createPreviewTransactionDetailRepository().getById('t2');

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected success');
    expect(result.value).toMatchObject({
      status: 'successful',
      direction: 'outgoing',
      amount: { minor: 5000, currency: 'USD' },
      localAmount: { minor: 3717, currency: 'GBP' },
      fee: { minor: 25, currency: 'USD' },
      narration: 'For goods and services',
      counterparty: {
        kind: 'bank',
        name: 'Hannah Nuggest',
        bankName: 'Barclays',
        accountNumber: '01235780381',
        countryCode: 'GB',
      },
    });
    expect(result.value.signature).toBeDefined();
  });

  it.each([
    ['t1', 'successful', 'incoming'],
    ['t3', 'failed', 'outgoing'],
  ])('serves %s as a %s %s transaction, like its row', async (id, status, direction) => {
    const result = await createPreviewTransactionDetailRepository().getById(id);

    expect(result.ok && result.value).toMatchObject({ status, direction });
  });

  it('fails for an id the dashboard never showed', async () => {
    expect((await createPreviewTransactionDetailRepository().getById('t9')).ok).toBe(false);
  });
});
