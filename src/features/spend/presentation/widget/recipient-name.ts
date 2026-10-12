import type { TranslationKey } from '@/core/i18n/translation-key';
import type { PayoutRecipient } from '../../domain/entity/payout-recipient';

type Translate = (key: TranslationKey) => string;

export function recipientName(recipient: PayoutRecipient, t: Translate): string {
  if (recipient.displayName !== '' || recipient.unnamedKey === undefined) {
    return recipient.displayName;
  }

  return t(recipient.unnamedKey);
}
