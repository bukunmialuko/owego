export type { Wallet } from '@/core/wallet/wallet';

export type WalletChallenge = {
  challengeId: string;
  userToken: string;
  encryptionKey: string;
};
