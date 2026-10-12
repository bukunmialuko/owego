import { screen, userEvent } from '@testing-library/react-native';
import { lightTheme } from '@/core/design-system';
import { renderWithProviders } from '@/test/render-with-providers';
import { DropdownMenu } from './dropdown-menu';
import { ListRow } from './list-row';
import { SelectSheet } from './select-sheet';

jest.useFakeTimers();

const ANCHOR = { x: 16, y: 100, width: 160, height: 40 };

const TOKENS = [
  { id: 'USDC', title: 'USDC', subtitle: '5,136.98 USDC' },
  { id: 'USDT', title: 'USDT', subtitle: '5,136.98 USDT' },
];

describe('DropdownMenu', () => {
  it('lists each option with its balance', async () => {
    await renderWithProviders(
      <DropdownMenu
        isOpen
        anchor={ANCHOR}
        options={TOKENS}
        selectedId="USDC"
        closeLabel="Close"
        onSelect={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    expect(await screen.findByRole('button', { name: 'USDC, 5,136.98 USDC' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'USDT, 5,136.98 USDT' })).toBeOnTheScreen();
  });

  it('announces which option is chosen', async () => {
    await renderWithProviders(
      <DropdownMenu
        isOpen
        anchor={ANCHOR}
        options={TOKENS}
        selectedId="USDC"
        closeLabel="Close"
        onSelect={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    expect(await screen.findByRole('button', { name: /^USDC/ })).toBeSelected();
    expect(screen.getByRole('button', { name: /^USDT/ })).not.toBeSelected();
  });

  it('calls back with the option that was pressed', async () => {
    const user = userEvent.setup();
    const onSelect = jest.fn();
    await renderWithProviders(
      <DropdownMenu
        isOpen
        anchor={ANCHOR}
        options={TOKENS}
        closeLabel="Close"
        onSelect={onSelect}
        onClose={jest.fn()}
      />,
    );

    await user.press(await screen.findByRole('button', { name: /^USDT/ }));

    expect(onSelect).toHaveBeenCalledWith('USDT');
  });

  it('says why there is nothing to choose instead of opening an empty panel', async () => {
    await renderWithProviders(
      <DropdownMenu
        isOpen
        anchor={ANCHOR}
        options={[]}
        emptyMessage="No wallets to send from yet"
        closeLabel="Close"
        onSelect={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    expect(await screen.findByText('No wallets to send from yet')).toBeOnTheScreen();
  });

  it('hangs the panel just below the trigger, in window coordinates', async () => {
    await renderWithProviders(
      <DropdownMenu
        isOpen
        anchor={ANCHOR}
        options={TOKENS}
        closeLabel="Close"
        onSelect={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    expect(await screen.findByTestId('dropdown-menu-panel')).toHaveStyle({
      top: ANCHOR.y + ANCHOR.height + lightTheme.spacing.xs,
      left: ANCHOR.x,
    });
  });

  it('renders nothing without an anchor', async () => {
    await renderWithProviders(
      <DropdownMenu
        isOpen
        anchor={undefined}
        options={TOKENS}
        closeLabel="Close"
        onSelect={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    expect(screen.queryByRole('button', { name: /USDC/ })).not.toBeOnTheScreen();
  });
});

describe('ListRow selection', () => {
  it('announces an unchosen row as unselected', async () => {
    await renderWithProviders(
      <ListRow title="United States Dollar" subtitle="USD" hasChevron onPress={jest.fn()} />,
    );

    expect(
      await screen.findByRole('button', { name: 'United States Dollar, USD' }),
    ).not.toBeSelected();
  });

  it('announces a chosen row as selected', async () => {
    await renderWithProviders(
      <ListRow
        title="United States Dollar"
        subtitle="USD"
        hasChevron
        selected
        onPress={jest.fn()}
      />,
    );

    expect(await screen.findByRole('button', { name: 'United States Dollar, USD' })).toBeSelected();
  });
});

describe('SelectSheet search', () => {
  const CURRENCIES = [
    { id: 'USD', title: 'United States Dollar', subtitle: 'USD' },
    { id: 'NGN', title: 'Nigerian Naira', subtitle: 'NGN' },
    { id: 'KES', title: 'Kenyan Shilling', subtitle: 'KES' },
  ];

  function renderSheet() {
    return renderWithProviders(
      <SelectSheet
        isOpen
        title="Select currency"
        closeLabel="Close"
        emptyMessage="Nothing found"
        searchPlaceholder="Search..."
        options={CURRENCIES}
        onSelect={jest.fn()}
        onClose={jest.fn()}
      />,
    );
  }

  it('filters on the name', async () => {
    const user = userEvent.setup();
    await renderSheet();

    await user.type(await screen.findByLabelText('Search...'), 'naira');

    expect(screen.getByText('Nigerian Naira')).toBeOnTheScreen();
    expect(screen.queryByText('United States Dollar')).not.toBeOnTheScreen();
  });

  it('filters on the code', async () => {
    const user = userEvent.setup();
    await renderSheet();

    await user.type(await screen.findByLabelText('Search...'), 'kes');

    expect(screen.getByText('Kenyan Shilling')).toBeOnTheScreen();
    expect(screen.queryByText('Nigerian Naira')).not.toBeOnTheScreen();
  });

  it('says so when nothing matches, rather than showing an empty list', async () => {
    const user = userEvent.setup();
    await renderSheet();

    await user.type(await screen.findByLabelText('Search...'), 'zzz');

    expect(screen.getByText('Nothing found')).toBeOnTheScreen();
  });

  it('has no search field unless one is asked for', async () => {
    await renderWithProviders(
      <SelectSheet
        isOpen
        title="Select network"
        closeLabel="Close"
        emptyMessage="None"
        options={CURRENCIES}
        onSelect={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    expect(screen.queryByLabelText('Search...')).not.toBeOnTheScreen();
  });
});
