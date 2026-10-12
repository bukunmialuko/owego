import { Linking } from 'react-native';
import InAppBrowser from 'react-native-inappbrowser-reborn';
import { openInAppBrowser } from './open-in-app-browser';

const SOLSCAN = 'https://solscan.io/tx/Wxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx?cluster=devnet';

let openUrl: jest.SpyInstance;

beforeEach(() => {
  jest.mocked(InAppBrowser.isAvailable).mockResolvedValue(true);
  jest.mocked(InAppBrowser.open).mockClear();
  openUrl = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
});

afterEach(() => {
  openUrl.mockRestore();
});

describe('openInAppBrowser', () => {
  it.each([SOLSCAN, 'https://www.owego.app/terms-of-use', 'https://owego.app'])(
    'opens %s in the in-app browser',
    async (url) => {
      await expect(openInAppBrowser(url)).resolves.toBe(true);

      expect(InAppBrowser.open).toHaveBeenCalledWith(url);
      expect(openUrl).not.toHaveBeenCalled();
    },
  );

  it.each([
    ['plain http', 'http://solscan.io/tx/abc'],
    ['a script', 'javascript:alert(1)'],
    ['a lookalike subdomain', 'https://solscan.io.evil.com/tx/abc'],
    ['a lookalike of the www host', 'https://www.owego.app.evil.com/terms-of-use'],
    ['userinfo before the real host', 'https://solscan.io@evil.com/tx/abc'],
    ['the host named in a path', 'https://evil.com/solscan.io'],
    ['a scheme-relative url', '//solscan.io/tx/abc'],
    ['a backslash browsers read as a slash', 'https://solscan.io\\@evil.com'],
    ['an explicit port', 'https://solscan.io:8443/tx/abc'],
    ['an embedded newline', 'https://solscan.io/tx/abc\nhttps://evil.com'],
    ['a trailing space', `${SOLSCAN} `],
    ['an unknown host', 'https://example.com'],
  ])('refuses %s', async (_, url) => {
    await expect(openInAppBrowser(url)).resolves.toBe(false);

    expect(InAppBrowser.open).not.toHaveBeenCalled();
    expect(openUrl).not.toHaveBeenCalled();
  });

  it('falls back to the system browser when the in-app one is unavailable', async () => {
    jest.mocked(InAppBrowser.isAvailable).mockResolvedValue(false);

    await expect(openInAppBrowser(SOLSCAN)).resolves.toBe(true);

    expect(openUrl).toHaveBeenCalledWith(SOLSCAN);
  });

  it('falls back to the system browser when the in-app one throws', async () => {
    jest.mocked(InAppBrowser.open).mockRejectedValueOnce(new Error('no activity'));

    await expect(openInAppBrowser(SOLSCAN)).resolves.toBe(true);

    expect(openUrl).toHaveBeenCalledWith(SOLSCAN);
  });

  it('reports failure rather than throwing when neither browser opens', async () => {
    jest.mocked(InAppBrowser.isAvailable).mockResolvedValue(false);
    openUrl.mockRejectedValueOnce(new Error('no handler'));

    await expect(openInAppBrowser(SOLSCAN)).resolves.toBe(false);
  });
});
