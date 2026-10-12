import { CLEARED_ON_SIGN_OUT, CacheKey, PreferenceKey, SecureKey } from './storage-keys';

describe('storage keys', () => {
  it('never places the same key in both tiers', () => {
    const secure = new Set<string>(Object.values(SecureKey));
    const overlap = Object.values(CacheKey).filter((key) => secure.has(key));

    expect(overlap).toEqual([]);
  });

  it('uses snake_case throughout, matching v1', () => {
    for (const key of [...Object.values(SecureKey), ...Object.values(CacheKey)]) {
      expect(key).toMatch(/^[a-z][a-z0-9_]*$/);
    }
  });

  it('clears every known key on sign-out', () => {
    const known = [...Object.values(SecureKey), ...Object.values(CacheKey)];

    expect([...CLEARED_ON_SIGN_OUT].sort()).toEqual(known.sort());
  });

  it('keeps the last transfer currency through a sign-out', () => {
    expect(PreferenceKey.LastTransferCurrency).toBe('last_transfer_currency');
    expect(CLEARED_ON_SIGN_OUT).not.toContain(PreferenceKey.LastTransferCurrency);
  });

  it('keeps the Wealth terms acceptance through a sign-out', () => {
    expect(PreferenceKey.WealthTermsAccepted).toBe('wealth_terms_accepted');
    expect(CLEARED_ON_SIGN_OUT).not.toContain(PreferenceKey.WealthTermsAccepted);
  });
});
