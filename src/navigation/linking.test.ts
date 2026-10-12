import { Linking } from 'react-native';
import { createDeferredLinking, type ExternalLinkSource } from './linking';

jest.mock('react-native', () => ({
  Linking: { getInitialURL: jest.fn(), addEventListener: jest.fn() },
}));

const mocked = Linking as unknown as {
  getInitialURL: jest.Mock;
  addEventListener: jest.Mock;
};

function subscribe(deferred: ReturnType<typeof createDeferredLinking>) {
  const delivered: string[] = [];
  let emit: (event: { url: string }) => void = () => undefined;

  mocked.addEventListener.mockImplementation((_event: string, handler: typeof emit) => {
    emit = handler;
    return { remove: jest.fn() };
  });

  const unsubscribe = deferred.options.subscribe?.((url) => delivered.push(url));

  return { delivered, emit, unsubscribe };
}

describe('createDeferredLinking', () => {
  beforeEach(() => {
    mocked.getInitialURL.mockReset();
    mocked.addEventListener.mockReset();
  });

  describe('while the app tree is not mounted', () => {
    it('holds a link that arrives', () => {
      const deferred = createDeferredLinking();
      const { delivered, emit } = subscribe(deferred);

      emit({ url: 'owego://pay' });

      expect(delivered).toEqual([]);
    });

    it('delivers it once the app becomes ready', () => {
      const deferred = createDeferredLinking();
      const { delivered, emit } = subscribe(deferred);

      emit({ url: 'owego://pay' });
      deferred.setReady(true);

      expect(delivered).toEqual(['owego://pay']);
    });

    it('holds nothing back once ready', () => {
      const deferred = createDeferredLinking();
      const { delivered, emit } = subscribe(deferred);
      deferred.setReady(true);

      emit({ url: 'owego://receive' });

      expect(delivered).toEqual(['owego://receive']);
    });

    it('keeps only the latest queued link', () => {
      const deferred = createDeferredLinking();
      const { delivered, emit } = subscribe(deferred);

      emit({ url: 'owego://pay' });
      emit({ url: 'owego://receive' });
      deferred.setReady(true);

      expect(delivered).toEqual(['owego://receive']);
    });

    it('delivers a queued link only once', () => {
      const deferred = createDeferredLinking();
      const { delivered, emit } = subscribe(deferred);

      emit({ url: 'owego://pay' });
      deferred.setReady(true);
      deferred.setReady(false);
      deferred.setReady(true);

      expect(delivered).toEqual(['owego://pay']);
    });
  });

  describe('an external link source', () => {
    function fakeSource(initial?: string) {
      let emit: (url: string) => void = () => undefined;
      const stop = jest.fn();
      const source: ExternalLinkSource = {
        getInitialURL: () => Promise.resolve(initial),
        subscribe: (listener) => {
          emit = listener;
          return stop;
        },
      };
      return { source, emit: (url: string) => emit(url), stop };
    }

    it('delivers its links once the app is ready', () => {
      const { source, emit } = fakeSource();
      const deferred = createDeferredLinking(source);
      const { delivered } = subscribe(deferred);
      deferred.setReady(true);

      emit('owego://wealth');

      expect(delivered).toEqual(['owego://wealth']);
    });

    it('holds its links while the app tree is not mounted', () => {
      const { source, emit } = fakeSource();
      const deferred = createDeferredLinking(source);
      const { delivered } = subscribe(deferred);

      emit('owego://wealth');
      expect(delivered).toEqual([]);

      deferred.setReady(true);
      expect(delivered).toEqual(['owego://wealth']);
    });

    it('supplies the initial url when the OS has none', async () => {
      mocked.getInitialURL.mockResolvedValue(null);
      const deferred = createDeferredLinking(fakeSource('owego://wealth').source);
      deferred.setReady(true);

      await expect(deferred.options.getInitialURL?.()).resolves.toBe('owego://wealth');
    });

    it('defers to the OS url when both exist', async () => {
      mocked.getInitialURL.mockResolvedValue('owego://pay');
      const deferred = createDeferredLinking(fakeSource('owego://wealth').source);
      deferred.setReady(true);

      await expect(deferred.options.getInitialURL?.()).resolves.toBe('owego://pay');
    });

    it('stops listening to it when React Navigation unsubscribes', () => {
      const { source, stop } = fakeSource();
      const deferred = createDeferredLinking(source);
      const { unsubscribe } = subscribe(deferred);

      unsubscribe?.();

      expect(stop).toHaveBeenCalledTimes(1);
    });
  });

  describe('a cold start from a link', () => {
    it('withholds the initial url until the app is ready', async () => {
      mocked.getInitialURL.mockResolvedValue('owego://pay');
      const deferred = createDeferredLinking();

      await expect(deferred.options.getInitialURL?.()).resolves.toBeNull();
    });

    it('passes it straight through when already ready', async () => {
      mocked.getInitialURL.mockResolvedValue('owego://pay');
      const deferred = createDeferredLinking();
      deferred.setReady(true);

      await expect(deferred.options.getInitialURL?.()).resolves.toBe('owego://pay');
    });

    it('handles a launch with no link', async () => {
      mocked.getInitialURL.mockResolvedValue(null);
      const deferred = createDeferredLinking();

      await expect(deferred.options.getInitialURL?.()).resolves.toBeNull();
    });
  });
});

describe('what a link cannot reach', () => {
  const screens = createDeferredLinking().options.config?.screens ?? {};

  it.each(['ScanToPay', 'BankTransfer', 'SendAsset', 'Beneficiaries'])(
    'cannot open %s',
    (route) => {
      expect(screens).not.toHaveProperty(route);
    },
  );

  it('still opens the payment sheet, which asks rather than acts', () => {
    expect(screens).toHaveProperty('Payment');
  });
});
