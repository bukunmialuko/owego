import { useQuery } from '@tanstack/react-query';
import { useResolve } from '@/core/di/container-provider';
import { AppErrorException } from '@/core/errors/app-error-exception';
import type { SettingsProfile } from '../../domain/port/settings-profile-port';

const settingsQueryKey = {
  profile: ['settings', 'profile'] as const,
};

export function useSettingsProfile() {
  const settingsProfilePort = useResolve('settingsProfilePort');

  return useQuery<SettingsProfile>({
    queryKey: settingsQueryKey.profile,
    queryFn: async () => {
      const result = await settingsProfilePort.loadSettingsProfile();
      if (!result.ok) throw new AppErrorException(result.error);

      return result.value;
    },
  });
}
