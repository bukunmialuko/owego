import { useYieldOverview } from '@/core/yield/use-yield-overview';
import { depositTargets, withdrawalTargets } from '../../domain/entity/move-target';
import type { MovementKind } from '../../domain/entity/yield-entity';
import { useYieldProducts } from './use-yield';

export function useMoveTargets(kind: MovementKind) {
  const products = useYieldProducts();
  const overview = useYieldOverview();
  const source = kind === 'deposit' ? products : overview;

  return {
    targets:
      kind === 'deposit'
        ? depositTargets(products.data ?? [])
        : withdrawalTargets(overview.data?.positions ?? [], products.data ?? []),
    isPending: source.isPending,
    isError: source.isError,
    refetch: () => {
      void source.refetch();
    },
  };
}
