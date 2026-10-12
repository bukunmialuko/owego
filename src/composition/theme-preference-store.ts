import type { ThemePreference, ThemePreferenceStore } from '@/core/design-system/theme-provider';
import type { KeyValueStorage } from '@/core/storage/key-value-storage';
import { PreferenceKey } from '@/core/storage/storage-keys';

const PREFERENCES: readonly ThemePreference[] = ['light', 'dark', 'system'];

function isPreference(value: string | undefined): value is ThemePreference {
  return value !== undefined && PREFERENCES.includes(value as ThemePreference);
}

export function createThemePreferenceStore(storage: KeyValueStorage): ThemePreferenceStore {
  return {
    read: () => {
      const stored = storage.getString(PreferenceKey.ThemePreference);

      return isPreference(stored) ? stored : undefined;
    },
    write: (preference) => {
      storage.setString(PreferenceKey.ThemePreference, preference);
    },
  };
}
