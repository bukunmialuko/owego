const js = require('@eslint/js');
const tseslint = require('typescript-eslint');
const reactHooks = require('eslint-plugin-react-hooks');
const i18next = require('eslint-plugin-i18next');

const HERMES_INTL = {
  property: 'formatToParts',
  message: 'Hermes does not implement Intl.formatToParts. Split the output of format() instead.',
};

const DESIGN_SYSTEM_SYNTAX = [
  {
    selector: 'Literal[value=/^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/]',
    message:
      'Use a semantic colour token (theme.color.*) — a hex literal cannot re-theme in dark mode.',
  },
  {
    selector: 'Property[key.name=/^(fontSize|fontFamily|fontWeight|lineHeight|letterSpacing)$/]',
    message:
      'Use a typography variant (<Text variant="body.m">) — the ramp is the only source of type.',
  },
];

const SCREEN_HEADER_SYNTAX = [
  {
    selector:
      ':not(JSXElement:has(> JSXOpeningElement:has(> JSXAttribute[name.name="paddingX"][value.value="lg"]))) > JSXElement[openingElement.name.name="ScreenHeader"]',
    message:
      'Put ScreenHeader directly inside <VStack paddingX="lg"> — every back and close control sits in the 16pt page gutter.',
  },
  {
    selector:
      'JSXOpeningElement[name.name="IconButton"]:has(> JSXAttribute[name.name="icon"][value.value=/^(chevron-back|close)$/])',
    message:
      "Draw a screen's back or close control with ScreenHeader, which owns its size and its place.",
  },
];

module.exports = [
  {
    ignores: [
      'node_modules/*',
      'android/*',
      'ios/*',
      'vendor/*',
      'coverage/*',
      '*.config.js',
      '.dependency-cruiser.js',
    ],
  },

  js.configs.recommended,

  ...tseslint.configs.recommendedTypeChecked,
  reactHooks.configs.flat['recommended-latest'],

  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: __dirname },
      globals: { __DEV__: 'readonly', console: 'readonly', process: 'readonly' },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      '@typescript-eslint/no-redeclare': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },

  {
    files: ['**/*.js'],
    ...tseslint.configs.disableTypeChecked,
    languageOptions: {
      parserOptions: { projectService: false, project: false },
      globals: { module: 'writable', require: 'readonly', __dirname: 'readonly' },
    },
  },

  {
    files: ['src/core/**/*.ts', 'src/features/*/domain/**/*.ts', 'src/features/*/data/**/*.ts'],
    ignores: [
      'src/core/errors/**',
      'src/core/fx/use-fx-quote.ts',
      'src/core/wallet/use-wallets-query.ts',
      'src/core/yield/use-yield-overview.ts',
    ],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector:
            'ThrowStatement:not(:has(> NewExpression[callee.name=/^(TypeError|RangeError)$/]))',
          message:
            'Return err(AppError) instead of throwing a domain failure across a layer boundary.',
        },
      ],
    },
  },

  {
    files: ['src/features/*/presentation/**/*.{ts,tsx}', 'src/shared/**/*.{ts,tsx}'],
    rules: { 'no-restricted-syntax': ['error', ...DESIGN_SYSTEM_SYNTAX] },
  },

  {
    files: ['src/features/*/presentation/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': ['error', ...DESIGN_SYSTEM_SYNTAX, ...SCREEN_HEADER_SYNTAX],
    },
  },

  {
    files: ['src/shared/ui/text.tsx', 'src/shared/ui/text-field.tsx'],
    rules: { 'no-restricted-syntax': 'off' },
  },

  {
    files: ['src/**/*.ts', 'src/**/*.tsx'],
    ignores: [
      'src/shared/ui/flag.ts',
      'src/shared/ui/avatar.tsx',
      'src/shared/ui/asset-mark.tsx',
      'src/core/format/address.ts',
      'src/features/auth/data/datasource/auth-remote-datasource.ts',
      'src/features/home/data/mapper/home-mapper.ts',
      'src/features/spend/data/mapper/recipient-mapper.ts',
    ],
    rules: {
      'no-restricted-properties': [
        'error',
        {
          property: 'toUpperCase',
          message:
            'Never uppercase a country code outside the flag component — the API expects the fixture casing.',
        },
        HERMES_INTL,
      ],
    },
  },

  {
    files: [
      'src/shared/ui/flag.ts',
      'src/shared/ui/avatar.tsx',
      'src/shared/ui/asset-mark.tsx',
      'src/core/format/address.ts',
      'src/features/auth/data/datasource/auth-remote-datasource.ts',
      'src/features/home/data/mapper/home-mapper.ts',
      'src/features/spend/data/mapper/recipient-mapper.ts',
    ],
    rules: { 'no-restricted-properties': ['error', HERMES_INTL] },
  },

  {
    files: [
      'src/features/spend/presentation/bank-transfer/**/*.{ts,tsx}',
      'src/features/spend/presentation/beneficiaries/**/*.{ts,tsx}',
      'src/features/spend/presentation/widget/**/*.{ts,tsx}',
      'src/features/spend/presentation/hook/**/*.{ts,tsx}',
    ],
    rules: {
      'no-restricted-syntax': [
        'error',
        ...DESIGN_SYSTEM_SYNTAX,
        ...SCREEN_HEADER_SYNTAX,
        {
          selector: 'Literal[value=/^(NGN|KES|XOF|VND|PHP|KHR|THB|BRL|ARS|COP|GBP)$/]',
          message:
            'Corridor rules live in domain/corridor/ as data, not as a currency check in a screen.',
        },
      ],
    },
  },

  {
    files: [
      'src/features/*/presentation/**/*.tsx',
      'src/shared/**/*.tsx',
      'src/navigation/**/*.tsx',
    ],
    plugins: { i18next },
    rules: {
      'i18next/no-literal-string': [
        'error',
        { mode: 'jsx-text-only', 'should-validate-template': true },
      ],
    },
  },

  {
    files: ['**/*.test.ts', '**/*.test.tsx', 'src/test/**'],
    languageOptions: {
      globals: {
        jest: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
      },
    },
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      'i18next/no-literal-string': 'off',
      'no-restricted-properties': 'off',
      'no-restricted-syntax': 'off',
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/unbound-method': 'off',
    },
  },
];
