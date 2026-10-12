import { userProfileSchema } from '../model/auth-model';
import { toUserProfile } from './auth-mapper';

const RENAMED: [keyof ReturnType<typeof toUserProfile>, string, string][] = [
  ['firstName', 'firstname', 'Precious'],
  ['lastName', 'lastname', 'Jameson'],
  ['phone', 'number', '+2340123456789'],
  ['isBusiness', 'is_business', ''],
  ['businessName', 'business_name', 'Owego Ltd'],
  ['pictureUrl', 'picture_url', 'https://cdn/avatar.png'],
  ['kycState', 'kyc_state', 'APPROVED'],
];

describe('toUserProfile', () => {
  it.each(RENAMED)('maps %s from the wire’s %s', (field, wireName, value) => {
    const dto = userProfileSchema.parse({ [wireName]: value === '' ? true : value });

    expect(toUserProfile(dto)[field]).toBe(value === '' ? true : value);
  });

  it('maps an empty payload to an empty profile', () => {
    expect(toUserProfile(userProfileSchema.parse({}))).toEqual({
      id: '',
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      country: '',
      isBusiness: false,
      businessName: '',
      pictureUrl: '',
      kycState: '',
    });
  });
});
