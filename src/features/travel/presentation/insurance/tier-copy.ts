import type { TranslationKey } from '@/core/i18n/translation-key';
import type { CoverTier } from '../../domain/entity/insurance-entity';

export const TIER_NAME: Record<CoverTier, TranslationKey> = {
  essential: 'insurance.tierEssential',
  deluxe: 'insurance.tierDeluxe',
  platinum: 'insurance.tierPlatinum',
};

export const TIER_DESCRIPTION: Record<CoverTier, TranslationKey> = {
  essential: 'insurance.tierEssentialDescription',
  deluxe: 'insurance.tierDeluxeDescription',
  platinum: 'insurance.tierPlatinumDescription',
};
