import { ok } from '@/core/result/result';
import type { ProfileRepository } from '../../domain/repository/auth-repository';

const PREVIEW_PROFILE = {
  id: 'preview-user',
  firstName: 'Precious',
  lastName: 'Jameson',
  email: 'precious.james@gmail.com',
  phone: '+234 0123 456 7890',
  country: 'ng',
  isBusiness: false,
  businessName: '',
  pictureUrl: '',
  kycState: 'APPROVED',
};

export function createPreviewProfileRepository(): ProfileRepository {
  return {
    getProfile: () => Promise.resolve(ok(PREVIEW_PROFILE)),
    cachedProfile: () => PREVIEW_PROFILE,
  };
}
