import type * as NodeCrypto from 'node:crypto';
import type * as ReactModule from 'react';
import { setLogSink } from '@/core/log/dev-log';

jest.mock('expo-camera', () => {
  const { createElement, forwardRef, useImperativeHandle } =
    jest.requireActual<typeof ReactModule>('react');

  const takePictureAsync = jest.fn(() =>
    Promise.resolve({ uri: 'file:///cache/capture.jpg', width: 1280, height: 720 }),
  );

  const renderCameraView = jest.fn();

  const CameraView = forwardRef(
    (props: Record<string, unknown>, ref: React.Ref<{ takePictureAsync: unknown }>) => {
      renderCameraView(props);
      useImperativeHandle(ref, () => ({ takePictureAsync }));

      return createElement('CameraView', props);
    },
  );
  CameraView.displayName = 'CameraView';

  const granted = { status: 'granted', granted: true, canAskAgain: true, expires: 'never' };

  return {
    CameraView,
    takePictureAsync,
    renderCameraView,
    Camera: {
      getCameraPermissionsAsync: jest.fn(() => Promise.resolve(granted)),
      requestCameraPermissionsAsync: jest.fn(() => Promise.resolve(granted)),
    },
    PermissionStatus: { GRANTED: 'granted', UNDETERMINED: 'undetermined', DENIED: 'denied' },
  };
});

setLogSink(() => undefined);

jest.mock('react-native-mmkv', () => ({
  createMMKV: ({ id }: { id: string }) => {
    const store = new Map<string, string | number | boolean>();
    return {
      id,
      set: (key: string, value: string | number | boolean) => store.set(key, value),
      getString: (key: string) => store.get(key) as string | undefined,
      getBoolean: (key: string) => store.get(key) as boolean | undefined,
      getNumber: (key: string) => store.get(key) as number | undefined,
      contains: (key: string) => store.has(key),
      remove: (key: string) => store.delete(key),
      clearAll: () => store.clear(),
      getAllKeys: () => [...store.keys()],
    };
  },
}));

jest.mock('react-native-keychain', () => {
  const store = new Map<string, string>();
  return {
    setGenericPassword: jest.fn(
      (username: string, password: string, { service }: { service: string }) => {
        store.set(service, password);
        return Promise.resolve({ service, storage: 'keychain' });
      },
    ),
    getGenericPassword: jest.fn(({ service }: { service: string }) => {
      const password = store.get(service);
      return Promise.resolve(
        password === undefined ? false : { username: service, password, service },
      );
    }),
    resetGenericPassword: jest.fn(({ service }: { service: string }) => {
      store.delete(service);
      return Promise.resolve(true);
    }),
    ACCESS_CONTROL: {
      BIOMETRY_CURRENT_SET: 'BiometryCurrentSet',
      BIOMETRY_ANY: 'BiometryAny',
      DEVICE_PASSCODE: 'DevicePasscode',
    },
    ACCESSIBLE: {
      WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'AccessibleWhenUnlockedThisDeviceOnly',
      WHEN_UNLOCKED: 'AccessibleWhenUnlocked',
      AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 'AccessibleAfterFirstUnlockThisDeviceOnly',
    },
  };
});

jest.mock('@react-native-clipboard/clipboard', () => {
  let contents = '';
  return {
    __esModule: true,
    default: {
      setString: jest.fn((value: string) => {
        contents = value;
      }),
      getString: jest.fn(() => Promise.resolve(contents)),
    },
  };
});

jest.mock('react-native-localize', () => ({
  getLocales: () => [{ languageCode: 'en', countryCode: 'US', languageTag: 'en-US', isRTL: false }],
}));

jest.mock('react-native-biometrics', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    isSensorAvailable: jest.fn(() => Promise.resolve({ available: false })),
    simplePrompt: jest.fn(() => Promise.resolve({ success: false })),
  })),
}));

jest.mock('expo-crypto', () => ({
  getRandomValues: jest.fn(<T extends Uint8Array>(array: T): T => {
    jest.requireActual<typeof NodeCrypto>('node:crypto').randomFillSync(array);

    return array;
  }),
}));

jest.mock('react-native-quick-crypto', () => ({
  scrypt: jest.fn(
    (
      password: Uint8Array,
      salt: Uint8Array,
      keylen: number,
      options: { N: number; r: number; p: number; maxmem: number },
      callback: (error: Error | null, key?: Uint8Array) => void,
    ) => {
      jest
        .requireActual<typeof NodeCrypto>('node:crypto')
        .scrypt(password, salt, keylen, options, (error, key) => {
          callback(error, key);
        });
    },
  ),
}));

jest.mock('react-native-device-info', () => ({
  __esModule: true,
  default: {
    getVersion: jest.fn(() => '1.2.0'),
    getBuildNumber: jest.fn(() => '155'),
  },
}));

