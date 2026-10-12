import { ok } from '@/core/result/result';
import type { ExternalWalletPort } from '../../domain/port/external-wallet-port';

const PREVIEW_EXTERNAL_WALLET = 'Prev1ewWa11et1111111111111111111111111111111';

const PREVIEW_SIGNATURE =
  '5VERv8NMvzbJMEkV8xnrLkEaWRtSz9CosKDYjCJjBRnbJLgp8uirBgmQpjKhoR4tjF3ZpRzrFmBV6UjKdiSZkQUW';

export function createPreviewExternalWalletAdapter(): ExternalWalletPort {
  return {
    connect: () =>
      Promise.resolve(
        ok({
          type: 'connected',
          account: { address: PREVIEW_EXTERNAL_WALLET, authToken: 'preview' },
        }),
      ),
    signAndSend: () => Promise.resolve(ok({ type: 'submitted', signature: PREVIEW_SIGNATURE })),
  };
}
