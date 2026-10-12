import { screen, userEvent } from '@testing-library/react-native';
import OwegoSymbol from '@/assets/icons/owego-symbol.svg';
import { darkTheme, lightTheme } from '@/core/design-system';
import { renderWithProviders } from '@/test/render-with-providers';
import { Fab } from './fab';

describe('Fab', () => {
  it('announces what it does and does it when pressed', async () => {
    const user = userEvent.setup();
    const onPress = jest.fn();
    await renderWithProviders(<Fab label="Add beneficiary" icon="add" onPress={onPress} />);

    await user.press(screen.getByRole('button', { name: 'Add beneficiary' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('is the round elevated button the designs draw', async () => {
    await renderWithProviders(<Fab label="Add beneficiary" icon="add" onPress={jest.fn()} />);

    expect(screen.getByRole('button', { name: 'Add beneficiary' })).toHaveStyle({
      backgroundColor: lightTheme.color.fillActionElevated,
      height: lightTheme.size.fab,
      width: lightTheme.size.fab,
      borderRadius: lightTheme.radius.pill,
    });
  });

  it.each([
    ['light', lightTheme],
    ['dark', darkTheme],
  ] as const)('draws a mark on the raised surface of the %s theme', async (mode, theme) => {
    await renderWithProviders(
      <Fab label="Quick actions" mark={OwegoSymbol} onPress={jest.fn()} />,
      { theme: mode },
    );

    expect(screen.getByRole('button', { name: 'Quick actions' })).toHaveStyle({
      backgroundColor: theme.color.bgSurfaceRaised,
    });
    expect(screen.getByTestId('fab-mark')).toHaveProp('width', theme.size.icon.lg);
    expect(screen.getByTestId('fab-mark')).toHaveProp('height', theme.size.icon.lg);
  });
});
