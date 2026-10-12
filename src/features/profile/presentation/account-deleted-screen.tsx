import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { Icon, Screen, ScreenHeader, Text, VStack } from '@/shared/ui';

export function AccountDeletedScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();

  return (
    <Screen>
      <VStack paddingX="lg">
        <ScreenHeader
          closePosition="leading"
          onClose={() => {
            navigation.goBack();
          }}
        />
      </VStack>

      <VStack align="center" justify="center" gap="md" paddingX="lg" style={{ flex: 1 }}>
        <Icon name="shield-checkmark" size="xl" color="brand" />

        <Text variant="heading.h3" align="center">
          {t('profile.accountDeletedTitle')}
        </Text>
        <Text variant="body.m" color="secondary" align="center">
          {t('profile.accountDeletedBody')}
        </Text>
      </VStack>
    </Screen>
  );
}
