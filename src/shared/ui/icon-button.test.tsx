import { screen } from '@testing-library/react-native';
import { darkTheme, lightTheme } from '@/core/design-system';
import { renderWithProviders } from '@/test/render-with-providers';
import { IconButton } from './icon-button';

describe('IconButton', () => {
  it.each([
    ['grey by default', 'light', undefined, lightTheme.color.fillNeutral],
    ['white on the canvas when surface', 'light', 'surface', lightTheme.color.bgSurface],
    ['white over artwork in light', 'light', 'onTint', lightTheme.color.fillOnTint],
    ['black over artwork in dark', 'dark', 'onTint', darkTheme.color.fillOnTint],
  ] as const)('paints its disc %s', async (_name, theme, tone, backgroundColor) => {
    await renderWithProviders(
      <IconButton
        icon="close"
        label="Close"
        onPress={jest.fn()}
        {...(tone === undefined ? {} : { tone })}
      />,
      { theme },
    );

    expect(screen.getByRole('button', { name: 'Close' })).toHaveStyle({ backgroundColor });
  });
});
