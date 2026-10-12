import { Pressable, Text } from 'react-native';
import { screen, userEvent } from '@testing-library/react-native';
import { asValue } from 'awilix';
import { createEphemeralTokenPersistence } from '@/core/network/token-persistence';
import { createKeyValueStorage } from '@/core/storage/mmkv-key-value-storage';
import { createTestContainer, renderWithProviders } from '@/test/render-with-providers';
import { rememberKycSkipped } from './kyc-skip';
import { KycState } from './onboarding-gate';
import { createSessionStore } from './session-store';
import { useAdmitWalletHolder } from './use-admit-wallet-holder';

jest.useFakeTimers();

function Harness() {
  const admit = useAdmitWalletHolder();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        void admit();
      }}
    >
      <Text>Admit</Text>
    </Pressable>
  );
}

async function admitWith(options: { hasSkipped: boolean; keepsSession?: boolean }) {
  const sessionStore = createSessionStore();
  sessionStore
    .getState()
    .signedIn({ id: 'u1', firstName: 'Ada', kycState: KycState.NotStarted }, 'provisioning');
  const cache = createKeyValueStorage(`admit-${String(options.hasSkipped)}`);
  if (options.hasSkipped) rememberKycSkipped(cache);

  await renderWithProviders(<Harness />, {
    container: createTestContainer({
      sessionStore: asValue(sessionStore),
      cache: asValue(cache),
      tokenPersistence: asValue({
        ...createEphemeralTokenPersistence(),
        persists: () => Promise.resolve(options.keepsSession ?? true),
      }),
    }),
  });
  const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
  await user.press(screen.getByRole('button', { name: 'Admit' }));

  return sessionStore.getState().stage;
}

describe('useAdmitWalletHolder', () => {
  it('asks a wallet holder whose session does not persist for a sign-in PIN', async () => {
    await expect(admitWith({ hasSkipped: false, keepsSession: false })).resolves.toBe(
      'secure-session',
    );
  });

  it('offers verification to a wallet holder whose session persists and still owes it', async () => {
    await expect(admitWith({ hasSkipped: false })).resolves.toBe('kyc');
  });

  it('admits a wallet holder who declined verification on this device straight to home', async () => {
    await expect(admitWith({ hasSkipped: true })).resolves.toBe('ready');
  });
});
