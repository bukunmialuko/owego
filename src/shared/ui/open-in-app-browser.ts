import { Linking } from 'react-native';
import InAppBrowser from 'react-native-inappbrowser-reborn';

const ALLOWED = /^https:\/\/(?:(?:www\.)?owego\.app|solscan\.io)(?:[/?#]|$)/;

// eslint-disable-next-line no-control-regex -- matching control characters is the point.
const UNSAFE = /[\s\u0000-\u001f\u007f]/;

export async function openInAppBrowser(url: string): Promise<boolean> {
  if (!ALLOWED.test(url) || UNSAFE.test(url)) return false;

  try {
    if (await InAppBrowser.isAvailable()) {
      await InAppBrowser.open(url);
      return true;
    }
  } catch {
    // Falls through: an unavailable in-app browser is not a reason to leave the link dead.
  }

  try {
    await Linking.openURL(url);
    return true;
  } catch {
    return false;
  }
}
