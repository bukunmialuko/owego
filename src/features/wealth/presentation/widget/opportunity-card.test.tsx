import { screen } from '@testing-library/react-native';
import { View } from 'react-native';
import { darkTheme, lightTheme } from '@/core/design-system';
import { renderWithProviders } from '@/test/render-with-providers';
import { OpportunityCard } from './opportunity-card';

function Glyph() {
  return <View />;
}

describe('OpportunityCard', () => {
  it.each([
    ['yield', 'light', lightTheme, 'fillWealthYield'],
    ['yield', 'dark', darkTheme, 'fillWealthYield'],
    ['credit', 'light', lightTheme, 'fillWealthCredit'],
    ['credit', 'dark', darkTheme, 'fillWealthCredit'],
    ['investment', 'light', lightTheme, 'fillWealthInvestment'],
    ['investment', 'dark', darkTheme, 'fillWealthInvestment'],
  ] as const)('grounds the %s tile in its own fill in %s mode', async (tone, mode, theme, fill) => {
    await renderWithProviders(
      <OpportunityCard label="Label" title="Title" tone={tone} glyph={Glyph} onPress={jest.fn()} />,
      { theme: mode },
    );

    expect(await screen.findByRole('button', { name: 'Label, Title' })).toHaveStyle({
      backgroundColor: theme.color[fill],
    });
  });

  it.each([
    ['light', lightTheme],
    ['dark', darkTheme],
  ] as const)('sets every title in primary text in %s mode', async (mode, theme) => {
    await renderWithProviders(
      <OpportunityCard
        label="Yield"
        title="Earn up to 4.6% on idle USDC"
        tone="yield"
        glyph={Glyph}
        onPress={jest.fn()}
      />,
      { theme: mode },
    );

    expect(await screen.findByText('Earn up to 4.6% on idle USDC')).toHaveStyle({
      color: theme.color.textPrimary,
    });
    expect(screen.getByText('Yield')).toHaveStyle({ color: theme.color.textWealthEyebrow });
  });
});
