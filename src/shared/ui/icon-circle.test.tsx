import { screen } from '@testing-library/react-native';
import { darkTheme } from '@/core/design-system';
import { renderWithProviders } from '@/test/render-with-providers';
import { IconCircle } from './icon-circle';

describe('IconCircle', () => {
  it('draws the accent glyph in the ink its gold carries, in dark mode too', async () => {
    await renderWithProviders(<IconCircle tone="accent" icon="gift" />, { theme: 'dark' });

    expect(JSON.stringify(screen.toJSON())).toContain(`"color":"${darkTheme.color.textOnAccent}"`);
  });
});
