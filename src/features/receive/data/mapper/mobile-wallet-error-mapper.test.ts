import { connectFailureFor, depositOutcomeForError } from './mobile-wallet-error-mapper';

const CHOOSER_DISMISSED = 'Session not established: Local association cancelled by user';
const NEVER_ANSWERED = 'Timed out waiting for local association to be ready';
const NO_RESPONSE = 'Timed out waiting for response';

describe('connectFailureFor', () => {
  it.each([
    ['ERROR_WALLET_NOT_FOUND', 'noWallet'],
    [CHOOSER_DISMISSED, 'cancelled'],
    [-1, 'cancelled'],
    [NEVER_ANSWERED, 'unreachable'],
    [NO_RESPONSE, 'unreachable'],
  ] as const)('reads %s as %s', (code, failure) => {
    expect(connectFailureFor(code)).toBe(failure);
  });

  it('leaves an error it does not know unexplained', () => {
    expect(connectFailureFor('EUNSPECIFIED')).toBeUndefined();
  });
});

describe('depositOutcomeForError', () => {
  describe('before the wallet is asked to sign', () => {
    it.each([
      ['ERROR_WALLET_NOT_FOUND', 'noWallet'],
      [CHOOSER_DISMISSED, 'declined'],
      [-1, 'authorizationExpired'],
      [NEVER_ANSWERED, 'unreachable'],
      [NO_RESPONSE, 'unreachable'],
    ] as const)('reads %s as not sent: %s', (code, reason) => {
      expect(depositOutcomeForError(code, 'beforeDispatch')).toEqual({ type: 'notSent', reason });
    });

    it.each(['EUNSPECIFIED', undefined])(
      'leaves %s unexplained, so it reads as nothing having moved',
      (code) => {
        expect(depositOutcomeForError(code, 'beforeDispatch')).toBeUndefined();
      },
    );
  });

  describe('after the wallet is asked to sign', () => {
    it.each([
      [-3, 'declined'],
      [-4, 'notSubmitted'],
      [-2, 'invalidRequest'],
      [-5, 'invalidRequest'],
      [-1, 'authorizationExpired'],
    ] as const)('reads protocol error %s as not sent: %s', (code, reason) => {
      expect(depositOutcomeForError(code, 'afterDispatch')).toEqual({ type: 'notSent', reason });
    });

    it.each([
      NO_RESPONSE,
      'ERROR_SESSION_CLOSED',
      'EUNSPECIFIED',
      CHOOSER_DISMISSED,
      -100,
      undefined,
    ])('reads %s as unconfirmed', (code) => {
      expect(depositOutcomeForError(code, 'afterDispatch')).toEqual({ type: 'unconfirmed' });
    });
  });
});
