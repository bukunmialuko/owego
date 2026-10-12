import type { Session, UserProfile, VerificationStatus } from '../../domain/entity/auth-entity';
import type { AuthDto, UserProfileDto, VerificationStatusDto } from '../model/auth-model';

export function toUserProfile(dto: UserProfileDto): UserProfile {
  return {
    id: dto.id,
    firstName: dto.firstname,
    lastName: dto.lastname,
    email: dto.email,
    phone: dto.number,
    country: dto.country,
    isBusiness: dto.is_business,
    businessName: dto.business_name,
    pictureUrl: dto.picture_url,
    kycState: dto.kyc_state,
  };
}

function toVerificationStatus(dto: VerificationStatusDto): VerificationStatus {
  return { kycVerified: dto.kyc_verified, isPinSet: dto.is_pin_set };
}

export function toSession(dto: AuthDto): Session {
  return {
    user: toUserProfile(dto.user),
    tokens: { access: dto.token, refresh: dto.refresh_token },
    verification: toVerificationStatus(dto.verification_status),
  };
}
