import { screen } from '@testing-library/react-native';
import { lightTheme } from '@/core/design-system';
import { renderWithProviders } from '@/test/render-with-providers';
import { AvatarSilhouette } from './avatar-silhouette';

describe('AvatarSilhouette', () => {
  it('hides the silhouette from screen readers', async () => {
    await renderWithProviders(<AvatarSilhouette size="lg" />);

    expect(
      await screen.findByTestId('avatar-silhouette', { includeHiddenElements: true }),
    ).toHaveStyle({
      backgroundColor: lightTheme.color.fillAvatarSilhouette,
      width: lightTheme.size.avatar.lg,
      height: lightTheme.size.avatar.lg,
    });
    expect(screen.queryByTestId('avatar-silhouette')).toBeNull();
  });

  it('draws at an explicit diameter when given one', async () => {
    await renderWithProviders(<AvatarSilhouette diameter={104} />);

    expect(
      await screen.findByTestId('avatar-silhouette', { includeHiddenElements: true }),
    ).toHaveStyle({ width: 104, height: 104 });
  });

  it("draws the silhouette's shoulders as an ellipse", async () => {
    await renderWithProviders(<AvatarSilhouette />);

    const shoulders = await screen.findByTestId('avatar-silhouette-shoulders', {
      includeHiddenElements: true,
    });

    expect(shoulders).toHaveProp('rx', 38.5);
    expect(shoulders).toHaveProp('ry', 23.5);
  });
});
