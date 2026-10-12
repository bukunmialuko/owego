import { screen, userEvent } from '@testing-library/react-native';
import { createTestContainer, renderWithProviders } from '@/test/render-with-providers';
import { EsimCatalogScreen } from './esim-catalog-screen';

jest.useFakeTimers();

function renderCatalog() {
  return renderWithProviders(<EsimCatalogScreen />, {
    withNavigation: true,
    container: createTestContainer(),
  });
}

describe('EsimCatalogScreen', () => {
  it('lists destinations with their plan count and cheapest price', async () => {
    await renderCatalog();

    expect(
      await screen.findByRole('button', { name: /Albania, 3 plans, from \$4.99/ }),
    ).toBeTruthy();
  });

  it('names the multi-country plan by how many countries it covers', async () => {
    await renderCatalog();

    expect(await screen.findByRole('button', { name: /Global \(137 countries\)/ })).toBeTruthy();
  });

  it('filters as the traveller types', async () => {
    const user = userEvent.setup();
    await renderCatalog();

    await user.type(await screen.findByLabelText('Search country or region'), 'alba');

    expect(await screen.findByRole('button', { name: /Albania/ })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Australia/ })).toBeNull();
  });

  it('matches on the country code as well as the name', async () => {
    const user = userEvent.setup();
    await renderCatalog();

    await user.type(await screen.findByLabelText('Search country or region'), 'us');

    expect(await screen.findByRole('button', { name: /USA/ })).toBeTruthy();
  });

  it('opens the plan sheet for a destination', async () => {
    const user = userEvent.setup();
    await renderCatalog();

    await user.press(await screen.findByRole('button', { name: /USA, 3 plans/ }));

    expect(await screen.findByText('USA eSIM')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Buy for \$4.5/ })).toBeTruthy();
  });

  it('spells out what happens after paying', async () => {
    const user = userEvent.setup();
    await renderCatalog();

    await user.press(await screen.findByRole('button', { name: /USA, 3 plans/ }));

    expect(await screen.findByText('Buy the plan')).toBeTruthy();
    expect(screen.getByText('Data switches on automatically when you land')).toBeTruthy();
  });
});
