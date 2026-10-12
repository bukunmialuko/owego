import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useForegroundNotifications } from '@/features/notification/presentation/hook/use-foreground-notifications';
import { Banner } from '@/shared/ui';

export function ForegroundNotificationBanner() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { message, dismiss } = useForegroundNotifications();

  if (message === undefined) return null;

  return (
    <View style={[styles.container, { top: insets.top }]} pointerEvents="box-none">
      <Banner
        tone="info"
        message={message.title}
        description={message.body}
        dismissLabel={t('common.close')}
        onDismiss={dismiss}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { left: 0, position: 'absolute', right: 0, zIndex: 10 },
});
