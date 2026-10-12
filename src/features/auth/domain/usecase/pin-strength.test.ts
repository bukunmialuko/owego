import { checkPinStrength } from './pin-strength';

describe('checkPinStrength', () => {
  it.each(['1357', '2846', '9042', '4813'])('accepts %s', (pin) => {
    expect(checkPinStrength(pin)).toBeUndefined();
  });

  it.each(['0000', '1111', '9999'])('rejects %s as repeated', (pin) => {
    expect(checkPinStrength(pin)).toBe('repeated');
  });

  it.each(['1234', '3456', '6789'])('rejects %s as consecutive', (pin) => {
    expect(checkPinStrength(pin)).toBe('consecutive');
  });

  it.each(['4321', '9876'])('rejects %s as consecutive too', (pin) => {
    expect(checkPinStrength(pin)).toBe('consecutive');
  });

  it.each(['123', '12345', ''])('rejects %p for its length', (pin) => {
    expect(checkPinStrength(pin)).toBe('wrong-length');
  });

  it.each(['12a4', 'abcd', '12 4'])('rejects %p as non-numeric', (pin) => {
    expect(checkPinStrength(pin)).toBe('not-numeric');
  });

  it('accepts a sequence that wraps past nine', () => {
    expect(checkPinStrength('9012')).toBeUndefined();
  });
});
