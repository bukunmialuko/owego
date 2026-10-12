import { z } from 'zod';

export const userProfileSchema = z.object({
  id: z.string().default(''),
  firstname: z.string().default(''),
  lastname: z.string().default(''),
  email: z.string().default(''),
  number: z.string().default(''),
  is_business: z.boolean().default(false),
  business_name: z.string().default(''),
  country: z.string().default(''),
  google_id: z.string().default(''),
  apple_id: z.string().default(''),
  bani_customer_ref: z.string().default(''),
  auth_provider: z.string().default(''),
  picture_url: z.string().default(''),
  kyc_state: z.string().default(''),
});

export type UserProfileDto = z.infer<typeof userProfileSchema>;

const verificationStatusSchema = z.object({
  kyc_verified: z.boolean().default(false),
  is_pin_set: z.boolean().default(false),
});

export type VerificationStatusDto = z.infer<typeof verificationStatusSchema>;

export const cachedProfileSchema = z.object({
  id: z.string().default(''),
  firstname: z.string().default(''),
  picture_url: z.string().default(''),
  country: z.string().default(''),
  kyc_state: z.string().default(''),
});

export type CachedProfileDto = z.infer<typeof cachedProfileSchema>;

export function toCachedProfile(dto: UserProfileDto): CachedProfileDto {
  return {
    id: dto.id,
    firstname: dto.firstname,
    picture_url: dto.picture_url,
    country: dto.country,
    kyc_state: dto.kyc_state,
  };
}

export const authSchema = z.object({
  otp: z.string().default(''),
  user: userProfileSchema.default(() => userProfileSchema.parse({})),
  token: z.string().default(''),
  refresh_token: z.string().default(''),
  verification_status: verificationStatusSchema.default(() => verificationStatusSchema.parse({})),
});

export type AuthDto = z.infer<typeof authSchema>;

export const authResponseSchema = z.object({ data: authSchema });