jest.mock('react-native-edge-to-edge', () => ({ SystemBars: () => null }));

jest.mock('react-native-bootsplash', () => {
  const hide = jest.fn(() => Promise.resolve());
  const isVisible = jest.fn(() => false);

  return {
    __esModule: true,
    hide,
    isVisible,
    useHideAnimation: jest.fn(),
    default: { hide, isVisible, useHideAnimation: jest.fn() },
  };
});

jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn(() => Promise.resolve(true)),
    signIn: jest.fn(() => Promise.resolve({ type: 'success', data: { idToken: 'test-id-token' } })),
    signOut: jest.fn(() => Promise.resolve()),
  },
  isErrorWithCode: jest.fn(() => false),
  statusCodes: { SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED', IN_PROGRESS: 'IN_PROGRESS' },
}));

jest.mock('@invertase/react-native-apple-authentication', () => ({
  __esModule: true,
  default: {
    performRequest: jest.fn(() =>
      Promise.resolve({ identityToken: 'test-identity-token', fullName: null }),
    ),
    Operation: { IMPLICIT: 0, LOGIN: 1, REFRESH: 2, LOGOUT: 3 },
    Scope: { EMAIL: 0, FULL_NAME: 1 },
    UserStatus: { UNSUPPORTED: 0, UNKNOWN: 1, LIKELY_REAL: 2 },
  },
}));

jest.mock('lottie-react-native', () => 'LottieAnimationView');

jest.mock('react-native-inappbrowser-reborn', () => ({
  __esModule: true,
  default: {
    isAvailable: jest.fn(() => Promise.resolve(true)),
    open: jest.fn(() => Promise.resolve({ type: 'dismiss' })),
    close: jest.fn(),
  },
}));

jest.mock('@didit-protocol/sdk-react-native', () => ({
  startVerification: jest.fn(() => Promise.resolve({ type: 'cancelled' })),
  startVerificationWithWorkflow: jest.fn(() => Promise.resolve({ type: 'cancelled' })),
  VerificationStatus: { Approved: 'Approved', Pending: 'Pending', Declined: 'Declined' },
  CameraLens: { Front: 'front', Back: 'back' },
}));

jest.mock('@circle-fin/w3s-pw-react-native-sdk', () => ({
  __esModule: true,
  default: { addListener: jest.fn(() => ({ remove: jest.fn() })) },
  CIRCLE_PW_ON_EVENT: 'CirclePwOnEvent',
  ExecuteEvent: { forgotPin: 'forgotPin', resendOtp: 'resendOtp' },
  WalletSdk: {
    init: jest.fn(() => Promise.resolve()),
    execute: jest.fn(),
    setSecurityQuestions: jest.fn(),
    setImageMap: jest.fn(),
    setTextConfigMap: jest.fn(),
    setTextConfigsMap: jest.fn(),
    setIconTextConfigsMap: jest.fn(),
    setErrorStringMap: jest.fn(),
    setDateFormat: jest.fn(),
    moveRnTaskToFront: jest.fn(),
    setDismissOnCallbackMap: jest.fn(),
    addListener: jest.fn(() => ({ remove: jest.fn() })),
  },
  ErrorCode: {
    unknown: '-1',
    userTokenExpired: '155104',
    userWasInitialized: '155106',
    userCanceled: '155701',
    networkError: '155706',
  },
  ExecuteResultStatus: {
    UNKNOWN: 'UNKNOWN',
    PENDING: 'PENDING',
    IN_PROGRESS: 'IN_PROGRESS',
    COMPLETE: 'COMPLETE',
    FAILED: 'FAILED',
    EXPIRED: 'EXPIRED',
  },
  ExecuteResultType: {
    UNKNOWN: 'UNKNOWN',
    SET_PIN: 'SET_PIN',
    RESTORE_PIN: 'RESTORE_PIN',
    SET_SECURITY_QUESTIONS: 'SET_SECURITY_QUESTIONS',
    CREATE_WALLET: 'CREATE_WALLET',
    CREATE_TRANSACTION: 'CREATE_TRANSACTION',
    ACCELERATE_TRANSACTION: 'ACCELERATE_TRANSACTION',
    CANCEL_TRANSACTION: 'CANCEL_TRANSACTION',
    CONTRACT_EXECUTION: 'CONTRACT_EXECUTION',
    SIGN_MESSAGE: 'SIGN_MESSAGE',
    SIGN_TYPEDDATA: 'SIGN_TYPEDDATA',
    INITIALIZE: 'INITIALIZE',
    SET_BIOMETRICS_PIN: 'SET_BIOMETRICS_PIN',
    WALLET_UPGRADE: 'WALLET_UPGRADE',
  },
  InputType: { text: 'text', datePicker: 'datePicker' },
  ImageKey: {
    naviBack: 'back',
    naviClose: 'close',
    securityIntroMain: 'securityIntroMain',
    securityConfirmMain: 'securityConfirmMain',
    showPin: 'showPin',
    hidePin: 'hidePin',
    dropdownArrow: 'dropdownArrow',
  },
  IconTextsKey: { securityConfirmationItems: 'securityConfirmationItems' },
  SecurityQuestion: class {
    constructor(title: string, inputType?: string) {
      Object.assign(this, { title, inputType });
    }
  },
  TextConfig: class {
    constructor(text?: string) {
      Object.assign(this, { text });
    }
  },
  IconTextConfig: class {
    constructor(image: unknown, textConfig: unknown) {
      Object.assign(this, { image, textConfig });
    }
  },
}));

