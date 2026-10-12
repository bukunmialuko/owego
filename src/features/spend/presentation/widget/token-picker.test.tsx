import { useState } from 'react';
import { screen, userEvent } from '@testing-library/react-native';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { lightTheme } from '@/core/design-system';
import { renderWithProviders } from '@/test/render-with-providers';
import { stubWindowLayout } from '@/test/stub-window-layout';
import type { FundingOption } from '../../domain/asset/funding-token';
import type { SendableToken } from '../../domain/asset/send-networks';
import { TokenPicker } from './token-picker';

jest.useFakeTimers();

const CHIP_IN_WINDOW = { x: 16, y: 136, width: 112, height: 44 };

const BOTH: FundingOption[] = [
  { symbol: 'USDC', balanceMinor: 513_698 },
  { symbol: 'USDT', balanceMinor: 0 },
];

type HarnessProps = {
  options?: FundingOption[];
  initial?: SendableToken;
  isPending?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  onSelect?: (token: SendableToken) => void;
};

function Harness({
  options = BOTH,
  initial = 'USDC',
  isPending = false,
  isError = false,
  onRetry = jest.fn(),
  onSelect,
}: HarnessProps) {
  const [token, setToken] = useState<SendableToken | undefined>(
    options.some((option) => option.symbol === initial) ? initial : undefined,
  );

  return (
    <TokenPicker
      options={options}
      selected={token}
      isPending={isPending}
      isError={isError}
      onRetry={onRetry}
      onSelect={(next) => {
        setToken(next);
        onSelect?.(next);
      }}
    />
  );
}

function hiddenPlaceholders() {
  const found: unknown[] = [];

  const walk = (node: unknown): void => {
    if (node === null || typeof node !== 'object') return;
    const n = node as { props?: Record<string, unknown>; children?: unknown[] };
    if (n.props?.['accessibilityElementsHidden'] === true) {
      found.push(StyleSheet.flatten(n.props['style'] as StyleProp<ViewStyle>));
    }
    n.children?.forEach(walk);
  };

  walk(screen.toJSON());

  return found;
}

let windowLayout: ReturnType<typeof stubWindowLayout>;

beforeEach(() => {
  windowLayout = stubWindowLayout(CHIP_IN_WINDOW);
});

afterEach(() => {
  windowLayout.mockRestore();
});

describe('TokenPicker', () => {
  it('shows the chosen token on the chip, with the menu closed', async () => {
    await renderWithProviders(<Harness />);

    expect(await screen.findByRole('button', { name: 'Token, USDC' })).toBeCollapsed();
    expect(screen.queryByRole('button', { name: /^USDT/ })).not.toBeOnTheScreen();
  });

  it('lists each wallet the account holds with its balance, marking the chosen one', async () => {
    const user = userEvent.setup();
    await renderWithProviders(<Harness />);

    await user.press(await screen.findByRole('button', { name: 'Token, USDC' }));

    expect(await screen.findByRole('button', { name: 'USDC, 5,136.98 USDC' })).toBeSelected();
    expect(screen.getByRole('button', { name: 'USDT, 0.00 USDT' })).not.toBeSelected();
    expect(screen.getByRole('button', { name: 'Token, USDC' })).toBeExpanded();
  });

  it('offers only the wallets that exist', async () => {
    const user = userEvent.setup();
    await renderWithProviders(<Harness options={[{ symbol: 'USDC', balanceMinor: 1_000 }]} />);

    await user.press(await screen.findByRole('button', { name: 'Token, USDC' }));

    expect(await screen.findByRole('button', { name: 'USDC, 10.00 USDC' })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: /^USDT/ })).not.toBeOnTheScreen();
  });

  it('hangs the menu just below the chip, where the chip sits on screen', async () => {
    const user = userEvent.setup();
    await renderWithProviders(<Harness />);

    await user.press(await screen.findByRole('button', { name: 'Token, USDC' }));

    expect(await screen.findByTestId('dropdown-menu-panel')).toHaveStyle({
      top: CHIP_IN_WINDOW.y + CHIP_IN_WINDOW.height + lightTheme.spacing.xs,
      left: CHIP_IN_WINDOW.x,
    });
  });

  it('switches to the wallet pressed and closes the menu', async () => {
    const user = userEvent.setup();
    const onSelect = jest.fn();
    await renderWithProviders(<Harness onSelect={onSelect} />);

    await user.press(await screen.findByRole('button', { name: 'Token, USDC' }));
    await user.press(await screen.findByRole('button', { name: /^USDT/ }));

    expect(onSelect).toHaveBeenCalledWith('USDT');
    expect(await screen.findByRole('button', { name: 'Token, USDT' })).toBeCollapsed();
    expect(screen.queryByRole('button', { name: /^USDC/ })).not.toBeOnTheScreen();
  });

  it('closes without changing the wallet when dismissed', async () => {
    const user = userEvent.setup();
    const onSelect = jest.fn();
    await renderWithProviders(<Harness onSelect={onSelect} />);

    await user.press(await screen.findByRole('button', { name: 'Token, USDC' }));
    await user.press(await screen.findByRole('button', { name: 'Close' }));

    expect(onSelect).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: /^USDT/ })).not.toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Token, USDC' })).toBeOnTheScreen();
  });

  it('holds a chip-shaped shimmer, with no label and nothing to press, while the wallets load', async () => {
    await renderWithProviders(<Harness options={[]} isPending />);

    expect(screen.queryByLabelText('Token')).not.toBeOnTheScreen();
    expect(screen.queryByRole('button')).not.toBeOnTheScreen();
    expect(hiddenPlaceholders()).toEqual([
      expect.objectContaining({
        borderRadius: lightTheme.radius.pill,
        height: lightTheme.size.control.md,
      }),
    ]);
  });

  it('says there is nothing to send from when the account holds neither token', async () => {
    const user = userEvent.setup();
    await renderWithProviders(<Harness options={[]} />);

    await user.press(await screen.findByRole('button', { name: 'Token' }));

    expect(await screen.findByText('No USDC or USDT wallet to send from yet')).toBeOnTheScreen();
  });

  it('retries when the wallets could not be read, and says so', async () => {
    const user = userEvent.setup();
    const onRetry = jest.fn();
    await renderWithProviders(<Harness options={[]} isError onRetry={onRetry} />);

    await user.press(await screen.findByRole('button', { name: 'Token' }));

    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(await screen.findByText('Balance unavailable')).toBeOnTheScreen();
  });
});
