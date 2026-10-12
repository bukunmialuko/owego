import { screen, userEvent } from '@testing-library/react-native';
import { renderWithProviders } from '@/test/render-with-providers';
import type { BalanceChip } from '../../util/balance-chip';
import { BalanceCard } from './balance-card';

const noop = () => undefined;

async function renderCard({
  amount = '$5,136.98',
  isLoading = false,
  chip,
  isHidden = false,
  onPressAmount = noop,
}: {
  amount?: string;
  isLoading?: boolean;
  chip?: BalanceChip;
  isHidden?: boolean;
  onPressAmount?: () => void;
} = {}) {
  await renderWithProviders(
    <BalanceCard
      amount={amount}
      isLoading={isLoading}
      chip={chip}
      isHidden={isHidden}
      onToggleHidden={noop}
      onPressAmount={onPressAmount}
      onPressPay={noop}
    />,
  );
}

describe('BalanceCard', () => {
  it('holds the figure with a placeholder a quarter of the card wide while the balance loads', async () => {
    await renderCard({ amount: '', isLoading: true });

    expect(screen.getByTestId('skeleton', { includeHiddenElements: true })).toHaveStyle({
      width: '25%',
    });
  });

  it('opens the breakdown from the figure', async () => {
    const onPressAmount = jest.fn();
    const user = userEvent.setup();
    await renderCard({ onPressAmount });

    await user.press(screen.getByRole('button', { name: '$5,136.98' }));

    expect(onPressAmount).toHaveBeenCalledTimes(1);
  });

  it('opens the breakdown from the figure while it is hidden', async () => {
    const onPressAmount = jest.fn();
    const user = userEvent.setup();
    await renderCard({ isHidden: true, onPressAmount });

    await user.press(screen.getByRole('button', { name: 'Balance hidden' }));

    expect(onPressAmount).toHaveBeenCalledTimes(1);
  });

  it('shows the converted balance under its flag, as something to read rather than tap', async () => {
    await renderCard({ chip: { kind: 'converted', countryCode: 'NG', amount: '₦47,799.69' } });

    expect(screen.getByText('🇳🇬')).toBeOnTheScreen();
    expect(screen.getByText('₦47,799.69')).toBeOnTheScreen();
    expect(screen.getAllByRole('button')).toHaveLength(3);
  });

  it('shows the rate under its flag', async () => {
    await renderCard({
      isHidden: true,
      chip: { kind: 'rate', countryCode: 'NG', base: '$1', quote: '₦1,550.50' },
    });

    expect(screen.getByText('🇳🇬')).toBeOnTheScreen();
    expect(screen.getByText('$1 = ₦1,550.50')).toBeOnTheScreen();
  });

  it('holds the chip with a placeholder while the rate loads', async () => {
    await renderCard({ chip: { kind: 'pending' } });

    expect(screen.getByTestId('skeleton', { includeHiddenElements: true })).toBeOnTheScreen();
  });
});
