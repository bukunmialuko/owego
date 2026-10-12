import type { TranslationKey } from '@/core/i18n/translation-key';
import type { DetailItem } from '@/shared/ui';
import type { ScanOutcome } from '../../domain/scan/scan-outcome';

type Translate = (key: TranslationKey) => string;

export function scanResultRows(outcome: ScanOutcome, t: Translate): readonly DetailItem[] {
  if (outcome.kind === 'account') {
    const { recipient } = outcome;

    return [
      ...(recipient.displayName === ''
        ? []
        : [{ label: t('spend.accountHolder'), value: recipient.displayName }]),
      { label: t('spend.scan.bank'), value: bankOf(recipient.subtitle) },
      { label: t('common.accountNumber'), value: recipient.values['accountNumber'] ?? '' },
      { label: t('common.currency'), value: recipient.currency },
    ];
  }

  return [];
}

function bankOf(subtitle: string): string {
  const [bank = ''] = subtitle.split('•');

  return bank.trim();
}
