import { Text } from 'react-native';
import { render } from '@testing-library/react-native';
import { testAppConfig } from '@/test/test-config';
import { AppProviders } from './app-providers';

describe('AppProviders', () => {
  let consoleError: jest.SpyInstance;

  beforeEach(() => {
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleError.mockRestore();
  });

  it('mounts once the configuration is valid', async () => {
    await expect(
      render(
        <AppProviders config={testAppConfig}>
          <Text>ready</Text>
        </AppProviders>,
      ),
    ).resolves.toBeDefined();

    expect(consoleError).not.toHaveBeenCalled();
  });

  it.each(['googleWebClientId', 'googleIosClientId', 'circleAppId'] as const)(
    'refuses to start when %s is blank, naming the field',
    async (field) => {
      await expect(
        render(
          <AppProviders config={{ ...testAppConfig, [field]: '' }}>
            <Text>ready</Text>
          </AppProviders>,
        ),
      ).rejects.toThrow(field);
    },
  );

  it('says which file to edit and that the bundler must be restarted', async () => {
    await expect(
      render(
        <AppProviders config={{ ...testAppConfig, circleAppId: '' }}>
          <Text>ready</Text>
        </AppProviders>,
      ),
    ).rejects.toThrow(/\.env.*--reset-cache/s);
  });

  it('refuses to start with no configuration at all', async () => {
    await expect(
      render(
        <AppProviders config={undefined}>
          <Text>ready</Text>
        </AppProviders>,
      ),
    ).rejects.toThrow(/\.env\.example/);
  });
});
