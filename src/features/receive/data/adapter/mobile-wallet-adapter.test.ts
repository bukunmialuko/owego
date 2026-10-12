import { transact } from '@solana-mobile/mobile-wallet-adapter-protocol';
import { createMobileWalletAdapter } from './mobile-wallet-adapter';

describe('createMobileWalletAdapter (off Android)', () => {
  const adapter = createMobileWalletAdapter({ cluster: 'devnet' });

  it('answers that there is no wallet to connect to here', async () => {
    expect(await adapter.connect()).toEqual({
      ok: true,
      value: { type: 'failed', reason: 'unsupported' },
    });
  });

  it('sends nothing', async () => {
    const result = await adapter.signAndSend(
      { address: 'a', authToken: 't' },
      {
        token: { symbol: 'USDC', mint: 'm', decimals: 6 },
        source: 'a',
        destination: 'b',
        amount: 1n,
      },
      { blockhash: 'h', lastValidBlockHeight: 1n, minContextSlot: 1n },
    );

    expect(result).toEqual({ ok: true, value: { type: 'notSent', reason: 'unsupported' } });
    expect(transact).not.toHaveBeenCalled();
  });
});
