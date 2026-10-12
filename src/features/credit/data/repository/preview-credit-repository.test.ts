import { createPreviewCreditRepository } from './preview-credit-repository';

async function value<T>(promise: Promise<{ ok: true; value: T } | { ok: false }>): Promise<T> {
  const result = await promise;
  if (!result.ok) throw new Error('expected an ok result');

  return result.value;
}

describe('preview credit repository', () => {
  it('quotes the fee the designs print', async () => {
    const repository = createPreviewCreditRepository();

    const quote = await value(repository.quoteLoan(18_000));

    expect(quote.feeMinor).toBe(216);
    expect(quote.repayableMinor).toBe(18_216);
  });

  it('rounds a fee to whole minor units', async () => {
    const repository = createPreviewCreditRepository();

    const quote = await value(repository.quoteLoan(3_333));

    expect(Number.isInteger(quote.feeMinor)).toBe(true);
    expect(quote.repayableMinor).toBe(3_333 + quote.feeMinor);
  });

  it('replaces the active loan when a new one is taken', async () => {
    const repository = createPreviewCreditRepository();

    const loan = await value(repository.takeLoan(25_000));

    expect(loan.principalMinor).toBe(25_000);
    expect(loan.repaidMinor).toBe(0);
    expect(await value(repository.getActiveLoan())).toEqual(loan);
  });

  it('records a repayment against what is owed', async () => {
    const repository = createPreviewCreditRepository();
    const before = await value(repository.getActiveLoan());

    const after = await value(repository.repay(1_000));

    expect(after.loan.repaidMinor).toBe((before?.repaidMinor ?? 0) + 1_000);
  });

  it('quotes the score a repayment earns', async () => {
    const repository = createPreviewCreditRepository();

    const after = await value(repository.repay(1_000));

    expect(after.scoreDeltaPoints).toBe(10);
  });

  it('adds every movement to the ledger, newest first', async () => {
    const repository = createPreviewCreditRepository();
    const before = await value(repository.getMovements());

    await repository.repay(1_000);
    const after = await value(repository.getMovements());

    expect(after).toHaveLength(before.length + 1);
    expect(after[0]?.kind).toBe('repayment');
  });
});
