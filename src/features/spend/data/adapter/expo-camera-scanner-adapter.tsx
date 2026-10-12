import { useImperativeHandle, useRef } from 'react';
import { StyleSheet } from 'react-native';
import { Camera, CameraView } from 'expo-camera';
import { unknownError, type AppError } from '@/core/errors/app-error';
import { devLog } from '@/core/log/dev-log';
import { err, ok, type Result } from '@/core/result/result';
import type {
  CameraPermission,
  CameraScannerPort,
  CapturedStill,
  ScannerViewProps,
} from '../../domain/port/camera-scanner-port';

const STILL_MIME_TYPE = 'image/jpeg';

const STILL_QUALITY = 0.5;

export function createExpoCameraScannerAdapter(): CameraScannerPort {
  return {
    getPermission: () => read(() => Camera.getCameraPermissionsAsync(), 'read'),
    requestPermission: () => read(() => Camera.requestCameraPermissionsAsync(), 'request'),
  };
}

export function ExpoCameraScannerView({
  active,
  torch,
  onCodeScanned,
  onReady,
  onError,
  handleRef,
}: ScannerViewProps) {
  const cameraRef = useRef<CameraView | null>(null);

  useImperativeHandle(handleRef, () => ({
    capture: async (): Promise<Result<CapturedStill, AppError>> => {
      try {
        const photo = await cameraRef.current?.takePictureAsync({
          quality: STILL_QUALITY,
          shutterSound: false,
        });

        if (photo === undefined) return err(unknownError('The camera is not ready.'));

        devLog('scan', 'captured', { width: photo.width, height: photo.height });

        return ok({
          uri: photo.uri,
          width: photo.width,
          height: photo.height,
          mimeType: STILL_MIME_TYPE,
        });
      } catch {
        return err(unknownError('The camera could not take a photograph.'));
      }
    },
  }));

  if (!active) return null;

  return (
    <CameraView
      ref={cameraRef}
      style={StyleSheet.absoluteFill}
      facing="back"
      enableTorch={torch}
      barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
      onBarcodeScanned={({ data }) => {
        onCodeScanned(data);
      }}
      onCameraReady={onReady}
      onMountError={onError}
    />
  );
}

async function read(
  ask: () => Promise<{ granted: boolean; status: string; canAskAgain: boolean }>,
  event: string,
): Promise<CameraPermission> {
  try {
    const { granted, status, canAskAgain } = await ask();

    if (granted) return 'granted';
    if (status === 'undetermined') return 'undetermined';

    return canAskAgain ? 'denied' : 'blocked';
  } catch {
    devLog('scan', `permission ${event} failed`);

    return 'denied';
  }
}
