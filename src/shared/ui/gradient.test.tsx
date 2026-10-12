import { Text as RNText } from 'react-native';
import { screen } from '@testing-library/react-native';
import { renderWithProviders } from '@/test/render-with-providers';
import { Gradient } from './gradient';

describe('Gradient', () => {
  it('lets a touch through to whatever is beneath it', async () => {
    await renderWithProviders(
      <Gradient name="bottomFade">
        <RNText testID="over">Over the fade</RNText>
      </Gradient>,
    );

    expect((await screen.findByTestId('over')).parent).toHaveProp('pointerEvents', 'box-none');
  });

  it('rounds a gradient by clipping the view, not the painted rect', async () => {
    await renderWithProviders(
      <Gradient name="accentGold" radius={24}>
        <RNText testID="over">Earn</RNText>
      </Gradient>,
    );

    const wrapper = (await screen.findByTestId('over')).parent;

    expect(wrapper).toHaveStyle({ borderRadius: 24, overflow: 'hidden' });
    expect(JSON.stringify(screen.toJSON())).not.toContain('"rx"');
  });

  it('does not clip a gradient that has no radius', async () => {
    await renderWithProviders(
      <Gradient name="bottomFade">
        <RNText testID="over">Over the fade</RNText>
      </Gradient>,
    );

    expect((await screen.findByTestId('over')).parent).not.toHaveStyle({ overflow: 'hidden' });
  });

  it('still lays its children over the paint', async () => {
    await renderWithProviders(
      <Gradient name="successHeader">
        <RNText testID="over">Over the fade</RNText>
      </Gradient>,
    );

    expect(await screen.findByTestId('over')).toBeOnTheScreen();
  });
});
