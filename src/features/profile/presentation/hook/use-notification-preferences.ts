import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useResolve } from '@/core/di/container-provider';
import { AppErrorException } from '@/core/errors/app-error-exception';
import type { SettingsNotificationPreferences } from '../../domain/port/settings-notifications-port';

const prefix = ['settings', 'notifications'] as const;
const flagsKey = [...prefix, 'flags'] as const;
const permissionKey = [...prefix, 'permission'] as const;

type Change = { channel: 'email' | 'in-app'; enabled: boolean };

export type PreferenceFailure = 'load' | 'save';

export function useNotificationPreferences(
  isOpen: boolean,
  { onFailure }: { onFailure: (failure: PreferenceFailure) => void },
) {
  const settingsNotificationsPort = useResolve('settingsNotificationsPort');
  const queryClient = useQueryClient();

  const latestOnFailure = useRef(onFailure);
  useEffect(() => {
    latestOnFailure.current = onFailure;
  });

  const flags = useQuery<SettingsNotificationPreferences>({
    queryKey: flagsKey,
    enabled: isOpen,
    queryFn: async () => {
      const result = await settingsNotificationsPort.read();
      if (!result.ok) throw new AppErrorException(result.error);

      return result.value;
    },
  });

  const { isLoadingError: firstReadFailed, errorUpdatedAt: firstReadFailedAt } = flags;
  useEffect(() => {
    if (firstReadFailed) latestOnFailure.current('load');
  }, [firstReadFailed, firstReadFailedAt]);

  const permission = useQuery({
    queryKey: permissionKey,
    enabled: isOpen,
    queryFn: () => settingsNotificationsPort.readPermission(),
  });

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void queryClient.invalidateQueries({ queryKey: prefix });
    });

    return () => {
      subscription.remove();
    };
  }, [queryClient]);

  const save = useMutation({
    mutationFn: async ({ channel, enabled }: Change) => {
      const result =
        channel === 'email'
          ? await settingsNotificationsPort.setEmail(enabled)
          : await settingsNotificationsPort.setInApp(enabled);
      if (!result.ok) throw new AppErrorException(result.error);

      return result.value;
    },
    onError: () => {
      latestOnFailure.current('save');
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: prefix }),
  });

  const { reset } = save;
  useEffect(() => {
    if (isOpen) reset();
  }, [isOpen, reset]);

  return {
    preferences: flags.data,
    permission: permission.data,
    savingChannel: save.isPending ? save.variables?.channel : undefined,
    outcome: save.data?.type,
    setEmail: (enabled: boolean) => {
      save.mutate({ channel: 'email', enabled });
    },
    setInApp: (enabled: boolean) => {
      save.mutate({ channel: 'in-app', enabled });
    },
  };
}
