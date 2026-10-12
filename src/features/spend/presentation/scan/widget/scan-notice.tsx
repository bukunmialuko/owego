import { useTranslation } from 'react-i18next';
import type { TranslationKey } from '@/core/i18n/translation-key';
import { Banner } from '@/shared/ui';
import type { ScannerState } from '../scanner-state';
import { UNSUPPORTED_MESSAGE } from '../unsupported-message';

type Notice = Extract<ScannerState, { kind: 'notice' }>;

const MESSAGE = {
  ...UNSUPPORTED_MESSAGE,
  readFailed: 'spend.scan.readFailed',
  captureFailed: 'spend.scan.captureFailed',
} as const satisfies Record<string, TranslationKey>;

export function ScanNotice({ notice }: { notice: Notice }) {
  const { t } = useTranslation();

  const outcome = notice.outcome;
  const reason =
    outcome !== undefined && outcome.kind === 'unsupported' ? outcome.reason : notice.reason;

  if (reason === undefined) return null;

  const currency =
    outcome !== undefined && outcome.kind === 'unsupported' ? (outcome.currencyName ?? '') : '';

  return <Banner tone="warning" message={t(MESSAGE[reason], { currency })} />;
}
