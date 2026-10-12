import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking } from 'react-native';
import { Banner, BottomSheet, HStack, Switch, Text, Toast, useToast, VStack } from '@/shared/ui';
import { useNotificationPreferences } from '../hook/use-notification-preferences';

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export function NotificationsSheet({ isOpen, onClose }: Props) {
  const { t } = useTranslation();
  const { toast, show, hide } = useToast();
  const { preferences, permission, savingChannel, outcome, setEmail, setInApp } =
    useNotificationPreferences(isOpen, {
      onFailure: (failure) => {
        show(t(failure === 'load' ? 'notification.loadFailed' : 'notification.saveFailed'));
      },
    });

  useEffect(() => {
    if (isOpen) hide();
  }, [isOpen, hide]);

  const isBlocked =
    permission === 'blocked' || (outcome === 'blocked-in-settings' && permission !== 'granted');

  const rowsDisabled = preferences === undefined || savingChannel !== undefined;

  return (
    <BottomSheet
      isOpen={isOpen}
      title={t('notification.settingsTitle')}
      closeLabel={t('common.close')}
      onClose={onClose}
      hasCloseButton
      overlay={<Toast toast={toast} dismissLabel={t('common.close')} onDismiss={hide} />}
    >
      {outcome === 'needs-permission' && permission !== 'granted' && (
        <Banner tone="warning" message={t('notification.permissionNeeded')} />
      )}

      {isBlocked && (
        <Banner
          tone="warning"
          message={t('notification.blockedTitle')}
          description={t('notification.blockedBody')}
          action={{
            label: t('common.openSettings'),
            onPress: () => {
              void Linking.openSettings();
            },
          }}
        />
      )}

      <PreferenceRow
        title={t('notification.email')}
        description={t('notification.emailDescription')}
        checked={preferences?.emailEnabled ?? true}
        disabled={rowsDisabled}
        isSaving={savingChannel === 'email'}
        onChange={setEmail}
      />

      <PreferenceRow
        title={t('notification.inAppNotifications')}
        description={t('notification.inAppNotificationsDescription')}
        checked={preferences?.inAppEnabled ?? false}
        disabled={rowsDisabled}
        isSaving={savingChannel === 'in-app'}
        onChange={setInApp}
      />
    </BottomSheet>
  );
}

function PreferenceRow({
  title,
  description,
  checked,
  disabled,
  isSaving,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  disabled: boolean;
  isSaving: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <HStack gap="lg" align="flex-start" paddingY="md">
      <VStack gap="xxs" style={{ flex: 1 }}>
        <Text variant="body.mEmphasis">{title}</Text>
        <Text variant="body.s" color="secondary">
          {description}
        </Text>
      </VStack>

      <Switch
        checked={checked}
        onChange={onChange}
        label={title}
        disabled={disabled}
        busy={isSaving}
      />
    </HStack>
  );
}
