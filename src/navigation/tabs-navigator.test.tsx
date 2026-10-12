import { screen, userEvent } from '@testing-library/react-native';
import { renderWithProviders } from '@/test/render-with-providers';
import { AppNavigator } from './app-navigator';

jest.useFakeTimers();

async function openQuickActions() {
  const user = userEvent.setup();
  await renderWithProviders(<AppNavigator />, { withNavigation: true });

  await user.press(await screen.findByRole('button', { name: 'Open quick actions' }));

  return user;
}

describe('quick actions', () => {
  it('offers receive money, manage recipients and account settings, leaving cards and refer & earn disabled', async () => {
    await openQuickActions();

    const actions = await screen.findAllByRole('button', {
      name: /^(Receive money|Manage recipients|Virtual cards|Refer & earn|Account settings),/,
    });

    expect(actions).toHaveLength(5);
    expect(actions[0]).toHaveAccessibleName(/^Receive money,/);
    expect(actions[0]).toBeEnabled();
    expect(actions[1]).toHaveAccessibleName(/^Manage recipients,/);
    expect(actions[1]).toBeEnabled();
    expect(actions[2]).toHaveAccessibleName(/^Virtual cards,/);
    expect(actions[2]).toBeDisabled();
    expect(actions[3]).toHaveAccessibleName(/^Refer & earn,/);
    expect(actions[3]).toBeDisabled();
    expect(actions[4]).toHaveAccessibleName(/^Account settings,/);
    expect(actions[4]).toBeEnabled();
  });

  it('opens receive money on the choice of how to fund the balance', async () => {
    const user = await openQuickActions();

    await user.press(await screen.findByRole('button', { name: /^Receive money,/ }));

    expect(await screen.findByRole('header', { name: 'Receive money' })).toBeOnTheScreen();
  });

  it('reaches the deposit address through sharing a wallet address', async () => {
    const user = await openQuickActions();

    await user.press(await screen.findByRole('button', { name: /^Receive money,/ }));
    await user.press(await screen.findByRole('button', { name: /^Share your wallet address,/ }));

    expect(await screen.findByRole('header', { name: 'Receive' })).toBeOnTheScreen();
  });

  it('lists refer & earn without opening it', async () => {
    const user = await openQuickActions();
    const referAndEarn = await screen.findByRole('button', { name: /^Refer & earn,/ });

    await user.press(referAndEarn);

    expect(referAndEarn).toBeDisabled();
    expect(screen.queryByText('FJFOW342')).toBeNull();
  });

  it('opens the saved beneficiaries', async () => {
    const user = await openQuickActions();

    await user.press(await screen.findByRole('button', { name: /^Manage recipients,/ }));

    expect(await screen.findByRole('header', { name: 'Beneficiaries' })).toBeOnTheScreen();
  });

  it('opens account settings on the settings page', async () => {
    const user = await openQuickActions();

    await user.press(await screen.findByRole('button', { name: /^Account settings,/ }));

    expect(await screen.findByRole('header', { name: 'Settings' })).toBeOnTheScreen();
  });
});
