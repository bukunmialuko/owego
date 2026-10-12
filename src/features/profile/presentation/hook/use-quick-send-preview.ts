import { useQuery } from '@tanstack/react-query';
import { useResolve } from '@/core/di/container-provider';
import { PAYEE_QUERY_ROOT, type PayeeTint } from '@/core/payee/payee';
import type { AvatarStripItem, AvatarTint } from '@/shared/ui';

const PREVIEW_LIMIT = 5;

const TONE: Record<PayeeTint, AvatarTint> = {
  neutral: 'neutral',
  brand: 'brand',
  success: 'success',
  error: 'error',
  warning: 'warning',
};

export function useQuickSendPreview(): AvatarStripItem[] {
  const payeePort = useResolve('payeePort');

  const { data } = useQuery({
    queryKey: [...PAYEE_QUERY_ROOT, 'settings-preview', PREVIEW_LIMIT],
    queryFn: async () => {
      const result = await payeePort.getRecent(PREVIEW_LIMIT);

      return result.ok
        ? result.value.map((payee) => ({
            id: payee.id,
            label: payee.name,
            tint: TONE[payee.tint],
          }))
        : [];
    },
  });

  return data ?? [];
}
