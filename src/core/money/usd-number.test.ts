import { usdToMinorDown, usdToMinorNearest, usdToMinorUp } from './usd-number';

describe('usd to cents', () => {
  it.each([
    [150.8547, 15_085],
    [100.29, 10_029],
    [5136.989, 513_698],
    [0.0099, 0],
    [0, 0],
  ])('rounds %p down to %p — a holding never shows money that is not there', (usd, cents) => {
    expect(usdToMinorDown(usd)).toBe(cents);
  });

  it.each([
    [0.2501, 26],
    [0.25, 25],
    [100.29, 10_029],
    [0.0001, 1],
    [0, 0],
  ])('rounds %p up to %p — a fee is never understated', (usd, cents) => {
    expect(usdToMinorUp(usd)).toBe(cents);
  });

  it.each([
    [0.8547, 85],
    [0.855, 86],
    [-4.1, -410],
    [100.29, 10_029],
  ])('rounds %p to the nearest, %p', (usd, cents) => {
    expect(usdToMinorNearest(usd)).toBe(cents);
  });
});
