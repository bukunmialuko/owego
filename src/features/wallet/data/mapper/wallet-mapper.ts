import type { Wallet, WalletChallenge } from '../../domain/entity/wallet-entity';
import type { WalletChallengeDto, WalletDto } from '../model/wallet-model';

export function toWallet(dto: WalletDto): Wallet {
  return {
    id: dto.id,
    address: dto.address,
    blockchain: dto.blockchain,
    balances: dto.balances.map((balance) => ({
      tokenId: balance.token_id,
      symbol: balance.symbol,
      amount: balance.amount,
      decimals: balance.decimals,
    })),
  };
}

export function toWalletChallenge(dto: WalletChallengeDto): WalletChallenge {
  return {
    challengeId: dto.challenge_id,
    userToken: dto.user_token,
    encryptionKey: dto.encryption_key,
  };
}
