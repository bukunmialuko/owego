import { KycState } from './onboarding-gate';
import { createSessionStore, type AdvanceableStage, type SessionUser } from './session-store';

const user: SessionUser = { id: 'u1', firstName: 'Precious', kycState: KycState.Approved };
const owesVerification: SessionUser = { ...user, kycState: KycState.NotStarted };

describe('session store', () => {
  it('starts in booting', () => {
    expect(createSessionStore().getState().status).toBe('booting');
  });

  it('reports an authenticated session at the stage it was signed in on', () => {
    const store = createSessionStore();

    store.getState().signedIn(user, 'kyc');

    expect(store.getState()).toMatchObject({ status: 'authenticated', user, stage: 'kyc' });
  });

  describe('bootstrapped', () => {
    it('reports no session when there was nothing to restore', () => {
      const store = createSessionStore();

      store.getState().bootstrapped({ session: undefined });

      expect(store.getState()).toMatchObject({ status: 'unauthenticated', user: undefined });
    });

    it('restores the session at its stage', () => {
      const store = createSessionStore();

      store.getState().bootstrapped({ session: { user, stage: 'create-wallet' } });

      expect(store.getState()).toMatchObject({
        status: 'authenticated',
        user,
        stage: 'create-wallet',
      });
    });

    it('carries the offline flag through', () => {
      const store = createSessionStore();

      store.getState().bootstrapped({ session: { user, stage: 'ready' }, offline: true });

      expect(store.getState().offline).toBe(true);
    });

    it('defaults offline to false', () => {
      const store = createSessionStore();

      store.getState().bootstrapped({ session: { user, stage: 'ready' } });

      expect(store.getState().offline).toBe(false);
    });
  });

  describe('onboarding stages', () => {
    it('advances without touching the session', () => {
      const store = createSessionStore();
      store.getState().signedIn(user, 'create-wallet');

      store.getState().stageAdvanced('provisioning');

      expect(store.getState()).toMatchObject({ status: 'authenticated', stage: 'provisioning' });
    });
  });

  describe('admitting a wallet holder', () => {
    it('offers verification to a wallet holder who still owes it', () => {
      const store = createSessionStore();
      store.getState().signedIn(owesVerification, 'secure-session');

      store.getState().walletHolderAdmitted({ hasSkippedKyc: false, keepsSession: true });

      expect(store.getState().stage).toBe('kyc');
    });

    it('admits a wallet holder who declined verification straight to home', () => {
      const store = createSessionStore();
      store.getState().signedIn(owesVerification, 'secure-session');

      store.getState().walletHolderAdmitted({ hasSkippedKyc: true, keepsSession: true });

      expect(store.getState().stage).toBe('ready');
    });

    it('admits a verified wallet holder straight to home', () => {
      const store = createSessionStore();
      store.getState().signedIn(user, 'secure-session');

      store.getState().walletHolderAdmitted({ hasSkippedKyc: false, keepsSession: true });

      expect(store.getState().stage).toBe('ready');
    });

    it('returns to verification after a lock taken during it', () => {
      const store = createSessionStore();
      store.getState().signedIn(owesVerification, 'secure-session');
      store.getState().walletHolderAdmitted({ hasSkippedKyc: false, keepsSession: true });

      store.getState().locked();
      store.getState().unlocked();

      expect(store.getState().stage).toBe('kyc');
    });

    it('admits nobody when nobody is signed in', () => {
      const store = createSessionStore();

      store.getState().walletHolderAdmitted({ hasSkippedKyc: false, keepsSession: true });

      expect(store.getState()).toMatchObject({ status: 'booting', stage: 'ready' });
    });

    it('reaches verification and the sign-in PIN only through the gate', () => {
      // @ts-expect-error verification is reached only through `walletHolderAdmitted`
      const kyc: AdvanceableStage = 'kyc';
      // @ts-expect-error the sign-in PIN is asked for only by the gate
      const secureSession: AdvanceableStage = 'secure-session';
      // @ts-expect-error locking has its own action, which remembers where to return
      const locked: AdvanceableStage = 'locked';

      expect([kyc, secureSession, locked]).toHaveLength(3);
    });
  });

  describe('declining the sign-in PIN', () => {
    it('asks a wallet holder whose session does not persist for a sign-in PIN', () => {
      const store = createSessionStore();
      store.getState().signedIn(owesVerification, 'provisioning');

      store.getState().walletHolderAdmitted({ hasSkippedKyc: false, keepsSession: false });

      expect(store.getState().stage).toBe('secure-session');
    });

    it('moves on once declined, for the rest of the session', () => {
      const store = createSessionStore();
      store.getState().signedIn(owesVerification, 'secure-session');

      store.getState().signInPinDeclined();
      store.getState().walletHolderAdmitted({ hasSkippedKyc: false, keepsSession: false });

      expect(store.getState().stage).toBe('kyc');
    });

    it('asks again after signing out and back in', () => {
      const store = createSessionStore();
      store.getState().signedIn(owesVerification, 'secure-session');
      store.getState().signInPinDeclined();

      store.getState().signedOut();
      store.getState().signedIn(owesVerification, 'secure-session');
      store.getState().walletHolderAdmitted({ hasSkippedKyc: false, keepsSession: false });

      expect(store.getState().stage).toBe('secure-session');
    });

    it('forgets a decline on a new boot', () => {
      const store = createSessionStore();
      store.getState().signedIn(owesVerification, 'secure-session');
      store.getState().signInPinDeclined();

      store.getState().bootstrapped({ session: { user: owesVerification, stage: 'ready' } });

      expect(store.getState().hasDeclinedSignInPin).toBe(false);
    });
  });

  describe('locking', () => {
    it('keeps the user signed in', () => {
      const store = createSessionStore();
      store.getState().signedIn(user, 'ready');

      store.getState().locked();

      expect(store.getState()).toMatchObject({ status: 'authenticated', stage: 'locked', user });
    });

    it('returns to the stage the user was on', () => {
      const store = createSessionStore();
      store.getState().signedIn(user, 'kyc');

      store.getState().locked();
      store.getState().unlocked();

      expect(store.getState().stage).toBe('kyc');
    });

    it('survives being locked twice', () => {
      const store = createSessionStore();
      store.getState().signedIn(user, 'create-wallet');

      store.getState().locked();
      store.getState().locked();
      store.getState().unlocked();

      expect(store.getState().stage).toBe('create-wallet');
    });

    it('resumes a booted lock at the stage the boot resolved', () => {
      const store = createSessionStore();

      store.getState().bootstrapped({ session: { user, stage: 'locked', resumeStage: 'kyc' } });
      store.getState().unlocked();

      expect(store.getState().stage).toBe('kyc');
    });

    it('never resumes into locked when a boot restores a locked session', () => {
      const store = createSessionStore();

      store.getState().bootstrapped({ session: { user, stage: 'locked' } });
      store.getState().unlocked();

      expect(store.getState().stage).toBe('ready');
    });
  });

  describe('signing out', () => {
    it('clears the user and resets the stage', () => {
      const store = createSessionStore();
      store.getState().signedIn(user, 'kyc');

      store.getState().signedOut();

      expect(store.getState()).toMatchObject({
        status: 'unauthenticated',
        stage: 'ready',
        user: undefined,
        offline: false,
      });
    });
  });
});
