import { screen } from '@testing-library/react-native';
import { renderWithProviders } from '@/test/render-with-providers';
import { AssetMark } from './asset-mark';

describe('AssetMark', () => {
  it('draws a raster logo in the corner badge', async () => {
    await renderWithProviders(<AssetMark symbol="USDC" badgeSymbol="JUPITER" />);

    expect(
      screen.getByTestId('asset-mark-raster', { includeHiddenElements: true }),
    ).toBeOnTheScreen();
  });

  it('falls back to the first two letters for a symbol it has no art for', async () => {
    await renderWithProviders(<AssetMark symbol="4k3Dyj" />);

    expect(screen.getByText('4K', { includeHiddenElements: true })).toBeOnTheScreen();
  });
});
