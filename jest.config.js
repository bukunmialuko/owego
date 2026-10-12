const reactNativePreset = require('@react-native/jest-preset');

process.env.TZ = 'UTC';

process.env.ENVFILE = process.env.ENVFILE ?? '.env.test';

const transformedPackages = [
  '(jest-)?react-native',
  'react-native-[^/]+',
  '@react-native/[^/]+',
  '@react-native-community/[^/]+',
  '@react-native-vector-icons/[^/]+',
  '@react-native-google-signin/[^/]+',
  '@didit-protocol/[^/]+',
  '@invertase/[^/]+',
  '@circle-fin/[^/]+',
  '@react-native-firebase/[^/]+',
  'expo(-[^/]+)?',
  'lottie-react-native',
  '@react-navigation/[^/]+',
  '@shopify/flash-list',
  '@noble/[^/]+',
  '@solana/[^/]+',
  '@solana-program/[^/]+',
  'awilix',
  'dinero\\.js',
  'msw',
  '@mswjs/[^/]+',
  'rettime',
  '@bundled-es-modules/[^/]+',
  'until-async',
  '@open-draft/[^/]+',
  'strict-event-emitter',
  'outvariant',
  'is-node-process',
  'headers-polyfill',
];

module.exports = {
  preset: '@react-native/jest-preset',
  setupFiles: [
    ...reactNativePreset.setupFiles,
    '<rootDir>/node_modules/react-native-gesture-handler/jestSetup.js',
    '<rootDir>/node_modules/@shopify/flash-list/jestSetup.js',
  ],
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
  transform: {
    ...reactNativePreset.transform,
    '^.+\\.(ttf|otf|woff|woff2)$':
      require.resolve('@react-native/jest-preset/jest/assetFileTransformer.js'),
    '\\.mjs$': ['babel-jest', { presets: ['module:@react-native/babel-preset'] }],
  },
  transformIgnorePatterns: [`node_modules/(?!(?:${transformedPackages.join('|')})/)`],
  moduleNameMapper: {
    '\\.svg$': '<rootDir>/src/test/svg-mock.tsx',
    '^@/assets/(.*)$': '<rootDir>/assets/$1',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.test.{ts,tsx}',
    '!src/test/**',
    '!src/navigation/**',
    '!src/**/*.d.ts',
    '!src/core/config/read-runtime-config.ts',
  ],
  coverageThreshold: {
    global: { statements: 80, branches: 80, functions: 80, lines: 80 },
    './src/core/': { statements: 90, branches: 90, functions: 90, lines: 90 },
  },
};
