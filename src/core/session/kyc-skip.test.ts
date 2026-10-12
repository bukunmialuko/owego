import { createKeyValueStorage } from '@/core/storage/mmkv-key-value-storage';
import { PreferenceKey } from '@/core/storage/storage-keys';
import { hasSkippedKyc, rememberKycSkipped } from './kyc-skip';

describe('kyc skip', () => {
  it('has not been skipped on a fresh device', () => {
    expect(hasSkippedKyc(createKeyValueStorage('kyc-skip-fresh'))).toBe(false);
  });

  it('remembers a skip', () => {
    const cache = createKeyValueStorage('kyc-skip-remembered');

    rememberKycSkipped(cache);

    expect(hasSkippedKyc(cache)).toBe(true);
  });

  it('reads the value earlier builds wrote', () => {
    const cache = createKeyValueStorage('kyc-skip-legacy');
    cache.setString(PreferenceKey.KycSkipped, 'true');

    expect(hasSkippedKyc(cache)).toBe(true);
  });
});
