import ReactNativeBiometrics, { type BiometryType } from 'react-native-biometrics';
import { unknownError, type AppError } from '@/core/errors/app-error';
import { ok, type Result } from '@/core/result/result';
import type {
  BiometricAvailability,
  BiometricKind,
  BiometricOutcome,
  BiometricPort,
} from '../../domain/port/auth-port';

export function createBiometricAdapter(promptMessage: string): BiometricPort {
  const biometrics = new ReactNativeBiometrics({ allowDeviceCredentials: false });

  async function availability(): Promise<BiometricAvailability> {
    try {
      const sensor = await biometrics.isSensorAvailable();
      if (sensor.available) return { type: 'available', kind: kindOf(sensor.biometryType) };

      return (sensor.error ?? '').toLowerCase().includes('enroll')
        ? { type: 'not-enrolled' }
        : { type: 'unavailable' };
    } catch {
      return { type: 'unavailable' };
    }
  }

  return {
    availability,

    async authenticate(): Promise<Result<BiometricOutcome, AppError>> {
      try {
        const sensor = await biometrics.isSensorAvailable();
        if (!sensor.available) {
          return ok(
            (sensor.error ?? '').toLowerCase().includes('enroll') ? 'not-enrolled' : 'unavailable',
          );
        }

        const { success } = await biometrics.simplePrompt({ promptMessage });

        return ok(success ? 'succeeded' : 'cancelled');
      } catch (cause) {
        return err(cause);
      }
    },
  };
}

function kindOf(biometryType: BiometryType | undefined): BiometricKind {
  switch (biometryType) {
    case 'FaceID':
      return 'face-id';
    case 'TouchID':
      return 'touch-id';
    case 'Biometrics':
    case undefined:
      return 'biometrics';
  }
}

function err(cause: unknown): Result<BiometricOutcome, AppError> {
  const message = (cause instanceof Error ? cause.message : String(cause)).toLowerCase();

  if (message.includes('invalidat')) {
    return ok('invalidated');
  }

  return { ok: false, error: unknownError('Biometric prompt failed.', cause) };
}
