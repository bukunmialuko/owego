import { createI18n } from './i18n';
import { formatDateTime, formatTransactionTime, localDateKey } from './relative-time';

const NOW = new Date('2026-08-19T12:00:00Z');

describe('formatTransactionTime', () => {
  it('names today', () => {
    expect(formatTransactionTime('2026-08-19T23:17:00Z', 'en-GB', NOW)).toEqual({
      dayKey: 'common.today',
      day: '',
      time: '23:17',
    });
  });

  it('names yesterday', () => {
    expect(formatTransactionTime('2026-08-18T09:05:00Z', 'en-GB', NOW).dayKey).toBe(
      'common.yesterday',
    );
  });

  it('counts calendar days rather than elapsed hours', () => {
    const justBeforeMidnight = formatTransactionTime('2026-08-18T23:59:00Z', 'en-GB', NOW);

    expect(justBeforeMidnight.dayKey).toBe('common.yesterday');
  });

  it('falls back to a date for anything older', () => {
    const older = formatTransactionTime('2026-08-01T09:05:00Z', 'en-GB', NOW);

    expect(older.dayKey).toBeUndefined();
    expect(older.day).toBe('1 Aug');
  });

  it('renders nothing for an unparseable timestamp', () => {
    expect(formatTransactionTime('not-a-date', 'en-GB', NOW)).toEqual({
      dayKey: undefined,
      day: '',
      time: '',
    });
  });
});

describe('formatDateTime', () => {
  const { t } = createI18n('en');

  it('prints the numeric date and the clock, joined by "at"', () => {
    expect(formatDateTime('2025-09-05T21:30:00Z', 'en-GB', t)).toBe('05/09/2025 at 21:30');
  });

  it('follows the locale’s own order and clock', () => {
    expect(formatDateTime('2025-09-05T21:30:00Z', 'en-US', t)).toBe('09/05/2025 at 09:30 PM');
  });

  it('prints nothing for a timestamp it cannot read', () => {
    expect(formatDateTime('', 'en-GB', t)).toBe('');
    expect(formatDateTime('not a date', 'en-GB', t)).toBe('');
  });
});

describe('localDateKey', () => {
  it('names the calendar date, zero-padded', () => {
    expect(localDateKey(new Date('2026-03-04T09:05:00Z'))).toBe('2026-03-04');
  });

  it('takes the date in the device zone, not the zone the timestamp was written in', () => {
    expect(localDateKey(new Date('2026-03-05T01:00:00+03:00'))).toBe('2026-03-04');
  });
});
