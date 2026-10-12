import type { AvatarSwatchId } from '@/core/avatar/avatar-appearance';
import type { TranslationKey } from '@/core/i18n/translation-key';
import type { AvatarSwatch } from '@/shared/ui';

export const AVATAR_SWATCHES = {
  charcoal: { swatch: 'charcoal', label: 'profile.avatarColourCharcoal' },
  coral: { swatch: 'coral', label: 'profile.avatarColourCoral' },
  mint: { swatch: 'mint', label: 'profile.avatarColourMint' },
  violet: { swatch: 'violet', label: 'profile.avatarColourViolet' },
  pink: { swatch: 'pink', label: 'profile.avatarColourPink' },
  lime: { swatch: 'lime', label: 'profile.avatarColourLime' },
  aqua: { swatch: 'aqua', label: 'profile.avatarColourAqua' },
  blue: { swatch: 'blue', label: 'profile.avatarColourBlue' },
  sand: { swatch: 'sand', label: 'profile.avatarColourSand' },
  white: { swatch: 'white', label: 'profile.avatarColourWhite' },
} as const satisfies Record<AvatarSwatchId, { swatch: AvatarSwatch; label: TranslationKey }>;
