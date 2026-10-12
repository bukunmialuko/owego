import { screen } from '@testing-library/react-native';
import { lightTheme } from '@/core/design-system';
import { renderWithProviders } from '@/test/render-with-providers';
import { Avatar } from './avatar';

const circleOf = (initials: string) => screen.getByText(initials).parent;

describe('Avatar', () => {
  it('draws two initials on the brand tint by default', async () => {
    await renderWithProviders(<Avatar name="Hannah Nuggest" />);

    expect(circleOf('HN')).toHaveStyle({ backgroundColor: lightTheme.color.fillBrandSubtle });
  });

  it('draws on the success tint when asked, with initials that read on it', async () => {
    await renderWithProviders(<Avatar name="Precious Jameson" tint="successSubtle" />);

    expect(circleOf('PJ')).toHaveStyle({ backgroundColor: lightTheme.color.fillSuccessSubtle });
    expect(screen.getByText('PJ')).toHaveStyle({ color: lightTheme.color.textSuccess });
  });
});
