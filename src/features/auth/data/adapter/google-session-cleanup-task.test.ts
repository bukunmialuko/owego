import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { createGoogleSessionCleanupTask } from './google-session-cleanup-task';

describe('createGoogleSessionCleanupTask', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('signs out of the google sdk so the next sign-in offers the account picker', async () => {
    await createGoogleSessionCleanupTask().run();

    expect(GoogleSignin.signOut).toHaveBeenCalledTimes(1);
  });

  it('is named for the residue it clears', () => {
    expect(createGoogleSessionCleanupTask().name).toBe('google-session');
  });

  it('lets an sdk failure reach the registry', async () => {
    jest.mocked(GoogleSignin.signOut).mockRejectedValueOnce(new Error('keychain error'));

    await expect(createGoogleSessionCleanupTask().run()).rejects.toThrow('keychain error');
  });
});
