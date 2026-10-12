import { screen } from '@testing-library/react-native';
import { renderWithProviders } from '@/test/render-with-providers';
import { DisclosureChevron } from './disclosure-chevron';

function rotation(): unknown {
  const turned = screen.getByTestId('disclosure-chevron', { includeHiddenElements: true });

  return turned.props['style'];
}

describe('DisclosureChevron', () => {
  it.each([
    [false, '0deg'],
    [true, '90deg'],
  ])('points %s open at %s', async (isExpanded, angle) => {
    await renderWithProviders(<DisclosureChevron isExpanded={isExpanded} />);

    expect(rotation()).toEqual(expect.objectContaining({ transform: [{ rotate: angle }] }));
  });
});
