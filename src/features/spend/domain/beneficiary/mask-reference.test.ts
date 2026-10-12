import { maskReference } from './mask-reference';

describe('maskReference', () => {
  it.each([
    ['an account number', '0123456789', '**6789'],
    ['a phone number', '+254712345678', '**5678'],
    ['an account number with spaces', '0312 3456 7890', '**7890'],
  ])('keeps only the last four digits of %s', (_case, reference, masked) => {
    expect(maskReference(reference)).toBe(masked);
  });

  it('keeps the first letter and the domain of an email', () => {
    expect(maskReference('precious.james@mail.com')).toBe('p•••@mail.com');
  });

  it('leaves a reference too short to hide anything as it is', () => {
    expect(maskReference('1028')).toBe('1028');
  });

  it('leaves an empty reference empty', () => {
    expect(maskReference('')).toBe('');
  });
});
