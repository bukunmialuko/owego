import { apcaContrast, pickForeground } from './apca';

describe('apcaContrast', () => {
  it.each([
    ['#888888', '#FFFFFF', 63.056],
    ['#FFFFFF', '#888888', -68.541],
    ['#000000', '#AAAAAA', 58.146],
    ['#AAAAAA', '#000000', -56.241],
    ['#112233', '#DDEEFF', 91.668],
    ['#DDEEFF', '#112233', -93.068],
    ['#000000', '#FFFFFF', 106.041],
    ['#FFFFFF', '#000000', -107.885],
  ])('reproduces the APCA reference contrast of %s on %s', (text, background, lc) => {
    expect(apcaContrast(text, background)).toBeCloseTo(lc, 2);
  });

  it('reads colours too close to separate as no contrast', () => {
    expect(apcaContrast('#777777', '#777777')).toBe(0);
    expect(apcaContrast('#7A7A7A', '#777777')).toBe(0);
    expect(apcaContrast('#777777', '#7A7A7A')).toBe(0);
  });

  it.each(['#FFF', 'rgba(0, 0, 0, 0.6)', 'red', '#GGGGGG'])(
    'rejects %s, which is not #RRGGBB',
    (colour) => {
      expect(() => apcaContrast(colour, '#FFFFFF')).toThrow(RangeError);
      expect(() => apcaContrast('#FFFFFF', colour)).toThrow(RangeError);
    },
  );
});

describe('pickForeground', () => {
  const candidates = { light: '#FFFFFF', dark: '#171B24' };

  it('picks dark text on a light ground and light text on a dark one', () => {
    expect(pickForeground('#FFFFFF', candidates)).toBe('dark');
    expect(pickForeground('#000000', candidates)).toBe('light');
  });

  it('picks light text on a saturated mid-tone WCAG 2 would give dark text', () => {
    expect(pickForeground('#EF4178', candidates)).toBe('light');
  });

  it('prefers dark text when both read equally', () => {
    expect(pickForeground('#777777', { light: '#777777', dark: '#777777' })).toBe('dark');
  });
});
