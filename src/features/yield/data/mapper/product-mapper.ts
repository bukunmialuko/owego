import type { YieldProduct } from '../../domain/entity/yield-entity';
import type { TokenOptionDto } from '../model/yield-options-model';

export function toProducts(tokens: TokenOptionDto[]): YieldProduct[] {
  return tokens.flatMap((token) =>
    token.vaults.map((vault) => ({
      id: vault.address,
      tokenSymbol: token.symbol,
      tokenMint: token.address,
      provider: 'jupiter' as const,
      isStakeable: vault.stakeable,
      ...(vault.totalRate === undefined ? {} : { apyPercent: vault.totalRate }),
    })),
  );
}
