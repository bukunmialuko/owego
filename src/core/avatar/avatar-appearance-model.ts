import { z } from 'zod';
import { AVATAR_SWATCH_IDS } from './avatar-appearance';

const appearanceSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('default') }),
  z.object({ kind: z.literal('initials'), swatch: z.enum(AVATAR_SWATCH_IDS) }),
]);

export const avatarAppearanceRecordSchema = z.object({
  user_id: z.string().default(''),
  appearance: appearanceSchema.catch({ kind: 'default' }),
});
