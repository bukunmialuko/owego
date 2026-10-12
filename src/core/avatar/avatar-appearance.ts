export const AVATAR_SWATCH_IDS = [
  'charcoal',
  'coral',
  'mint',
  'violet',
  'pink',
  'lime',
  'aqua',
  'blue',
  'sand',
  'white',
] as const;

export type AvatarSwatchId = (typeof AVATAR_SWATCH_IDS)[number];

export type AvatarAppearance = { kind: 'default' } | { kind: 'initials'; swatch: AvatarSwatchId };

export const DEFAULT_AVATAR_APPEARANCE: AvatarAppearance = { kind: 'default' };

export interface AvatarAppearanceRepository {
  read(ownerId: string | undefined): AvatarAppearance;
  write(ownerId: string, appearance: AvatarAppearance): void;
}
