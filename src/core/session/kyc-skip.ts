import type { KeyValueStorage } from '@/core/storage/key-value-storage';
import { PreferenceKey } from '@/core/storage/storage-keys';

export function hasSkippedKyc(cache: KeyValueStorage): boolean {
  return cache.getString(PreferenceKey.KycSkipped) === 'true';
}

export function rememberKycSkipped(cache: KeyValueStorage): void {
  cache.setString(PreferenceKey.KycSkipped, 'true');
}
