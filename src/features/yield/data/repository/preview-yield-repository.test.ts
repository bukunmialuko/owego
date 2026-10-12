import { createPreviewYieldRepository } from './preview-yield-repository';

async function value<T>(promise: Promise<{ ok: true; value: T } | { ok: false }>): Promise<T> {
  const result = await promise;
  if (!result.ok) throw new Error('expected an ok result');

  return result.value;
}

describe('preview yield repository', () => {
  it('offers one vault that can be staked into and one that cannot', async () => {
    const products = await value(createPreviewYieldRepository().getProducts());

    expect(products.map(({ tokenSymbol, isStakeable }) => [tokenSymbol, isStakeable])).toEqual([
      ['USDC', true],
      ['USDT', false],
    ]);
  });

  it.each([
    ['deposit', 1_525],
    ['withdrawal', 1_475],
  ] as const)('prices a %s with the design’s 25¢ fee', async (kind, totalMinor) => {
    await expect(
      value(createPreviewYieldRepository().quote({ kind, amountMinor: 1_500 })),
    ).resolves.toEqual({ kind, amountMinor: 1_500, feeMinor: 25, totalMinor, currency: 'USD' });
  });

  it('builds a move and settles its broadcast', async () => {
    const repository = createPreviewYieldRepository();

    const initiation = await value(
      repository.initiate({
        kind: 'deposit',
        amountMinor: 1_500,
        tokenSymbol: 'USDC',
        tokenMint: 'm',
      }),
    );

    await expect(
      value(
        repository.broadcast({ signedTransaction: 's', transactionId: initiation.transactionId }),
      ),
    ).resolves.toBe('succeeded');
  });
});
