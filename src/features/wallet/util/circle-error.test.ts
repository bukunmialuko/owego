import { flattenCircleErrorMessage } from './circle-error';

describe('flattenCircleErrorMessage', () => {
  it('strips the leading numeric code', () => {
    expect(flattenCircleErrorMessage('(155706) Pin is incorrect')).toBe('Pin is incorrect');
  });

  it('takes the innermost cause after an arrow', () => {
    expect(flattenCircleErrorMessage('Outer failure → (404) Challenge not found')).toBe(
      'Challenge not found',
    );
  });

  it('collapses a multi-line message onto one line', () => {
    expect(flattenCircleErrorMessage('Something\nbroke')).toBe('Something broke');
  });

  it('handles a chain of causes by taking the last', () => {
    expect(flattenCircleErrorMessage('a → b → (1) c')).toBe('c');
  });

  it('passes a plain message through untouched', () => {
    expect(flattenCircleErrorMessage('Network unavailable')).toBe('Network unavailable');
  });

  it('reports nothing for an empty message', () => {
    expect(flattenCircleErrorMessage('')).toBeUndefined();
  });

  it('reports nothing when only a code was given', () => {
    expect(flattenCircleErrorMessage('(1234)')).toBeUndefined();
  });

  it('reports nothing for whitespace', () => {
    expect(flattenCircleErrorMessage('  \n  ')).toBeUndefined();
  });
});
