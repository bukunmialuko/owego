import { groupByDay } from './group-by-day';

type Row = { id: string; at: string };

const NOW = new Date('2026-09-10T12:00:00.000Z');

function group(rows: Row[], now = NOW) {
  return groupByDay(rows, (row) => row.at, 'en-GB', now);
}

describe('groupByDay', () => {
  it('returns nothing for an empty list', () => {
    expect(group([])).toEqual([]);
  });

  it("keeps one day's items together in the order they arrived", () => {
    const groups = group([
      { id: 'a', at: '2026-09-10T23:17:00.000Z' },
      { id: 'b', at: '2026-09-10T09:05:00.000Z' },
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0]?.items.map((row) => row.id)).toEqual(['a', 'b']);
  });

  it('opens a new group when the calendar day changes', () => {
    const groups = group([
      { id: 'a', at: '2026-09-10T09:05:00.000Z' },
      { id: 'b', at: '2026-09-09T18:42:00.000Z' },
    ]);

    expect(groups.map((day) => day.items.map((row) => row.id))).toEqual([['a'], ['b']]);
  });

  it('labels today and yesterday, and dates anything older', () => {
    const groups = group([
      { id: 'a', at: '2026-09-10T09:05:00.000Z' },
      { id: 'b', at: '2026-09-09T09:05:00.000Z' },
      { id: 'c', at: '2026-08-12T09:05:00.000Z' },
    ]);

    expect(groups.map((day) => day.dayKey)).toEqual([
      'common.today',
      'common.yesterday',
      undefined,
    ]);
    expect(groups[2]?.day).toBe('12 Aug');
  });

  it('splits two items an hour apart that fall either side of midnight', () => {
    const groups = group([
      { id: 'a', at: '2026-09-10T00:30:00.000Z' },
      { id: 'b', at: '2026-09-09T23:30:00.000Z' },
    ]);

    expect(groups).toHaveLength(2);
  });

  it('keys a group by its date, so the same label a year apart does not merge', () => {
    const groups = group([
      { id: 'a', at: '2026-08-12T09:05:00.000Z' },
      { id: 'b', at: '2025-08-12T09:05:00.000Z' },
    ]);

    expect(groups).toHaveLength(2);
    expect(groups[0]?.key).not.toBe(groups[1]?.key);
    expect(groups[0]?.day).toBe(groups[1]?.day);
  });

  it('skips an item whose timestamp cannot be read rather than heading a group with nothing', () => {
    const groups = group([
      { id: 'a', at: 'not-a-date' },
      { id: 'b', at: '2026-09-10T09:05:00.000Z' },
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0]?.items.map((row) => row.id)).toEqual(['b']);
  });
});
