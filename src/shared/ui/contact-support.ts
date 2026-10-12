import { useCallback } from 'react';
import { Alert, Linking } from 'react-native';
import { useTranslation } from 'react-i18next';

const SUPPORT_ADDRESS = 'support@ribhfinance.com';
const SUPPORT_SUBJECT = 'Customer Support Needed (Owego App)';

export function useContactSupport() {
  const { t } = useTranslation();

  return useCallback(async () => {
    const url = `mailto:${SUPPORT_ADDRESS}?subject=${encodeURIComponent(SUPPORT_SUBJECT)}`;

    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert(t('common.sendEmail'), SUPPORT_ADDRESS);
    }
  }, [t]);
}
