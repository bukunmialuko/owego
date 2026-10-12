import { Linking } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { TranslationKey } from '@/core/i18n/translation-key';
import { Button, EmptyState, VStack } from '@/shared/ui';
import type { CameraPermission } from '../../../domain/port/camera-scanner-port';

type Props = {
  permission: Exclude<CameraPermission, 'granted'>;
  purpose?: 'pay' | 'address' | 'merchant';
  onAllow: () => void;
};

const DESCRIPTION = {
  pay: {
    undetermined: 'spend.scan.permissionBody',
    denied: 'spend.scan.permissionDeniedBody',
    blocked: 'spend.scan.permissionBlockedBody',
  },
  address: {
    undetermined: 'spend.beneficiaries.scanPermissionBody',
    denied: 'spend.beneficiaries.scanPermissionDeniedBody',
    blocked: 'spend.beneficiaries.scanPermissionBlockedBody',
  },
  merchant: {
    undetermined: 'spend.beneficiaries.scanMerchantPermissionBody',
    denied: 'spend.beneficiaries.scanMerchantPermissionDeniedBody',
    blocked: 'spend.beneficiaries.scanMerchantPermissionBlockedBody',
  },
} as const satisfies Record<string, Record<Exclude<CameraPermission, 'granted'>, TranslationKey>>;

export function CameraPermissionView({ permission, purpose = 'pay', onAllow }: Props) {
  const { t } = useTranslation();

  const description = t(DESCRIPTION[purpose][permission]);

  return (
    <VStack paddingX="lg" justify="center" style={{ flex: 1 }}>
      <EmptyState
        title={t('spend.scan.permissionTitle')}
        description={description}
        action={
          permission === 'blocked' ? (
            <Button
              label={t('common.openSettings')}
              variant="secondary"
              onPress={() => {
                void Linking.openSettings();
              }}
            />
          ) : (
            <Button label={t('spend.scan.allowCamera')} onPress={onAllow} />
          )
        }
      />
    </VStack>
  );
}
