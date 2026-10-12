import { useTranslation } from 'react-i18next';
import { KycState } from '@/core/session/onboarding-gate';
import type { TranslationKey } from '@/core/i18n/translation-key';
import { Badge, type BadgeTone } from '@/shared/ui';

const BADGE = {
  [KycState.Approved]: { label: 'profile.kycCompleted', tone: 'success' },
  [KycState.Pending]: { label: 'profile.kycPending', tone: 'warning' },
  [KycState.Rejected]: { label: 'profile.kycRejected', tone: 'error' },
  [KycState.NotStarted]: { label: 'profile.kycNotStarted', tone: 'neutral' },
} as const satisfies Record<KycState, { label: TranslationKey; tone: BadgeTone }>;

export function VerificationBadge({ state }: { state: KycState }) {
  const { t } = useTranslation();
  const { label, tone } = BADGE[state];

  return <Badge label={t(label)} tone={tone} />;
}
