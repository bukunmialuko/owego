import { screen, userEvent } from '@testing-library/react-native';
import { asValue } from 'awilix';
import { ok } from '@/core/result/result';
import { createTestContainer, renderWithProviders } from '@/test/render-with-providers';
import type { DeleteAccountUseCase } from '../domain/usecase/delete-account-usecase';
import { DeleteAccountScreen } from './delete-account-screen';

jest.useFakeTimers();

function usecase(overrides: Partial<DeleteAccountUseCase> = {}): DeleteAccountUseCase {
  return {
    findBlockers: () => Promise.resolve(ok([])),
    execute: jest.fn(() => Promise.resolve(ok({ type: 'deleted' as const }))),
    ...overrides,
  };
}

async function renderScreen(deleteAccountUseCase = usecase()) {
  const user = userEvent.setup();

  await renderWithProviders(<DeleteAccountScreen />, {
    withNavigation: true,
    container: createTestContainer({ deleteAccountUseCase: asValue(deleteAccountUseCase) }),
  });

  return { user, deleteAccountUseCase };
}

const CONFIRM = 'Yes, delete my account';
const CONSENT = /I understand that once deleted/;

describe('DeleteAccountScreen', () => {
  it('states plainly what deleting means', async () => {
    await renderScreen();

    expect(
      await screen.findByText('Are you sure you want to delete your account?'),
    ).toBeOnTheScreen();
    expect(screen.getByText(/cannot be undone/)).toBeOnTheScreen();
  });

  it('will not delete until the consent is ticked', async () => {
    const { user, deleteAccountUseCase } = await renderScreen();

    expect(await screen.findByRole('button', { name: CONFIRM })).toBeDisabled();

    await user.press(await screen.findByRole('checkbox', { name: CONSENT }));

    expect(screen.getByRole('button', { name: CONFIRM })).toBeEnabled();
    expect(deleteAccountUseCase.execute).not.toHaveBeenCalled();
  });

  it('deletes once consent is given and the action is taken', async () => {
    const { user, deleteAccountUseCase } = await renderScreen();

    await user.press(await screen.findByRole('checkbox', { name: CONSENT }));
    await user.press(screen.getByRole('button', { name: CONFIRM }));

    expect(deleteAccountUseCase.execute).toHaveBeenCalled();
  });

  it('explains what is standing in the way, with the figures', async () => {
    const { user } = await renderScreen(
      usecase({
        execute: jest.fn(() =>
          Promise.resolve(
            ok({
              type: 'blocked' as const,
              blockers: [
                { type: 'funds' as const, amountMinor: 13456, currency: 'USD' as const },
                { type: 'pending' as const, amountMinor: 2340, currency: 'USD' as const },
              ],
            }),
          ),
        ),
      }),
    );

    await user.press(await screen.findByRole('checkbox', { name: CONSENT }));
    await user.press(screen.getByRole('button', { name: CONFIRM }));

    expect(await screen.findByText('Account deletion paused')).toBeOnTheScreen();
    expect(screen.getByText(/\$134\.56/)).toBeOnTheScreen();
    expect(screen.getByText(/\$23\.40/)).toBeOnTheScreen();
  });
});
