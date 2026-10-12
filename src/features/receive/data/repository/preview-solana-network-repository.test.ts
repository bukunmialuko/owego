import { ok } from '@/core/result/result';
import { createPreviewExternalWalletAdapter } from '../adapter/preview-external-wallet-adapter';
import { createPreviewSolanaNetworkRepository } from './preview-solana-network-repository';

const USDC = { symbol: 'USDC', mint: 'mint', decimals: 6 } as const;

describe('preview external wallet', () => {
  it('holds a balance to deposit from', async () => {
    expect(await createPreviewSolanaNetworkRepository().getTokenBalance('owner', USDC)).toEqual(
      ok(125_500_000n),
    );
  });

  it('answers with a blockhash, and confirms whatever it is asked about', async () => {
    const repository = createPreviewSolanaNetworkRepository();

    expect((await repository.getRecentBlockhash()).ok).toBe(true);
    expect(await repository.getSignatureStatus('sig')).toEqual(
      ok({ type: 'landed', commitment: 'confirmed', failed: false }),
    );
  });

  it('connects and sends without leaving the app', async () => {
    const wallet = createPreviewExternalWalletAdapter();
    const connected = await wallet.connect();
    if (!connected.ok || connected.value.type !== 'connected') throw new Error('expected a wallet');

    const sent = await wallet.signAndSend(
      connected.value.account,
      { token: USDC, source: connected.value.account.address, destination: 'circle', amount: 1n },
      { blockhash: 'h', lastValidBlockHeight: 1n, minContextSlot: 1n },
    );

    expect(sent).toEqual(ok({ type: 'submitted', signature: expect.any(String) }));
  });
});
