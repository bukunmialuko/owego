import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';
import { Card, HStack, Icon, Text } from '@/shared/ui';
import type { TranslationKey } from '@/core/i18n/translation-key';
import type { IoniconsIconName } from '@react-native-vector-icons/ionicons';

const SPEND_TARGET = '$150';
const WINDOW_DAYS = '30';
const REWARD = '$50';

const STEPS: { id: string; icon: IoniconsIconName; key: TranslationKey }[] = [
  { id: 'invite', icon: 'person-circle-outline', key: 'refer.stepInvite' },
  { id: 'transact', icon: 'logo-usd', key: 'refer.stepFirstTransaction' },
  { id: 'earn', icon: 'sunny-outline', key: 'refer.stepSpendToEarn' },
];

export function HowItWorksCard() {
  const { t } = useTranslation();

  return (
    <Card variant="sunken" padding="lg" gap="lg">
      {STEPS.map(({ id, icon, key }) => (
        <HStack key={id} gap="md" align="flex-start">
          <Icon name={icon} size="lg" color="brand" />
          <Text variant="body.mEmphasis" style={styles.copy}>
            {t(key, { spend: SPEND_TARGET, days: WINDOW_DAYS, reward: REWARD })}
          </Text>
        </HStack>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({ copy: { flex: 1 } });
