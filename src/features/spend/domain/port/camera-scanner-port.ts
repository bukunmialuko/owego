import type { AppError } from '@/core/errors/app-error';
import type { Result } from '@/core/result/result';

export type CameraPermission = 'granted' | 'undetermined' | 'denied' | 'blocked';

export type CapturedStill = {
  uri: string;
  width: number;
  height: number;
  mimeType: string;
};

export type ScannerHandle = {
  capture(): Promise<Result<CapturedStill, AppError>>;
};

export type ScannerViewProps = {
  active: boolean;
  torch: boolean;
  onCodeScanned: (raw: string) => void;
  onReady: () => void;
  onError: () => void;
  handleRef?: { current: ScannerHandle | null };
};

export interface CameraScannerPort {
  getPermission(): Promise<CameraPermission>;
  requestPermission(): Promise<CameraPermission>;
}
