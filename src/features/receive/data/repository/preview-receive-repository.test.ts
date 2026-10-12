import { createPreviewReceiveRepository } from './preview-receive-repository';

async function value<T>(promise: Promise<{ ok: true; value: T } | { ok: false }>): Promise<T> {
  const result = await promise;
  if (!result.ok) throw new Error('expected an ok result');

  return result.value;
}

describe('preview receive repository', () => {
  it('offers the four chains the designs list', async () => {
    const repository = createPreviewReceiveRepository();

    const chains = await value(repository.getChains());

    expect(chains.map((chain) => chain.name)).toEqual(['Solana', 'Base', 'Monad', 'Arc']);
  });

  it('carries the network label, wait and fee each row prints', async () => {
    const repository = createPreviewReceiveRepository();

    const [solana] = await value(repository.getChains());

    expect(solana).toMatchObject({
      networkLabel: 'SOL',
      estimatedTime: '1 - 2 min',
      depositFeePercent: 1,
    });
  });

  it('hands back a copy of its chain list', async () => {
    const repository = createPreviewReceiveRepository();

    const first = await value(repository.getChains());
    first.length = 0;

    expect(await value(repository.getChains())).toHaveLength(4);
  });

  it('gives each chain its own address', async () => {
    const repository = createPreviewReceiveRepository();

    const solana = await value(repository.getAddress('SOL'));
    const base = await value(repository.getAddress('BASE'));

    expect(solana?.address).not.toBe(base?.address);
    expect(solana?.acceptedTokens).toEqual(['USDC', 'USDT']);
  });

  it('accepts USDC only on a bridged chain', async () => {
    const repository = createPreviewReceiveRepository();

    const base = await value(repository.getAddress('BASE'));

    expect(base?.acceptedTokens).toEqual(['USDC']);
  });

  it('answers undefined rather than failing for a chain it has no address for', async () => {
    const repository = createPreviewReceiveRepository();

    const result = await repository.getAddress('NOPE');

    expect(result.ok).toBe(true);
    expect(await value(Promise.resolve(result))).toBeUndefined();
  });
});
