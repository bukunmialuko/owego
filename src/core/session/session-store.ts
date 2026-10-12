import { createStore, type StoreApi } from 'zustand/vanilla';
import { resolveWalletHolderStage, type AccountStage, type KycState } from './onboarding-gate';

type SessionStatus = 'booting' | 'authenticated' | 'unauthenticated';

export type OnboardingStage = AccountStage | 'provisioning' | 'locked';

export type AdvanceableStage = Exclude<OnboardingStage, 'kyc' | 'secure-session' | 'locked'>;

export type SessionUser = {
  id: string;
  firstName: string;
  kycState: KycState;
};

type BootstrapResult = {
  session:
    | {
        user: SessionUser;
        stage: OnboardingStage;
        resumeStage?: OnboardingStage;
      }
    | undefined;
  offline?: boolean;
};

export type SessionState = {
  status: SessionStatus;
  stage: OnboardingStage;
  resumeStage: OnboardingStage;
  user: SessionUser | undefined;
  offline: boolean;
  hasDeclinedSignInPin: boolean;
  bootstrapped: (result: BootstrapResult) => void;
  signedIn: (user: SessionUser, stage: OnboardingStage) => void;
  stageAdvanced: (stage: AdvanceableStage) => void;
  walletHolderAdmitted: (input: { hasSkippedKyc: boolean; keepsSession: boolean }) => void;
  signInPinDeclined: () => void;
  locked: () => void;
  unlocked: () => void;
  signedOut: () => void;
};

export type SessionStore = StoreApi<SessionState>;

const RESUMABLE: OnboardingStage = 'ready';

export function createSessionStore(): SessionStore {
  return createStore<SessionState>((set, get) => ({
    status: 'booting',
    stage: RESUMABLE,
    resumeStage: RESUMABLE,
    user: undefined,
    offline: false,
    hasDeclinedSignInPin: false,

    bootstrapped: ({ session, offline = false }) =>
      set(
        session === undefined
          ? {
              status: 'unauthenticated',
              stage: RESUMABLE,
              resumeStage: RESUMABLE,
              user: undefined,
              offline,
              hasDeclinedSignInPin: false,
            }
          : {
              status: 'authenticated',
              stage: session.stage,
              resumeStage:
                session.stage === 'locked' ? (session.resumeStage ?? RESUMABLE) : session.stage,
              user: session.user,
              offline,
              hasDeclinedSignInPin: false,
            },
      ),

    signedIn: (user, stage) =>
      set({
        status: 'authenticated',
        user,
        stage,
        resumeStage: stage,
        offline: false,
        hasDeclinedSignInPin: false,
      }),

    stageAdvanced: (stage) => set({ stage, resumeStage: stage }),

    walletHolderAdmitted: ({ hasSkippedKyc, keepsSession }) => {
      const { user, hasDeclinedSignInPin } = get();
      if (user === undefined) return;

      const stage = resolveWalletHolderStage({
        kycState: user.kycState,
        hasSkippedKyc,
        keepsSession,
        hasDeclinedSignInPin,
      });
      set({ stage, resumeStage: stage });
    },

    signInPinDeclined: () => {
      set({ hasDeclinedSignInPin: true });
    },

    locked: () => {
      const { stage, resumeStage } = get();
      set({ stage: 'locked', resumeStage: stage === 'locked' ? resumeStage : stage });
    },

    unlocked: () => {
      set({ stage: get().resumeStage });
    },

    signedOut: () =>
      set({
        status: 'unauthenticated',
        stage: RESUMABLE,
        resumeStage: RESUMABLE,
        user: undefined,
        offline: false,
        hasDeclinedSignInPin: false,
      }),
  }));
}
