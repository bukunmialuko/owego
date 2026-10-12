import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/core/design-system/theme-provider';
import { useResolve } from '@/core/di/container-provider';
import { Text, VStack } from '@/shared/ui';
import type { ScannerHandle } from '../../../domain/port/camera-scanner-port';

type Props = {
  active: boolean;
  torch: boolean;
  isReady: boolean;
  onCodeScanned: (raw: string) => void;
  onReady: () => void;
  onError: () => void;
  handleRef: { current: ScannerHandle | null };
};

const FRAME_SHARE = '72%';

const CORNER_SHARE = '24%';

const CORNERS = [
  { top: 0, left: 0, edges: ['Top', 'Left'] },
  { top: 0, right: 0, edges: ['Top', 'Right'] },
  { bottom: 0, left: 0, edges: ['Bottom', 'Left'] },
  { bottom: 0, right: 0, edges: ['Bottom', 'Right'] },
] as const;

export function ScanViewport({
  active,
  torch,
  isReady,
  onCodeScanned,
  onReady,
  onError,
  handleRef,
}: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const CameraSurface = useResolve('cameraScannerView');

  return (
    <View style={StyleSheet.absoluteFill}>
      {/* eslint-disable-next-line react-hooks/static-components -- a stable registration */}
      <CameraSurface
        active={active}
        torch={torch}
        onCodeScanned={onCodeScanned}
        onReady={onReady}
        onError={onError}
        handleRef={handleRef}
      />

      <VStack
        style={StyleSheet.absoluteFill}
        align="center"
        justify="center"
        gap="xl"
        paddingX="xl"
      >
        <View
          accessible
          accessibilityRole="image"
          accessibilityLabel={t('spend.scan.viewfinder')}
          style={styles.frame}
        >
          {CORNERS.map(({ edges, ...position }) => (
            <View
              key={edges.join('')}
              style={[
                styles.corner,
                position,
                {
                  borderColor: theme.color.textOnScrim,
                  borderRadius: theme.radius.lg,
                  ...Object.fromEntries(
                    edges.map((edge) => [`border${edge}Width`, theme.borderWidth.thick]),
                  ),
                },
              ]}
            />
          ))}
        </View>

        <Text variant="body.m" color="onScrim" align="center">
          {isReady ? t('spend.scan.caption') : t('spend.scan.startingCamera')}
        </Text>
      </VStack>
    </View>
  );
}

const styles = StyleSheet.create({
  corner: { height: CORNER_SHARE, position: 'absolute', width: CORNER_SHARE },
  frame: { aspectRatio: 1, maxWidth: 320, position: 'relative', width: FRAME_SHARE },
});
