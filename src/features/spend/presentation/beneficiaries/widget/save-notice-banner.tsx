import { useTranslation } from 'react-i18next';
import { Banner } from '@/shared/ui';
import type { SaveNotice } from '../hook/use-save-and-return';

export function SaveNoticeBanner({ notice }: { notice: SaveNotice | undefined }) {
  const { t } = useTranslation();

  if (notice === undefined) return null;

  return notice.kind === 'duplicate' ? (
    <Banner tone="notice" message={t('spend.beneficiaries.duplicate', { name: notice.name })} />
  ) : (
    <Banner tone="error" message={t('spend.beneficiaries.saveFailed')} />
  );
}
