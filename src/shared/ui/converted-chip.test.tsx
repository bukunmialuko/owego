import { screen } from '@testing-library/react-native';
import { renderWithProviders } from '@/test/render-with-providers';
import { ConvertedChip } from './converted-chip';

describe('ConvertedChip', () => {
  it('shows the converted figure beside its currency’s flag', async () => {
    await renderWithProviders(
      <ConvertedChip value={{ kind: 'converted', currency: 'NGN', label: '₦3,801.36' }} />,
    );

    expect(screen.getByText('₦3,801.36')).toBeOnTheScreen();
    expect(screen.getByText('🇳🇬')).toBeOnTheScreen();
  });

  it('holds its place while the rate loads', async () => {
    await renderWithProviders(<ConvertedChip value={{ kind: 'pending' }} />);

    expect(screen.getAllByTestId('skeleton', { includeHiddenElements: true })).toHaveLength(1);
  });
});