jest.mock('@solana-mobile/mobile-wallet-adapter-protocol', () => {
  class SolanaMobileWalletAdapterError extends Error {
    code: string;
    data: unknown;
    constructor(code: string, message: string, data?: unknown) {
      super(message);
      this.code = code;
      this.data = data;
      this.name = 'SolanaMobileWalletAdapterError';
    }
  }

  class SolanaMobileWalletAdapterProtocolError extends Error {
    code: number;
    data: unknown;
    jsonRpcMessageId: number;
    constructor(jsonRpcMessageId: number, code: number, message: string, data?: unknown) {
      super(message);
      this.code = code;
      this.data = data;
      this.jsonRpcMessageId = jsonRpcMessageId;
      this.name = 'SolanaMobileWalletAdapterProtocolError';
    }
  }

  return {
    transact: jest.fn(() =>
      Promise.reject(
        new SolanaMobileWalletAdapterError(
          'ERROR_WALLET_NOT_FOUND',
          'Found no installed wallet that supports the mobile wallet protocol.',
        ),
      ),
    ),
    SolanaMobileWalletAdapterError,
    SolanaMobileWalletAdapterProtocolError,
    SolanaMobileWalletAdapterErrorCode: {
      ERROR_ASSOCIATION_PORT_OUT_OF_RANGE: 'ERROR_ASSOCIATION_PORT_OUT_OF_RANGE',
      ERROR_REFLECTOR_ID_OUT_OF_RANGE: 'ERROR_REFLECTOR_ID_OUT_OF_RANGE',
      ERROR_FORBIDDEN_WALLET_BASE_URL: 'ERROR_FORBIDDEN_WALLET_BASE_URL',
      ERROR_SECURE_CONTEXT_REQUIRED: 'ERROR_SECURE_CONTEXT_REQUIRED',
      ERROR_SESSION_CLOSED: 'ERROR_SESSION_CLOSED',
      ERROR_SESSION_TIMEOUT: 'ERROR_SESSION_TIMEOUT',
      ERROR_WALLET_NOT_FOUND: 'ERROR_WALLET_NOT_FOUND',
      ERROR_INVALID_PROTOCOL_VERSION: 'ERROR_INVALID_PROTOCOL_VERSION',
      ERROR_BROWSER_NOT_SUPPORTED: 'ERROR_BROWSER_NOT_SUPPORTED',
      ERROR_LOOPBACK_ACCESS_BLOCKED: 'ERROR_LOOPBACK_ACCESS_BLOCKED',
      ERROR_ASSOCIATION_CANCELLED: 'ERROR_ASSOCIATION_CANCELLED',
      ERROR_ILLEGAL_TRANSPORT_STATE: 'ERROR_ILLEGAL_TRANSPORT_STATE',
    },
    SolanaMobileWalletAdapterProtocolErrorCode: {
      ERROR_AUTHORIZATION_FAILED: -1,
      ERROR_INVALID_PAYLOADS: -2,
      ERROR_NOT_SIGNED: -3,
      ERROR_NOT_SUBMITTED: -4,
      ERROR_TOO_MANY_PAYLOADS: -5,
      ERROR_ATTEST_ORIGIN_ANDROID: -100,
    },
  };
});

jest.mock('@react-native-firebase/messaging', () => ({
  AuthorizationStatus: {
    NOT_DETERMINED: -1,
    DENIED: 0,
    AUTHORIZED: 1,
    PROVISIONAL: 2,
    EPHEMERAL: 3,
  },
  getMessaging: jest.fn(() => ({ app: { name: '[DEFAULT]' } })),
  getToken: jest.fn(() => Promise.resolve('test-fcm-token')),
  hasPermission: jest.fn(() => Promise.resolve(0)),
  requestPermission: jest.fn(() => Promise.resolve(0)),
  onMessage: jest.fn(() => () => undefined),
  onTokenRefresh: jest.fn(() => () => undefined),
  onNotificationOpenedApp: jest.fn(() => () => undefined),
  getInitialNotification: jest.fn(() => Promise.resolve(null)),
  setBackgroundMessageHandler: jest.fn(),
}));
