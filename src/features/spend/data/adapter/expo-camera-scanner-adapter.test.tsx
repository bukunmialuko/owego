import { Camera } from 'expo-camera';
import { renderWithProviders } from '@/test/render-with-providers';
import type { ScannerHandle } from '../../domain/port/camera-scanner-port';
import {
  createExpoCameraScannerAdapter,
  ExpoCameraScannerView,
} from './expo-camera-scanner-adapter';

const getPermission = jest.mocked(Camera.getCameraPermissionsAsync);
const requestPermission = jest.mocked(Camera.requestCameraPermissionsAsync);
type CameraViewProps = {
  facing: string;
  enableTorch: boolean;
  barcodeScannerSettings: { barcodeTypes: string[] };
  onBarcodeScanned: (event: { type: string; data: string }) => void;
};

const { renderCameraView, takePictureAsync } = jest.requireMock<{
  renderCameraView: jest.Mock<void, [CameraViewProps]>;
  takePictureAsync: jest.Mock<Promise<{ uri: string; width: number; height: number }>, []>;
}>('expo-camera');

const capturePhoto = takePictureAsync;
const rendered = renderCameraView;

function lastProps(): CameraViewProps {
  const [props] = rendered.mock.calls.at(-1) ?? [];
  if (props === undefined) throw new TypeError('the preview was never rendered');

  return props;
}

const adapter = createExpoCameraScannerAdapter();

const answer = (over: Record<string, unknown>) =>
  ({ status: 'denied', granted: false, canAskAgain: true, expires: 'never', ...over }) as never;

function noop() {
  return undefined;
}

async function renderView(over: Partial<Parameters<typeof ExpoCameraScannerView>[0]> = {}) {
  const onCodeScanned = jest.fn();
  const handleRef: { current: ScannerHandle | null } = { current: null };

  await renderWithProviders(
    <ExpoCameraScannerView
      active
      torch={false}
      onCodeScanned={onCodeScanned}
      onReady={noop}
      onError={noop}
      handleRef={handleRef}
      {...over}
    />,
  );

  return { onCodeScanned, handleRef };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('the camera permission', () => {
  describe('reads what the operating system says', () => {
    it.each([
      ['granted', { status: 'granted', granted: true }, 'granted'],
      ['never asked', { status: 'undetermined', canAskAgain: true }, 'undetermined'],
      ['refused once, and can be asked again', { canAskAgain: true }, 'denied'],
      ['refused for good', { canAskAgain: false }, 'blocked'],
    ])('%s', async (_case, response, expected) => {
      getPermission.mockResolvedValue(answer(response));

      await expect(adapter.getPermission()).resolves.toBe(expected);
    });
  });

  it('asks through the operating system rather than reading a remembered answer', async () => {
    requestPermission.mockResolvedValue(answer({ status: 'granted', granted: true }));

    await expect(adapter.requestPermission()).resolves.toBe('granted');
    expect(requestPermission).toHaveBeenCalledTimes(1);
    expect(getPermission).not.toHaveBeenCalled();
  });

  it('treats a camera that will not answer as one that has not been allowed', async () => {
    getPermission.mockRejectedValue(new Error('no camera service'));

    await expect(adapter.getPermission()).resolves.toBe('denied');
  });
});

describe('the preview', () => {
  it('scans for QR codes and nothing else', async () => {
    await renderView();

    expect(lastProps()).toMatchObject({
      facing: 'back',
      barcodeScannerSettings: { barcodeTypes: ['qr'] },
    });
  });

  it('hands a scanned payload on as it was decoded', async () => {
    const { onCodeScanned } = await renderView();

    lastProps().onBarcodeScanned({ type: 'qr', data: '00020101021158' });

    expect(onCodeScanned).toHaveBeenCalledWith('00020101021158');
  });

  it('turns the torch on when it is asked to', async () => {
    await renderView({ torch: true });

    expect(lastProps().enableTorch).toBe(true);
  });

  it('releases the camera rather than pausing it when it goes inactive', async () => {
    await renderView({ active: false });

    expect(rendered).not.toHaveBeenCalled();
  });

  describe('capturing a still', () => {
    it('answers with the photograph it took', async () => {
      const { handleRef } = await renderView();

      await expect(handleRef.current?.capture()).resolves.toEqual({
        ok: true,
        value: {
          uri: 'file:///cache/capture.jpg',
          width: 1280,
          height: 720,
          mimeType: 'image/jpeg',
        },
      });
    });

    it('takes it without a shutter sound, which a payment screen has no business making', async () => {
      const { handleRef } = await renderView();
      await handleRef.current?.capture();

      expect(capturePhoto).toHaveBeenCalledWith(expect.objectContaining({ shutterSound: false }));
    });

    it('refuses rather than throwing when the camera cannot take one', async () => {
      capturePhoto.mockRejectedValue(new Error('camera busy'));
      const { handleRef } = await renderView();

      const result = await handleRef.current?.capture();

      expect(result?.ok).toBe(false);
    });

    it('keeps the photograph out of the failure it reports', async () => {
      capturePhoto.mockRejectedValue(new Error('write failed: /cache/capture.jpg'));
      const { handleRef } = await renderView();

      const result = await handleRef.current?.capture();

      expect(JSON.stringify(result)).not.toContain('capture.jpg');
    });

    it('refuses rather than pretending, when there is no preview to capture from', async () => {
      const { handleRef } = await renderView({ active: false });

      const result = await handleRef.current?.capture();

      expect(result?.ok).toBe(false);
      expect(capturePhoto).not.toHaveBeenCalled();
    });
  });
});
