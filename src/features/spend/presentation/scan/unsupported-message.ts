import type { TranslationKey } from '@/core/i18n/translation-key';
import type { UnsupportedReason } from '../../domain/scan/scan-outcome';

export const UNSUPPORTED_MESSAGE = {
  malformedQr: 'spend.scan.unreadableCode',
  cardSchemeQr: 'spend.scan.cardCode',
  currencyNotOffered: 'spend.scan.notAvailable',
  comingSoon: 'spend.scan.comingSoon',
  remoteAmount: 'spend.scan.unsupportedCode',
  corridorUnavailable: 'spend.scan.notAvailable',
  unsupportedChain: 'spend.scan.unsupportedCode',
  unknownCode: 'spend.scan.unsupportedCode',
  oneTimeCode: 'spend.scan.oneTimeCode',
} as const satisfies Record<UnsupportedReason, TranslationKey>;
