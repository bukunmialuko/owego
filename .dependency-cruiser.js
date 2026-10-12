module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      comment: 'Metro fails obscurely on require cycles.',
      from: {},
      to: { circular: true },
    },
    {
      name: 'feature-isolation',
      severity: 'error',
      comment:
        'A feature may only reach core, shared, or its own subtree. Cross-feature needs go through core.',
      from: { path: '^src/features/([^/]+)/' },
      to: {
        path: '^src/features/([^/]+)/',
        pathNot: '^src/features/$1/',
      },
    },
    {
      name: 'core-never-imports-features',
      severity: 'error',
      comment: 'Dependencies point inward.',
      from: { path: '^src/core/' },
      to: { path: '^src/features/' },
    },
    {
      name: 'shared-has-no-business-dependencies',
      severity: 'error',
      comment:
        'shared/ is presentation only. It may use the design system and i18n, because themed ' +
        'and localized is what makes a shared component shareable — but never a feature, ' +
        'the network, or storage.',
      from: { path: '^src/shared/' },
      to: {
        path: '^src/(features|core)/',
        pathNot: '^src/core/(design-system|i18n)/',
      },
    },
    {
      name: 'domain-is-pure',
      severity: 'error',
      comment: 'The domain outlives the network client and the UI framework.',
      from: { path: '^src/features/[^/]+/domain/' },
      to: { path: '^src/features/[^/]+/(data|presentation)/' },
    },
    {
      name: 'data-never-imports-presentation',
      severity: 'error',
      from: { path: '^src/features/[^/]+/data/' },
      to: { path: '^src/features/[^/]+/presentation/' },
    },
    {
      name: 'semantic-tokens-only',
      severity: 'error',
      comment:
        'Primitives carry values, not meaning. Reach for a semantic token like fillBrand instead.',
      from: { pathNot: '^src/core/design-system/tokens/' },
      to: { path: '^src/core/design-system/tokens/primitives/' },
    },
    {
      name: 'navigation-stays-thin',
      severity: 'error',
      comment: 'Navigators wire screens together. Business logic lives in a feature.',
      from: { path: '^src/navigation/' },
      to: { path: '^src/features/[^/]+/(data|domain)/' },
    },
    {
      name: 'native-sdks-stay-behind-adapters',
      severity: 'error',
      comment:
        'A vendor SDK is imported by exactly one adapter and nowhere else. That seam is what ' +
        'lets every layer above it be tested without the native module, and what keeps a ' +
        'swap to a different vendor a one-file change. core/storage is exempt because the ' +
        'keychain and MMKV wrappers *are* those adapters — they live in core because every ' +
        'feature needs them and core may not import a feature. core/crypto/secure-random.ts and ' +
        'core/crypto/pin-kdf.ts are exempt for the same reason: they are the CSPRNG and native ' +
        'scrypt adapters. Add each new native package ' +
        'here as it is installed: a list nobody extends passes because it checks nothing.',
      from: {
        pathNot:
          '^src/(features/[^/]+/data/adapter|core/storage)/|^src/core/crypto/(secure-random|pin-kdf)\\.ts$|/__[^/]*$',
      },
      to: {
        path:
          '^node_modules/(@didit-protocol/sdk-react-native|@react-native-google-signin|' +
          '@invertase/react-native-apple-authentication|react-native-biometrics|' +
          'react-native-keychain|react-native-mmkv|@react-native-firebase|expo-camera|' +
          'expo-crypto|react-native-quick-crypto|@solana-mobile)/',
      },
    },
    {
      name: 'circle-sdk-stays-in-its-one-adapter',
      severity: 'error',
      comment:
        "Circle's wallet SDK signs the challenges that move the user's money, so exactly one " +
        'file may import it: wallet/data/adapter/circle-sdk-adapter.ts. Every other feature ' +
        '(spend sends through it, profile changes the PIN through it) reaches Circle through ' +
        'CircleWalletPort. Stricter than native-sdks-stay-behind-adapters, which lets any ' +
        "feature's data/adapter import a listed package — for Circle that would allow a second, " +
        'unreviewed path to signing.',
      from: {
        pathNot: '^src/features/wallet/data/adapter/circle-sdk-adapter\\.ts$|/__[^/]*$',
      },
      to: { path: '^node_modules/@circle-fin/w3s-pw-react-native-sdk/' },
    },
    {
      name: 'mobile-wallet-adapter-stays-in-its-one-adapter',
      severity: 'error',
      comment:
        "Mobile Wallet Adapter's Android entry looks up its native module the moment it loads " +
        'and throws where there is none, so one file may import it — ' +
        'receive/data/adapter/mobile-wallet-adapter.android.ts, which Metro bundles for Android ' +
        'alone. An import anywhere else would load it on iOS and crash the app at launch.',
      from: {
        pathNot:
          '^src/features/receive/data/adapter/mobile-wallet-adapter\\.android\\.ts$|/__[^/]*$',
      },
      to: { path: '^node_modules/@solana-mobile/' },
    },
    {
      name: 'solana-sdks-stay-in-their-adapters',
      severity: 'error',
      comment:
        'kit and the token program build the transaction a wallet signs for a deposit, so two ' +
        'files may import them: solana-address.ts and solana-deposit-transaction.ts, whose ' +
        'tests pin every byte that decides where money goes. A third importer would be a ' +
        'second, untested way to build one.',
      from: {
        pathNot:
          '^src/features/receive/data/adapter/solana-(address|deposit-transaction)\\.ts$|/__[^/]*$',
      },
      to: { path: '^node_modules/(@solana|@solana-program)/' },
    },
    {
      name: 'no-orphans',
      severity: 'warn',
      from: {
        orphan: true,
        pathNot: ['\\.d\\.ts$', '(^|/)\\.[^/]+\\.(js|cjs|ts)$', '\\.android\\.tsx?$'],
      },
      to: {},
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    exclude: { path: '\\.test\\.tsx?$|^src/test/' },
    tsConfig: { fileName: 'tsconfig.json' },
    tsPreCompilationDeps: true,
    enhancedResolveOptions: { extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'] },
    reporterOptions: {
      archi: { collapsePattern: '^src/(core|shared|features/[^/]+|app)' },
    },
  },
};
