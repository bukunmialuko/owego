import type { YieldPosition } from '@/core/yield/yield-overview';
import { MOVABLE_TOKEN, type MoveTarget, type YieldProduct } from './yield-entity';

function canMove(tokenSymbol: string, tokenMint: string): boolean {
  return tokenSymbol === MOVABLE_TOKEN && tokenMint !== '';
}

export function apyOf(
  vaultId: string,
  products: readonly YieldProduct[],
  positions: readonly YieldPosition[],
): number | undefined {
  return (
    products.find((product) => product.id === vaultId)?.apyPercent ??
    positions.find((position) => position.id === vaultId)?.apyPercent
  );
}

function toDepositTarget(product: YieldProduct): MoveTarget {
  return {
    target: {
      vaultId: product.id,
      tokenSymbol: product.tokenSymbol,
      tokenMint: product.tokenMint,
      provider: product.provider,
      ...(product.apyPercent === undefined ? {} : { apyPercent: product.apyPercent }),
    },
    ...(product.walletBalanceMinor === undefined
      ? {}
      : { ceilingMinor: product.walletBalanceMinor }),
  };
}

export function depositTargets(products: readonly YieldProduct[]): MoveTarget[] {
  const movable = products.filter((product) => canMove(product.tokenSymbol, product.tokenMint));
  const enabled = movable.filter((product) => product.isStakeable);

  return (enabled.length > 0 ? enabled : movable).map(toDepositTarget);
}

export function withdrawalTargets(
  positions: readonly YieldPosition[],
  products: readonly YieldProduct[],
): MoveTarget[] {
  return positions
    .filter(
      (position) => canMove(position.tokenSymbol, position.tokenMint) && position.valueMinor > 0,
    )
    .map((position) => {
      const apyPercent = apyOf(position.id, products, positions);

      return {
        target: {
          vaultId: position.id,
          tokenSymbol: position.tokenSymbol,
          tokenMint: position.tokenMint,
          provider: 'jupiter' as const,
          ...(apyPercent === undefined ? {} : { apyPercent }),
        },
        ceilingMinor: position.valueMinor,
      };
    });
}
