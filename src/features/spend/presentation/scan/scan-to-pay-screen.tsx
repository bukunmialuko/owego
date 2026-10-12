import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';
import { ThemeScope } from '@/core/design-system';
import { formatMinor } from '@/core/money/money';
import {
  Banner,
  Button,
  Chip,
  HStack,
  Icon,
  IconButton,
  Screen,
  ScreenHeader,
  VStack,
} from '@/shared/ui';
import { useTokenBalance } from '../hook/use-token-balance';
import { useScanToPay } from './hook/use-scan-to-pay';
import { CameraPermissionView } from './widget/camera-permission-view';
import { ScanNotice } from './widget/scan-notice';
import { ScanResultSheet } from './widget/scan-result-sheet';
import { ScanViewport } from './widget/scan-viewport';

const FUNDING_TOKEN = 'USDC';

export function ScanToPayScreen() {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation();
  const scan = useScanToPay();
  const balance = useTokenBalance(FUNDING_TOKEN);

  const available = balance.data ?? undefined;

  return (
    <>
      <ThemeScope mode="dark">
        <Screen
          edgeToEdgeTop={false}
          backdrop={
            scan.state.kind === 'permission' || scan.state.kind === 'cameraError' ? undefined : (
              <ScanViewport
                active={scan.isCameraActive}
                torch={scan.torch}
                isReady={scan.state.kind !== 'starting'}
                onCodeScanned={scan.onCodeScanned}
                onReady={scan.onCameraReady}
                onError={scan.onCameraError}
                handleRef={scan.handleRef}
              />
            )
          }
          footer={
            <VStack paddingX="lg" gap="md">
              {scan.state.kind === 'notice' && <ScanNotice notice={scan.state} />}

              {scan.state.kind === 'scanning' || scan.state.kind === 'capturing' ? (
                <Button
                  label={t('spend.scan.capture')}
                  variant="secondary"
                  isLoading={scan.state.kind === 'capturing'}
                  onPress={scan.onCapture}
                />
              ) : null}

              {available === undefined ? null : (
                <HStack justify="center">
                  <Chip
                    label={t('spend.scan.available', {
                      amount: formatMinor(available.amountMinor, available.currency, i18n.language),
                    })}
                    leading={<Icon name="wallet-outline" size="sm" color="primary" />}
                  />
                </HStack>
              )}
            </VStack>
          }
        >
          <VStack paddingX="lg" gap="lg" style={styles.body}>
            <ScreenHeader
              onBack={() => {
                navigation.goBack();
              }}
              trailing={
                <IconButton
                  label={t(scan.torch ? 'spend.scan.torchOff' : 'spend.scan.torchOn')}
                  icon={scan.torch ? 'flashlight' : 'flashlight-outline'}
                  onPress={scan.onToggleTorch}
                />
              }
            />

            {scan.state.kind === 'permission' && (
              <CameraPermissionView
                permission={scan.state.permission}
                onAllow={scan.onAllowCamera}
              />
            )}

            {scan.state.kind === 'cameraError' && (
              <Banner tone="error" message={t('spend.scan.cameraUnavailable')} />
            )}
          </VStack>
        </Screen>
      </ThemeScope>

      <ScanResultSheet
        outcome={scan.state.kind === 'confirming' ? scan.state.outcome : undefined}
        onContinue={scan.onContinue}
        onClose={scan.onDismiss}
      />
    </>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1 },
});
