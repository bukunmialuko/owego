import ReactNativeBiometrics, { type BiometryType } from 'react-native-biometrics';
import { ErrorCategory, ErrorCode, type AppError } from '@/core/errors/app-error';
import type { BiometricKind, BiometricOutcome } from '../../domain/port/auth-port';
import { createBiometricAdapter } from './biometric-adapter';

const PROMPT = 'Unlock owego';

type SensorResult = { available: boolean; biometryType?: BiometryType; error?: string };

const isSensorAvailable = jest.fn(async (): Promise<SensorResult> => ({ available: true }));
const simplePrompt = jest.fn(async (): Promise<{ success: boolean }> => ({ success: true }));

beforeEach(() => {
  isSensorAvailable.mockReset();
  isSensorAvailable.mockResolvedValue({ available: true, biometryType: 'FaceID' });
  simplePrompt.mockReset();
  simplePrompt.mockResolvedValue({ success: true });

  const constructBiometrics = jest.mocked(ReactNativeBiometrics);
  constructBiometrics.mockReset();
  constructBiometrics.mockImplementation(
    () => ({ isSensorAvailable, simplePrompt }) as unknown as ReactNativeBiometrics,
  );
});

async function outcomeOf(): Promise<BiometricOutcome> {
  const result = await createBiometricAdapter(PROMPT).authenticate();

  if (!result.ok) throw new Error(`expected an outcome, got err ${result.error.code}`);

  return result.value;
}

async function failureOf(): Promise<AppError> {
  const result = await createBiometricAdapter(PROMPT).authenticate();

  if (result.ok) throw new Error(`expected a failure, got ${result.value}`);

  return result.error;
}

describe('createBiometricAdapter — availability', () => {
  it.each<[BiometryType, BiometricKind]>([
    ['FaceID', 'face-id'],
    ['TouchID', 'touch-id'],
    ['Biometrics', 'biometrics'],
  ])('reports a device with %s enrolled as available, naming it', async (biometryType, kind) => {
    isSensorAvailable.mockResolvedValue({ available: true, biometryType });

    await expect(createBiometricAdapter(PROMPT).availability()).resolves.toEqual({
      type: 'available',
      kind,
    });
  });

  it('names an available sensor of no stated type plainly', async () => {
    isSensorAvailable.mockResolvedValue({ available: true });

    await expect(createBiometricAdapter(PROMPT).availability()).resolves.toEqual({
      type: 'available',
      kind: 'biometrics',
    });
  });

  it('reports a device with no usable sensor as unavailable', async () => {
    isSensorAvailable.mockResolvedValue({ available: false, error: 'No hardware available' });

    await expect(createBiometricAdapter(PROMPT).availability()).resolves.toEqual({
      type: 'unavailable',
    });
  });

  it('reports a sensor with nothing enrolled as not enrolled', async () => {
    isSensorAvailable.mockResolvedValue({
      available: false,
      error: 'BIOMETRIC_ERROR_NONE_ENROLLED',
    });

    await expect(createBiometricAdapter(PROMPT).availability()).resolves.toEqual({
      type: 'not-enrolled',
    });
  });

  it('reports unavailable when the native module throws', async () => {
    isSensorAvailable.mockRejectedValue(new Error('native module not linked'));

    await expect(createBiometricAdapter(PROMPT).availability()).resolves.toEqual({
      type: 'unavailable',
    });
  });

  it('never shows a prompt', async () => {
    await createBiometricAdapter(PROMPT).availability();

    expect(simplePrompt).not.toHaveBeenCalled();
  });

  it('constructs the sdk with the device-credential fallback disabled', async () => {
    await createBiometricAdapter(PROMPT).availability();

    expect(jest.mocked(ReactNativeBiometrics)).toHaveBeenCalledWith({
      allowDeviceCredentials: false,
    });
  });
});

describe('createBiometricAdapter — authenticate', () => {
  it('succeeds when the user passes the prompt', async () => {
    simplePrompt.mockResolvedValue({ success: true });

    await expect(outcomeOf()).resolves.toBe('succeeded');
  });

  it('shows the prompt copy it was constructed with', async () => {
    await outcomeOf();

    expect(simplePrompt).toHaveBeenCalledWith({ promptMessage: PROMPT });
  });

  it('reports a dismissed prompt as cancelled', async () => {
    simplePrompt.mockResolvedValue({ success: false });

    await expect(outcomeOf()).resolves.toBe('cancelled');
  });

  it.each(['BIOMETRIC_ERROR_NONE_ENROLLED', 'Biometry is not enrolled.'])(
    'reports an empty enrolment as not-enrolled when the sensor error reads %s',
    async (error) => {
      isSensorAvailable.mockResolvedValue({ available: false, error });

      await expect(outcomeOf()).resolves.toBe('not-enrolled');
    },
  );

  it('reports missing hardware as unavailable', async () => {
    isSensorAvailable.mockResolvedValue({
      available: false,
      error: 'BIOMETRIC_ERROR_NO_HARDWARE',
    });

    await expect(outcomeOf()).resolves.toBe('unavailable');
  });

  it('reports an unexplained unavailable sensor as unavailable', async () => {
    isSensorAvailable.mockResolvedValue({ available: false });

    await expect(outcomeOf()).resolves.toBe('unavailable');
  });

  it('never raises the sheet when the sensor cannot serve it', async () => {
    isSensorAvailable.mockResolvedValue({ available: false });

    await outcomeOf();

    expect(simplePrompt).not.toHaveBeenCalled();
  });

  it.each([
    ['an Error', new Error('Key permanently invalidated')],
    ['a bridge string', 'android.security.keystore.KeyPermanentlyInvalidatedException'],
    ['a bridge string in the platform casing', 'KeyPermanentlyInvalidated'],
  ])('reports %s as invalidated', async (_label, thrown) => {
    simplePrompt.mockRejectedValue(thrown);

    await expect(outcomeOf()).resolves.toBe('invalidated');
  });

  it('reports a sensor lockout as a failure rather than an outcome', async () => {
    const cause = new Error('Too many attempts. Try again later.');
    simplePrompt.mockRejectedValue(cause);

    const error = await failureOf();

    expect(error).toMatchObject({
      code: ErrorCode.Unknown,
      category: ErrorCategory.Unknown,
      retryable: false,
      cause,
    });
  });

  it('keeps the backend-facing detail off the message the sensor produced', async () => {
    simplePrompt.mockRejectedValue(new Error('Too many attempts. Try again later.'));

    await expect(failureOf()).resolves.toMatchObject({ detail: 'Biometric prompt failed.' });
  });

  it('reports a rejection that is not an error as a failure', async () => {
    simplePrompt.mockRejectedValue('sensor busy');

    await expect(failureOf()).resolves.toMatchObject({
      code: ErrorCode.Unknown,
      cause: 'sensor busy',
    });
  });

  it('reports a throwing availability check as a failure', async () => {
    simplePrompt.mockResolvedValue({ success: true });
    isSensorAvailable.mockRejectedValue(new Error('native module not linked'));

    const error = await failureOf();

    expect(error.code).toBe(ErrorCode.Unknown);
    expect(simplePrompt).not.toHaveBeenCalled();
  });
});
