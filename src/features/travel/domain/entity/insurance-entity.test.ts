import { isTripValid, tripNights, type TripDetails } from './insurance-entity';

const TRIP: TripDetails = {
  destinationCode: 'ke',
  destinationName: 'Kenya',
  departure: '2026-08-14',
  returnDate: '2026-08-21',
  travellers: 1,
  tripCostMinor: 80_000,
  currency: 'USD',
};

describe('tripNights', () => {
  it('counts the nights between the two dates', () => {
    expect(tripNights(TRIP)).toBe(7);
  });

  it('does not drift across a daylight-saving boundary', () => {
    expect(tripNights({ departure: '2026-03-28', returnDate: '2026-03-30' })).toBe(2);
  });

  it('is zero rather than negative when the dates are the wrong way round', () => {
    expect(tripNights({ departure: '2026-08-21', returnDate: '2026-08-14' })).toBe(0);
  });

  it('is zero rather than NaN when a date is missing', () => {
    expect(tripNights({ departure: '', returnDate: '2026-08-21' })).toBe(0);
  });
});

describe('isTripValid', () => {
  it('accepts a fully described trip', () => {
    expect(isTripValid(TRIP)).toBe(true);
  });

  it.each([
    ['no destination', { destinationCode: '' }],
    ['no departure', { departure: '' }],
    ['no return', { returnDate: '' }],
    ['nobody travelling', { travellers: 0 }],
    ['no trip cost to insure', { tripCostMinor: 0 }],
  ])('rejects a trip with %s', (_case, override) => {
    expect(isTripValid({ ...TRIP, ...override })).toBe(false);
  });

  it('accepts a same-day return but rejects one before departure', () => {
    expect(isTripValid({ ...TRIP, returnDate: TRIP.departure })).toBe(true);
    expect(isTripValid({ ...TRIP, returnDate: '2026-08-13' })).toBe(false);
  });
});
