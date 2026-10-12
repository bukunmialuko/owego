import { screen } from '@testing-library/react-native';
import { lightTheme } from '@/core/design-system';
import { renderWithProviders } from '@/test/render-with-providers';
import { AmountDisplay } from './amount-display';

jest.useFakeTimers();

const BASE = {
  prefix: '$',
  whole: '50',
  decimalSeparator: '.',
  fraction: '00',
  typedFractionDigits: 0,
  suffix: '',
  accessibilityLabel: 'Amount, $50.00',
};

describe('AmountDisplay', () => {
  it('reads as one amount to a screen reader, not as separate digits', async () => {
    await renderWithProviders(<AmountDisplay {...BASE} />);

    expect(await screen.findByLabelText('Amount, $50.00')).toBeOnTheScreen();
  });

  it('dims the cents that have not been typed', async () => {
    await renderWithProviders(<AmountDisplay {...BASE} />);

    expect(await screen.findByText('00')).toHaveStyle({ color: lightTheme.color.textTertiary });
  });

  it('lights each cent as it is typed', async () => {
    await renderWithProviders(<AmountDisplay {...BASE} fraction="25" typedFractionDigits={1} />);

    expect(await screen.findByText('5')).toHaveStyle({ color: lightTheme.color.textTertiary });
    expect(screen.getByText('$50.25')).toBeOnTheScreen();
  });

  it('leaves nothing dimmed once the cents are complete', async () => {
    await renderWithProviders(<AmountDisplay {...BASE} fraction="25" typedFractionDigits={2} />);

    expect(await screen.findByText('$50.25')).toBeOnTheScreen();
  });

  it('announces exactly one heading, however the cents are split', async () => {
    await renderWithProviders(<AmountDisplay {...BASE} fraction="25" typedFractionDigits={1} />);

    expect(await screen.findAllByRole('header')).toHaveLength(1);
  });
});
