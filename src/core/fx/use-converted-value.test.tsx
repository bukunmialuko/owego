import { Text } from 'react-native';
import { screen } from '@testing-library/react-native';
import { asValue } from 'awilix';
import { ok } from '@/core/result/result';
import { createTestContainer, renderWithProviders } from '@/test/render-with-providers';
import type { Holding } from './converted-value';
import type { FxRateRepository } from './fx-rate';
import { useConvertedValue } from './use-converted-value';

const HOLDING: Holding = { valueMinor: 513_698, currency: 'USD' };

function Converted({ holding }: { holding: Holding | undefined }) {
  const value = useConvertedValue(holding);

  return (
    <Text>{value === undefined ? 'none' : value.kind === 'pending' ? 'pending' : value.label}</Text>
  );
}

async function render(
  displayCurrency: string,
  { holding }: { holding?: Holding } = { holding: HOLDING },
) {
  const getQuote = jest.fn<
    ReturnType<FxRateRepository['getQuote']>,
    Parameters<FxRateRepository['getQuote']>
  >((base, quote) => Promise.resolve(ok({ baseCurrency: base, quoteCurrency: quote, rate: 0.74 })));
  const container = createTestContainer({ fxRateRepository: asValue({ getQuote }) });
  container.resolve('displayCurrencyStore').getState().select(displayCurrency);
  await renderWithProviders(<Converted holding={holding} />, { container });

  return getQuote;
}

describe('useConvertedValue', () => {
  it('converts the holding into the display currency', async () => {
    await render('NGN');

    expect(await screen.findByText('₦3,801.36')).toBeOnTheScreen();
  });

  it('shows nothing, and asks for no rate, while the display currency is the holding’s own', async () => {
    const getQuote = await render('USD');

    expect(screen.getByText('none')).toBeOnTheScreen();
    expect(getQuote).not.toHaveBeenCalled();
  });

  it('shows nothing before there is a holding to convert', async () => {
    await render('NGN', {});

    expect(screen.getByText('none')).toBeOnTheScreen();
  });
});
