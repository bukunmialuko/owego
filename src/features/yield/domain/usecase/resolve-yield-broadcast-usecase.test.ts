import { serverError, timeout } from '@/core/errors/app-error';
import { err, ok } from '@/core/result/result';
import { resolveYieldBroadcast } from './resolve-yield-broadcast-usecase';

describe('resolveYieldBroadcast', () => {
  it('reads a settled success as succeeded', () => {
    expect(resolveYieldBroadcast(ok('succeeded'))).toEqual({ type: 'succeeded' });
  });

  it('reads a pending settlement as processing', () => {
    expect(resolveYieldBroadcast(ok('pending'))).toEqual({ type: 'processing' });
  });

  it('reads a settled failure as failed on chain', () => {
    expect(resolveYieldBroadcast(ok('failed'))).toEqual({ type: 'failedOnChain' });
  });

  it('reads a status it does not know as unconfirmed', () => {
    expect(resolveYieldBroadcast(ok('unknown'))).toEqual({ type: 'unconfirmed' });
  });

  it.each([timeout(), serverError(502), serverError(400)])(
    'reads a broadcast that failed to answer (%p) as unconfirmed',
    (failure) => {
      expect(resolveYieldBroadcast(err(failure))).toEqual({ type: 'unconfirmed' });
    },
  );
});
