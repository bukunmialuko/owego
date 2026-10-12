import { loadAppConfig } from './app-config';

const validExtra = {
  environment: 'staging',
  apiBaseUrl: 'https://api.example.com/api/v1',
  sentryDsn: 'https://key@sentry.io/1',
  sentryTracesSampleRate: 0.1,
  googleWebClientId: '1-web.apps.googleusercontent.com',
  googleIosClientId: '1-ios.apps.googleusercontent.com',
  circleAppId: 'circle-app-id',
  solanaCluster: 'devnet',
  solanaRpcUrl: 'https://api.devnet.solana.com',
};

describe('loadAppConfig', () => {
  it('parses a complete configuration', () => {
    const result = loadAppConfig(validExtra);

    expect(result).toEqual({ ok: true, value: expect.objectContaining(validExtra) });
  });

  it('treats sentry as optional so development can run without it', () => {
    const { sentryDsn: _omitted, ...withoutSentry } = validExtra;

    const result = loadAppConfig(withoutSentry);

    expect(result.ok).toBe(true);
  });

  describe('rejects misconfiguration', () => {
    it('when the base url is missing', () => {
      const { apiBaseUrl: _omitted, ...incomplete } = validExtra;

      const result = loadAppConfig(incomplete);

      expect(result.ok).toBe(false);
      if (result.ok) throw new Error('expected a validation failure');
      expect(result.error.fieldErrors).toHaveProperty('apiBaseUrl');
    });

    it('when the base url is not a url', () => {
      expect(loadAppConfig({ ...validExtra, apiBaseUrl: 'localhost:8000' }).ok).toBe(false);
    });

    it('when the base url omits the api path prefix', () => {
      const result = loadAppConfig({
        ...validExtra,
        apiBaseUrl: 'https://api.example.com',
      });

      expect(result.ok).toBe(false);
      if (result.ok) throw new Error('expected a validation failure');
      expect(result.error.fieldErrors).toHaveProperty('apiBaseUrl');
    });

    it('when the base url has only a root path', () => {
      expect(loadAppConfig({ ...validExtra, apiBaseUrl: 'https://api.example.com/' }).ok).toBe(
        false,
      );
    });

    it('when the base url stops short of the version segment', () => {
      expect(loadAppConfig({ ...validExtra, apiBaseUrl: 'https://api.example.com/api' }).ok).toBe(
        false,
      );
    });

    it('when the environment is not a known flavor', () => {
      expect(loadAppConfig({ ...validExtra, environment: 'qa' }).ok).toBe(false);
    });

    it('when the trace sample rate is out of range', () => {
      expect(loadAppConfig({ ...validExtra, sentryTracesSampleRate: 1.5 }).ok).toBe(false);
    });

    const required = ['googleWebClientId', 'googleIosClientId', 'circleAppId'] as const;

    it.each(required)('when %s is missing', (field) => {
      const { [field]: _omitted, ...incomplete } = validExtra;

      const result = loadAppConfig(incomplete);

      expect(result.ok).toBe(false);
      if (result.ok) throw new Error('expected a validation failure');
      expect(result.error.fieldErrors).toHaveProperty(field);
    });

    it.each(required)('when %s is blank', (field) => {
      const result = loadAppConfig({ ...validExtra, [field]: '' });

      expect(result.ok).toBe(false);
      if (result.ok) throw new Error('expected a validation failure');
      expect(result.error.fieldErrors).toHaveProperty(field);
    });

    it.each([
      ['missing', undefined],
      ['blank', ''],
      ['not a cluster Solscan names', 'testnet'],
    ])('when the solana cluster is %s', (_, solanaCluster) => {
      const result = loadAppConfig({ ...validExtra, solanaCluster });

      expect(result.ok).toBe(false);
      if (result.ok) throw new Error('expected a validation failure');
      expect(result.error.fieldErrors).toHaveProperty('solanaCluster');
    });

    it.each([
      ['missing', undefined],
      ['blank', ''],
      ['plain http', 'http://api.devnet.solana.com'],
      ['not a url', 'api.devnet.solana.com'],
    ])('when the solana rpc url is %s', (_, solanaRpcUrl) => {
      const result = loadAppConfig({ ...validExtra, solanaRpcUrl });

      expect(result.ok).toBe(false);
      if (result.ok) throw new Error('expected a validation failure');
      expect(result.error.fieldErrors).toHaveProperty('solanaRpcUrl');
    });

    it('when there is no configuration at all', () => {
      expect(loadAppConfig(undefined).ok).toBe(false);
    });
  });

  it('defaults the trace sample rate to off', () => {
    const { sentryTracesSampleRate: _omitted, ...withoutRate } = validExtra;

    const result = loadAppConfig(withoutRate);

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected a valid config');
    expect(result.value.sentryTracesSampleRate).toBe(0);
  });
});
