module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      'module:react-native-dotenv',
      {
        moduleName: '@env',
        path: process.env.ENVFILE || '.env',
        safe: false,
        allowUndefined: true,
      },
    ],
    '@babel/plugin-transform-export-namespace-from',
    [
      'module-resolver',
      {
        extensions: ['.ts', '.tsx', '.js', '.jsx', '.json', '.svg'],
        alias: {
          '^@/assets/(.+)': './assets/\\1',
          '^@/(.+)': './src/\\1',
        },
      },
    ],
  ],
};
