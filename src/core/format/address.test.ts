import { addressMark, truncateAddress } from './address';

describe('truncateAddress', () => {
  it('keeps both ends so the address stays recognisable', () => {
    expect(truncateAddress('0xb249000000000000000000000000000000003901')).toBe('0xb249…3901');
  });

  it('leaves a short address alone rather than truncating it to nothing', () => {
    expect(truncateAddress('0xb249')).toBe('0xb249');
  });

  it('truncates from the head alone when no tail is asked for', () => {
    expect(truncateAddress('Axxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx1', 26, 0)).toBe(
      'Axxxxxxxxxxxxxxxxxxxxxxxxx…',
    );
  });

  it('takes a wider window when a caller has the room', () => {
    expect(truncateAddress('Axxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx1', 10, 4)).toBe(
      'Axxxxxxxxx…xxx1',
    );
  });
});

describe('addressMark', () => {
  it.each([
    ['Axxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx1', 'AX'],
    ['0xb249000000000000000000000000000000003901', '0X'],
  ])('marks %p as %p', (address, expected) => {
    expect(addressMark(address)).toBe(expected);
  });
});
