import { screen, userEvent, within } from '@testing-library/react-native';
import { asValue } from 'awilix';
import { lightTheme } from '@/core/design-system';
import { createSessionStore } from '@/core/session/session-store';
import { createTestContainer, renderWithProviders } from '@/test/render-with-providers';
import { AppNavigator } from '@/navigation/app-navigator';
import { ancestorsOf } from '@/test/ancestors-of';
import { KycState } from '@/core/session/onboarding-gate';
import { ok } from '@/core/result/result';
import type { Wallet } from '@/core/wallet/wallet';

jest.useFakeTimers();

async function reachProfile(container = createTestContainer()) {
  const user = userEvent.setup();
  await renderWithProviders(<AppNavigator />, { withNavigation: true, container });

  await user.press(await screen.findByRole('button', { name: 'Profile' }));

  return user;
}

function holdingUsdc(amount: string) {
  const wallet: Wallet = {
    id: 'wallet-sol',
    address: 'address',
    blockchain: 'SOL-DEVNET',
    balances: [
      { tokenId: 'usdc-sol', symbol: 'USDC', amount, decimals: 6 },
      { tokenId: 'usdt-sol', symbol: 'USDT', amount: '0', decimals: 6 },
      { tokenId: 'sol-sol', symbol: 'SOL', amount: '3', decimals: 9 },
    ],
  };

  return createTestContainer({
    walletBalancePort: asValue({ listWallets: () => Promise.resolve(ok([wallet])) }),
  });
}

describe('reaching the profile screen', () => {
  it('opens from the name on the dashboard header', async () => {
    await reachProfile();

    expect(await screen.findByRole('header', { name: 'Settings' })).toBeOnTheScreen();
  });

  it('keeps the app bar in place while the page scrolls', async () => {
    await reachProfile();

    const scrollView = ancestorsOf(await screen.findByText('Precious Jameson')).find(
      (node) => node.props['contentContainerStyle'] !== undefined,
    );

    expect(scrollView).toBeDefined();
    expect(ancestorsOf(screen.getByRole('header', { name: 'Settings' }))).not.toContain(scrollView);
    expect(ancestorsOf(screen.getByRole('button', { name: 'Back' }))).not.toContain(scrollView);
  });
});

