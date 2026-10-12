import { ok } from '@/core/result/result';
import type { WalletRepository } from '../../domain/repository/wallet-repository';

export function createPreviewWalletRepository(): WalletRepository {
  return {
    getWallets: () =>
      Promise.resolve(
        ok([
          {
            id: 'preview-wallet',
            address: 'Axxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx1',
            blockchain: 'SOL',
            balances: [
              { tokenId: 'usdc-sol', symbol: 'USDC', amount: '5136.98', decimals: 6 },
              { tokenId: 'usdt-sol', symbol: 'USDT', amount: '0', decimals: 6 },
            ],
          },
        ]),
      ),

    createChallenge: () =>
      Promise.resolve(
        ok({ challengeId: 'preview-challenge', userToken: 'preview', encryptionKey: 'preview' }),
      ),

    createPinChangeChallenge: () =>
      Promise.resolve(
        ok({
          challengeId: 'preview-pin-challenge',
          userToken: 'preview',
          encryptionKey: 'preview',
        }),
      ),
  };
}
