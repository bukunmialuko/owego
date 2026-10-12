import { useTranslation } from 'react-i18next';
import { Banner, type BannerTone } from '@/shared/ui';
import type { TranslationKey } from '@/core/i18n/translation-key';
import type { VerificationNotice } from '../../domain/entity/home-entity';

type Props = {
  notice: VerificationNotice;
  onDismiss: () => void;
};

const NOTICE: Record<
  VerificationNotice,
  { tone: BannerTone; messageKey: TranslationKey; isDismissible: boolean }
> = {
  verified: {
    tone: 'success',
    messageKey: 'home.verificationVerified',
    isDismissible: true,
  },
  pending: {
    tone: 'warning',
    messageKey: 'home.verificationPending',
    isDismissible: false,
  },
  rejected: {
    tone: 'error',
    messageKey: 'home.verificationRejected',
    isDismissible: false,
  },
};

export function VerificationBanner({ notice, onDismiss }: Props) {
  const { t } = useTranslation();
  const { tone, messageKey, isDismissible } = NOTICE[notice];

  return (
    <Banner
      tone={tone}
      message={t(messageKey)}
      {...(isDismissible ? { dismissLabel: t('home.dismissNotice'), onDismiss } : {})}
    />
  );
}