describe('the account it shows', () => {
  it('names the signed-in account', async () => {
    await reachProfile();

    expect(await screen.findByText('Precious Jameson')).toBeOnTheScreen();
    expect(screen.getByText('precious.james@gmail.com')).toBeOnTheScreen();
  });

  it('shows the silhouette until the account chooses a colour', async () => {
    await reachProfile();

    await screen.findByText('Precious Jameson');
    expect(
      screen.getAllByTestId('avatar-silhouette', { includeHiddenElements: true }),
    ).toHaveLength(2);
  });

  it("draws the avatar in the account's saved colour", async () => {
    const sessionStore = createSessionStore();
    sessionStore
      .getState()
      .signedIn({ id: 'u1', firstName: 'Precious', kycState: KycState.Approved }, 'ready');
    const container = createTestContainer({ sessionStore: asValue(sessionStore) });
    container.cradle.avatarAppearanceStore.getState().save({ kind: 'initials', swatch: 'coral' });

    await reachProfile(container);

    expect((await screen.findByText('PJ')).parent).toHaveStyle({
      backgroundColor: lightTheme.color.fillAvatarCoral,
    });
  });

  it('totals every wallet rather than showing one token', async () => {
    await reachProfile();

    expect(await screen.findByText('$5,136.98')).toBeOnTheScreen();
  });

  it('rounds the total down rather than up', async () => {
    await reachProfile(holdingUsdc('30.828566'));

    expect(await screen.findByText('$30.82')).toBeOnTheScreen();
  });

  it('keeps the total in dollars after a currency is picked under Currency', async () => {
    const user = await reachProfile();
    await screen.findByText('$5,136.98');

    await user.press(await screen.findByText('Currency'));
    await user.press(await screen.findByRole('button', { name: /Nigerian Naira/ }));

    expect(await screen.findByText('$5,136.98')).toBeOnTheScreen();
    expect(screen.queryByText('₦3,801.36')).toBeNull();
  });

  it('lists each stablecoin once, however many wallets hold it', async () => {
    const wallets: Wallet[] = ['wallet-sol', 'wallet-base'].map((id) => ({
      id,
      address: 'address',
      blockchain: 'SOL-DEVNET',
      balances: [{ tokenId: `${id}-usdc`, symbol: 'USDC', amount: '1.5', decimals: 6 }],
    }));

    await reachProfile(
      createTestContainer({
        walletBalancePort: asValue({ listWallets: () => Promise.resolve(ok(wallets)) }),
      }),
    );

    expect(await screen.findByText('3.00 USDC')).toBeOnTheScreen();
  });

  it('lists what each stablecoin holds, rounded down', async () => {
    await reachProfile(holdingUsdc('30.828566'));

    expect(await screen.findByText('30.82 USDC')).toBeOnTheScreen();
    expect(screen.getByText('0.00 USDT')).toBeOnTheScreen();
  });

  it('sets the cents of the total a tier down', async () => {
    await reachProfile();

    expect(await screen.findByText('.98')).toHaveStyle({
      fontSize: lightTheme.typography['numeric.s'].fontSize,
    });
    expect(screen.getByText('$5,136.98')).toHaveStyle({
      fontSize: lightTheme.typography['numeric.l'].fontSize,
    });
  });

  it('keeps the smaller cents rounded down rather than up', async () => {
    await reachProfile(holdingUsdc('30.828566'));

    expect(await screen.findByText('.82')).toBeOnTheScreen();
    expect(screen.queryByText('.83')).toBeNull();
  });

  it('shows the coin beside the total', async () => {
    await reachProfile();

    expect(await screen.findByTestId('balance-coin-art')).toBeOnTheScreen();
  });

  it('sets the stablecoins on a sunken panel inside the card', async () => {
    await reachProfile(holdingUsdc('30.828566'));
    await screen.findByText('30.82 USDC');

    const panel = screen.getByTestId('balance-token-panel');

    expect(panel).toHaveStyle({ backgroundColor: lightTheme.color.bgSurfaceSunken });
    expect(within(panel).getByText('30.82 USDC')).toBeOnTheScreen();
    expect(within(panel).getByText('0.00 USDT')).toBeOnTheScreen();
  });

  it('leaves out a token the total does not count', async () => {
    await reachProfile(holdingUsdc('30.828566'));
    await screen.findByText('30.82 USDC');

    expect(screen.queryByText('SOL')).toBeNull();
  });

  it('reports the verification state as a badge', async () => {
    await reachProfile();

    expect(await screen.findByText('Completed')).toBeOnTheScreen();
  });

  it('offers every settings row the designs list', async () => {
    await reachProfile();

    for (const row of [
      'Verification',
      'Currency',
      'Appearance',
      'Notifications',
      'Change wallet PIN',
    ]) {
      expect(await screen.findByText(row)).toBeOnTheScreen();
    }
  });

  it('offers the support and danger rows', async () => {
    await reachProfile();

    for (const row of ['Send us an email', 'Sign out', 'Delete account']) {
      expect(await screen.findByText(row)).toBeOnTheScreen();
    }
  });

  it('states the build it is running', async () => {
    await reachProfile();

    expect(await screen.findByText(/^VERSION /)).toBeOnTheScreen();
  });
});

describe('what the rows open', () => {
  it('opens the appearance sheet', async () => {
    const user = await reachProfile();

    await user.press(await screen.findByText('Appearance'));

    expect(await screen.findByRole('radio', { name: 'Day' })).toBeOnTheScreen();
  });

  it('opens the currency sheet', async () => {
    const user = await reachProfile();

    await user.press(await screen.findByText('Currency'));

    expect(await screen.findByText('Your balances are held in stablecoins')).toBeOnTheScreen();
  });

  it('shows the picked currency on the settings row as soon as it is picked', async () => {
    const user = await reachProfile();
    expect(await screen.findByText('USD')).toBeOnTheScreen();

    await user.press(await screen.findByText('Currency'));
    await user.press(await screen.findByRole('button', { name: /Nigerian Naira/ }));

    expect(await screen.findByText('NGN')).toBeOnTheScreen();
    expect(screen.queryByText('USD')).toBeNull();
  });

  it('opens the notifications sheet', async () => {
    const user = await reachProfile();

    await user.press(await screen.findByText('Notifications'));

    expect(await screen.findByRole('switch', { name: 'Email' })).toBeOnTheScreen();
  });

  it('opens edit profile', async () => {
    const user = await reachProfile();

    await user.press(await screen.findByRole('button', { name: 'Edit profile' }));

    expect(await screen.findByRole('header', { name: 'Edit profile' })).toBeOnTheScreen();
  });

  it('opens the delete-account confirmation', async () => {
    const user = await reachProfile();

    await user.press(await screen.findByText('Delete account'));

    expect(
      await screen.findByText('Are you sure you want to delete your account?'),
    ).toBeOnTheScreen();
  });

  it('leaves the verification row inert once the account is approved', async () => {
    await reachProfile();

    await screen.findByText('Completed');

    expect(screen.queryByRole('button', { name: /^Verification/ })).not.toBeOnTheScreen();
  });
});
