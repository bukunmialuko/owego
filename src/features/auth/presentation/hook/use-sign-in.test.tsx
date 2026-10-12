import { Pressable, Text } from 'react-native';
import { screen, userEvent } from '@testing-library/react-native';
import { asValue } from 'awilix';
import { ok } from '@/core/result/result';
import { createSessionStore } from '@/core/session/session-store';
import { createTestContainer, renderWithProviders } from '@/test/render-with-providers';
import type { Session } from '../../domain/entity/auth-entity';
import type { SignInUseCase } from '../../domain/usecase/sign-in-usecase';
import { useSignIn } from './use-sign-in';

jest.useFakeTimers();

const session: Session = {
  user: {
    id: 'u1',
    firstName: 'Precious',
    lastName: 'Jameson',
    email: 'p@example.com',
    phone: '',
    country: 'ng',
    isBusiness: false,
    businessName: '',
    pictureUrl: '',
    kycState: 'not_started',
  },
  tokens: { access: 'a', refresh: 'r' },
  verification: { kycVerified: false, isPinSet: false },
};

function Harness() {
  const { signIn } = useSignIn();

  return (
    <Pressable accessibilityRole="button" onPress={() => void signIn('google')}>
      <Text>Sign in</Text>
    </Pressable>
  );
}

describe('useSignIn', () => {
  it('hands the session the account’s verification state', async () => {
    const sessionStore = createSessionStore();
    await renderWithProviders(<Harness />, {
      container: createTestContainer({
        sessionStore: asValue(sessionStore),
        signInWithGoogleUseCase: asValue({
          execute: () => Promise.resolve(ok({ session, stage: 'create-wallet' as const })),
        } satisfies SignInUseCase),
      }),
    });
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    await user.press(screen.getByRole('button', { name: 'Sign in' }));

    expect(sessionStore.getState()).toMatchObject({
      status: 'authenticated',
      stage: 'create-wallet',
      user: { id: 'u1', firstName: 'Precious', kycState: 'NOT_STARTED' },
    });
  });
});
