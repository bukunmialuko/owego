import {
  all,
  andThen,
  err,
  fromPromise,
  isErr,
  isOk,
  map,
  mapErr,
  match,
  ok,
  unwrapOr,
} from './result';

describe('Result', () => {
  it('carries a value on ok and an error on err', () => {
    expect(ok(1)).toEqual({ ok: true, value: 1 });
    expect(err('boom')).toEqual({ ok: false, error: 'boom' });
  });

  it('narrows through isOk and isErr', () => {
    const success = ok(1);
    const failure = err('boom');

    expect(isOk(success)).toBe(true);
    expect(isErr(success)).toBe(false);
    expect(isOk(failure)).toBe(false);
    expect(isErr(failure)).toBe(true);
  });

  describe('map', () => {
    it('transforms the value', () => {
      expect(map(ok(2), (n) => n * 3)).toEqual(ok(6));
    });

    it('leaves an error untouched', () => {
      expect(map(err('boom'), (n: number) => n * 3)).toEqual(err('boom'));
    });
  });

  describe('mapErr', () => {
    it('transforms the error', () => {
      expect(mapErr(err('boom'), (e) => `${e}!`)).toEqual(err('boom!'));
    });

    it('leaves a value untouched', () => {
      expect(mapErr(ok(2), (e: string) => `${e}!`)).toEqual(ok(2));
    });
  });

  describe('andThen', () => {
    it('chains successful steps', () => {
      expect(andThen(ok(2), (n) => ok(n + 1))).toEqual(ok(3));
    });

    it('short-circuits on the first error', () => {
      const step = jest.fn();
      expect(andThen(err('boom'), step)).toEqual(err('boom'));
      expect(step).not.toHaveBeenCalled();
    });

    it('propagates an error raised by the step', () => {
      expect(andThen(ok(2), () => err('later'))).toEqual(err('later'));
    });
  });

  describe('match', () => {
    it('runs the ok branch', () => {
      expect(match(ok(2), { ok: (n) => `v${n}`, err: (e: string) => `e${e}` })).toBe('v2');
    });

    it('runs the err branch', () => {
      expect(match(err('x'), { ok: (n: number) => `v${n}`, err: (e) => `e${e}` })).toBe('ex');
    });
  });

  describe('unwrapOr', () => {
    it('returns the value when ok', () => {
      expect(unwrapOr(ok(2), 99)).toBe(2);
    });

    it('returns the fallback when err', () => {
      expect(unwrapOr(err('boom'), 99)).toBe(99);
    });
  });

  describe('all', () => {
    it('collects values when every result is ok', () => {
      expect(all([ok(1), ok(2), ok(3)])).toEqual(ok([1, 2, 3]));
    });

    it('returns the first error', () => {
      expect(all([ok(1), err('first'), err('second')])).toEqual(err('first'));
    });

    it('treats an empty list as ok', () => {
      expect(all([])).toEqual(ok([]));
    });
  });

  describe('fromPromise', () => {
    it('wraps a resolved promise', async () => {
      await expect(fromPromise(Promise.resolve(1), () => 'mapped')).resolves.toEqual(ok(1));
    });

    it('maps a rejection through the handler', async () => {
      const thrown = new Error('network down');

      await expect(
        fromPromise(Promise.reject(thrown), (e) => (e as Error).message),
      ).resolves.toEqual(err('network down'));
    });
  });
});
