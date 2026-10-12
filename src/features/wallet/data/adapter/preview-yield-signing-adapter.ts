import { ok } from '@/core/result/result';
import type { WalletChallenge } from '../../domain/entity/wallet-entity';

export function createPreviewYieldSigningAdapter() {
  return {
    sign: (_challenge: WalletChallenge) =>
      Promise.resolve(
        ok({
          type: 'settled' as const,
          status: 'complete' as const,
          resultType: 'signature' as const,
          signedTransaction: 'preview-signed-transaction',
        }),
      ),
  };
}
