import { execSync } from 'node:child_process';
import { loadAppConfig } from './app-config';
import { readRuntimeConfig } from './read-runtime-config';

describe('readRuntimeConfig', () => {
  it('produces a configuration the schema accepts', () => {
    const result = loadAppConfig(readRuntimeConfig());

    expect(result.ok).toBe(true);
  });

  it('carries the client ids the sdks need', () => {
    const config = readRuntimeConfig();

    expect(config['googleWebClientId']).toBeTruthy();
    expect(config['googleIosClientId']).toBeTruthy();
    expect(config['circleAppId']).toBeTruthy();
  });

  it('carries the solana cluster from the flavor file', () => {
    expect(readRuntimeConfig()['solanaCluster']).toBe('devnet');
  });

  it('carries the solana rpc url from the flavor file', () => {
    expect(readRuntimeConfig()['solanaRpcUrl']).toBe('https://rpc.solana.test');
  });
});

describe('the @env boundary', () => {
  it('is imported by read-runtime-config.ts and nothing else', () => {
    const matches = execSync('grep -rl "from \'@env\'" src || true', { encoding: 'utf-8' })
      .split('\n')
      .filter(Boolean)
      .filter((path) => !path.includes('.test.'));

    expect(matches).toEqual(['src/core/config/read-runtime-config.ts']);
  });
});
