import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';
import { ThemeScope } from '@/core/design-system';
import { Banner, IconButton, Screen, ScreenHeader, Text, VStack } from '@/shared/ui';
import { resolveSaveableMerchant } from '../../domain/usecase/resolve-saveable-merchant-usecase';
import { useScannerLifecycle } from '../scan/hook/use-scanner-lifecycle';
import { CameraPermissionView } from '../scan/widget/camera-permission-view';
import { ScanNotice } from '../scan/widget/scan-notice';
import { ScanViewport } from '../scan/widget/scan-viewport';
import type { BeneficiariesParamList } from './beneficiaries-param-list';

export function ScanMerchantScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<BeneficiariesParamList>>();

  const scanner = useScannerLifecycle({
    resolve: resolveSaveableMerchant,
    onLeave: (outcome) => {
      if (outcome.kind !== 'merchant') return;

      navigation.replace('AddMerchant', { qrString: outcome.qrString });
    },
  });

  const { state } = scanner;

  return (
    <ThemeScope mode="dark">
      <Screen
        edgeToEdgeTop={false}
        backdrop={
          state.kind === 'permission' || state.kind === 'cameraError' ? undefined : (
            <ScanViewport
              active={scanner.isCameraActive}
              torch={scanner.torch}
              isReady={state.kind !== 'starting'}
              onCodeScanned={scanner.onCodeScanned}
              onReady={scanner.onCameraReady}
              onError={scanner.onCameraError}
              handleRef={scanner.handleRef}
            />
          )
        }
        footer={
          <VStack paddingX="lg" gap="md">
            {state.kind === 'notice' ? (
              <ScanNotice notice={state} />
            ) : (
              <Text variant="body.m" color="primary" align="center">
                {t('spend.beneficiaries.scanMerchantCaption')}
              </Text>
            )}
          </VStack>
        }
      >
        <VStack paddingX="lg" gap="lg" style={styles.body}>
          <ScreenHeader
            title={t('spend.beneficiaries.scanMerchantTitle')}
            onBack={() => {
              navigation.goBack();
            }}
            trailing={
              <IconButton
                label={t(scanner.torch ? 'spend.scan.torchOff' : 'spend.scan.torchOn')}
                icon={scanner.torch ? 'flashlight' : 'flashlight-outline'}
                onPress={scanner.onToggleTorch}
              />
            }
          />

          {state.kind === 'permission' && (
            <CameraPermissionView
              permission={state.permission}
              purpose="merchant"
              onAllow={scanner.onAllowCamera}
            />
          )}

          {state.kind === 'cameraError' && (
            <Banner tone="error" message={t('spend.scan.cameraUnavailable')} />
          )}
        </VStack>
      </Screen>
    </ThemeScope>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1 },
});
