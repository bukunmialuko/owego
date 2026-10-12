import { useTranslation } from 'react-i18next';
import { StyleSheet, type GestureResponderHandlers } from 'react-native';
import type { IoniconsIconName } from '@react-native-vector-icons/ionicons';
import type { TranslationKey } from '@/core/i18n/translation-key';
import { Button } from './button';
import { IconCircle } from './icon-circle';
import { Screen } from './screen';
import { VStack } from './stack';
import { Text } from './text';

export type BiometricOfferKind = 'face-id' | 'touch-id' | 'biometrics';

const KIND = {
  'face-id': {
    icon: 'scan-outline',
    title: 'biometricOffer.faceIdTitle',
    action: 'biometricOffer.faceIdAction',
  },
  'touch-id': {
    icon: 'finger-print',
    title: 'biometricOffer.touchIdTitle',
    action: 'biometricOffer.touchIdAction',
  },
  biometrics: {
    icon: 'finger-print',
    title: 'biometricOffer.biometricsTitle',
    action: 'biometricOffer.biometricsAction',
  },
} as const satisfies Record<
  BiometricOfferKind,
  { icon: IoniconsIconName; title: TranslationKey; action: TranslationKey }
>;

type Props = {
  kind: BiometricOfferKind;
  onEnable: () => void;
  onDecline: () => void;
  isBusy: boolean;
  panHandlers?: GestureResponderHandlers;
};

export function BiometricOffer({ kind, onEnable, onDecline, isBusy, panHandlers }: Props) {
  const { t } = useTranslation();
  const copy = KIND[kind];

  return (
    <Screen
      {...(panHandlers === undefined ? {} : { panHandlers })}
      footer={
        <VStack gap="sm" paddingX="lg">
          <Button label={t(copy.action)} isLoading={isBusy} onPress={onEnable} />
          <Button
            variant="secondary"
            label={t('biometricOffer.notNow')}
            disabled={isBusy}
            onPress={onDecline}
          />
        </VStack>
      }
    >
      <VStack style={styles.fill} justify="center" align="center" gap="xl" paddingX="lg">
        <IconCircle tone="brand" icon={copy.icon} />
        <VStack gap="sm" align="center">
          <Text variant="heading.h3" align="center">
            {t(copy.title)}
          </Text>
          <Text variant="body.m" color="secondary" align="center">
            {t('biometricOffer.body')}
          </Text>
        </VStack>
      </VStack>
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
