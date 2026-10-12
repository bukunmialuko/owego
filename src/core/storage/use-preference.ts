import { useCallback, useState } from 'react';
import { useResolve } from '@/core/di/container-provider';
import type { PreferenceKey } from './storage-keys';

export function useBooleanPreference(
  key: PreferenceKey,
  fallback: boolean,
): [boolean, (value: boolean) => void] {
  const storage = useResolve('cache');
  const [value, setValue] = useState(() => {
    const stored = storage.getString(key);

    return stored === undefined ? fallback : stored === 'true';
  });

  const write = useCallback(
    (next: boolean) => {
      storage.setString(key, String(next));
      setValue(next);
    },
    [key, storage],
  );

  return [value, write];
}
