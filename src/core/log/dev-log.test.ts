import { devLog, setLogSink } from './dev-log';

const lines: string[] = [];

beforeEach(() => {
  lines.length = 0;
  setLogSink((line) => lines.push(line));
});

afterEach(() => {
  setLogSink(() => undefined);
});

describe('devLog', () => {
  it('writes a scoped line', () => {
    devLog('http', 'GET /user/wallets');

    expect(lines).toEqual(['[http] GET /user/wallets']);
  });

  it('appends fields as key=value', () => {
    devLog('http', 'GET /user/wallets', { status: 200, ms: 312 });

    expect(lines).toEqual(['[http] GET /user/wallets status=200 ms=312']);
  });

  it('writes nothing extra when there are no fields', () => {
    devLog('wallet', 'check gave up', {});

    expect(lines).toEqual(['[wallet] check gave up']);
  });

  it('says nothing outside a development build', () => {
    const host = globalThis as typeof globalThis & { __DEV__: boolean };
    const wasDev = host.__DEV__;
    host.__DEV__ = false;

    try {
      devLog('http', 'GET /user/wallets', { status: 200 });
    } finally {
      host.__DEV__ = wasDev;
    }

    expect(lines).toEqual([]);
  });
});
