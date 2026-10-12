import { GoogleSignin } from '@react-native-google-signin/google-signin';
import type { SessionCleanupTask } from '@/core/session/session-cleanup';

export function createGoogleSessionCleanupTask(): SessionCleanupTask {
  return {
    name: 'google-session',

    async run() {
      await GoogleSignin.signOut();
    },
  };
}
