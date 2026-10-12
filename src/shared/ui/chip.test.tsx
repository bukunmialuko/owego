import { screen, userEvent } from '@testing-library/react-native';
import { renderWithProviders } from '@/test/render-with-providers';
import { Chip } from './chip';
import { Switch } from './switch';

jest.useFakeTimers();

describe('Chip', () => {
  it('calls back when pressed', async () => {
    const user = userEvent.setup();
    const onPress = jest.fn();
    await renderWithProviders(<Chip label="USDC" onPress={onPress} />);

    await user.press(await screen.findByRole('button', { name: 'USDC' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('announces as text when it has nowhere to go', async () => {
    await renderWithProviders(<Chip label="$5,136.98" />);

    expect(await screen.findByLabelText('$5,136.98')).toBeOnTheScreen();
    expect(screen.queryByRole('button')).not.toBeOnTheScreen();
  });

  it('announces the label it is given rather than its visible text', async () => {
    await renderWithProviders(
      <Chip label="USDC" accessibilityLabel="Token, USDC" onPress={jest.fn()} />,
    );

    expect(await screen.findByRole('button', { name: 'Token, USDC' })).toBeOnTheScreen();
  });

  it('announces whether the menu it opens is showing', async () => {
    await renderWithProviders(<Chip label="USDC" hasChevron isExpanded onPress={jest.fn()} />);

    expect(await screen.findByRole('button', { name: 'USDC' })).toBeExpanded();
  });

  it('announces a closed menu as collapsed', async () => {
    await renderWithProviders(
      <Chip label="USDC" hasChevron isExpanded={false} onPress={jest.fn()} />,
    );

    expect(await screen.findByRole('button', { name: 'USDC' })).toBeCollapsed();
  });
});

describe('Switch', () => {
  it('announces as a switch carrying its state', async () => {
    await renderWithProviders(<Switch checked onChange={jest.fn()} label="Save as beneficiary" />);

    expect(await screen.findByRole('switch', { name: 'Save as beneficiary' })).toBeChecked();
  });

  it('toggles to the opposite of what it is showing', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    await renderWithProviders(<Switch checked onChange={onChange} label="Save" />);

    await user.press(await screen.findByRole('switch'));

    expect(onChange).toHaveBeenCalledWith(false);
  });

  it('does nothing while disabled', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    await renderWithProviders(<Switch checked={false} onChange={onChange} label="Save" disabled />);

    await user.press(await screen.findByRole('switch'));

    expect(onChange).not.toHaveBeenCalled();
  });
});
