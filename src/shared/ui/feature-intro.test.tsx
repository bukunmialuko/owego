import { screen, userEvent } from '@testing-library/react-native';
import type { ComponentProps } from 'react';
import type { SvgProps } from 'react-native-svg';
import { darkTheme, lightTheme } from '@/core/design-system';
import { renderWithProviders } from '@/test/render-with-providers';
import { FeatureIntro } from './feature-intro';

const glyphColors: SvgProps['color'][] = [];

function Glyph({ color }: SvgProps) {
  glyphColors.push(color);

  return null;
}

type IntroProps = ComponentProps<typeof FeatureIntro>;

function renderIntro(overrides: Partial<IntroProps> = {}, theme: 'light' | 'dark' = 'light') {
  return renderWithProviders(
    <FeatureIntro
      hero={() => null}
      heroRatio={1}
      heroLabel="Hero"
      benefits={[{ id: 'one', glyph: Glyph, title: 'Benefit', description: 'Detail' }]}
      disclosure="Small print."
      actionLabel="Continue"
      onContinue={jest.fn()}
      {...overrides}
    />,
    { theme },
  );
}

function textsInOrder(): string[] {
  const texts: string[] = [];

  const walk = (node: unknown): void => {
    if (typeof node === 'string') {
      texts.push(node);
      return;
    }
    if (node === null || typeof node !== 'object') return;
    (node as { children?: unknown[] }).children?.forEach(walk);
  };
  walk(screen.toJSON());

  return texts;
}

describe('FeatureIntro', () => {
  beforeEach(() => {
    glyphColors.length = 0;
  });

  it('puts the small print below the action by default', async () => {
    await renderIntro();
    const texts = textsInOrder();

    expect(texts.indexOf('Continue')).toBeLessThan(texts.indexOf('Small print.'));
  });

  it('puts the small print above the action when asked to', async () => {
    await renderIntro({ smallPrintPlacement: 'aboveAction' });
    const texts = textsInOrder();

    expect(texts.indexOf('Small print.')).toBeLessThan(texts.indexOf('Continue'));
  });

  it('reads the link and its trailing words as one sentence, and opens the link on a tap', async () => {
    const onPress = jest.fn();
    await renderIntro({
      disclosureLink: { label: 'Terms & conditions', suffix: 'apply', onPress },
    });

    expect(screen.getByText('Terms & conditions apply')).toBeOnTheScreen();

    await userEvent.setup().press(screen.getByText('Terms & conditions'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['light', lightTheme],
    ['dark', darkTheme],
  ] as const)('paints the benefit glyphs in the benefit colour in %s mode', async (mode, theme) => {
    await renderIntro({}, mode);

    expect(glyphColors.at(-1)).toBe(theme.color.iconBenefit);
  });
});
