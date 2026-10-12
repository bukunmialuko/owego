import { ok } from '@/core/result/result';
import type { SolanaNetworkRepository } from '../../domain/repository/solana-network-repository';

const PREVIEW_BALANCE = 125_500_000n;

export function createPreviewSolanaNetworkRepository(): SolanaNetworkRepository {
  return {
    getRecentBlockhash: () =>
      Promise.resolve(
        ok({
          blockhash: 'EkSnNWid2cvwEVnVx9aBqawnmiCNiDgp3gUdkDPTKN1N',
          lastValidBlockHeight: 1_000n,
          minContextSlot: 900n,
        }),
      ),
    getTokenBalance: () => Promise.resolve(ok(PREVIEW_BALANCE)),
    getSignatureStatus: () =>
      Promise.resolve(ok({ type: 'landed', commitment: 'confirmed', failed: false })),
  };
}
