import { createSessionStore, type SessionUser } from '@/core/session/session-store';
import { createKeyValueStorage } from '@/core/storage/mmkv-key-value-storage';
import { CacheKey } from '@/core/storage/storage-keys';
import type { AvatarAppearance } from './avatar-appearance';
import { createAvatarAppearanceRepositoryImpl } from './avatar-appearance-repository-impl';
import { createAvatarAppearanceStore } from './avatar-appearance-store';
import { KycState } from '@/core/session/onboarding-gate';

const ADA: SessionUser = { id: 'u1', firstName: 'Ada', kycState: KycState.Approved };
const GRACE: SessionUser = { id: 'u2', firstName: 'Grace', kycState: KycState.Approved };
const CORAL: AvatarAppearance = { kind: 'initials', swatch: 'coral' };
const DEFAULT: AvatarAppearance = { kind: 'default' };

function setup() {
  const cache = createKeyValueStorage('avatar-appearance-store-test');
  const repository = createAvatarAppearanceRepositoryImpl({ cache });
  const sessionStore = createSessionStore();

  return {
    cache,
    repository,
    sessionStore,
    createStore: () => createAvatarAppearanceStore({ repository, sessionStore }),
  };
}

describe('avatar appearance store', () => {
  it("starts from the signed-in account's saved look", () => {
    const { repository, sessionStore, createStore } = setup();
    repository.write(ADA.id, CORAL);
    sessionStore.getState().signedIn(ADA, 'ready');

    expect(createStore().getState().appearance).toEqual(CORAL);
  });

  it("picks up the account's saved look when it signs in", () => {
    const { repository, sessionStore, createStore } = setup();
    repository.write(ADA.id, CORAL);
    const store = createStore();

    sessionStore.getState().signedIn(ADA, 'ready');

    expect(store.getState().appearance).toEqual(CORAL);
  });

  it('switches when a different account signs in', () => {
    const { repository, sessionStore, createStore } = setup();
    repository.write(ADA.id, CORAL);
    sessionStore.getState().signedIn(ADA, 'ready');
    const store = createStore();

    sessionStore.getState().signedIn(GRACE, 'ready');

    expect(store.getState().appearance).toEqual(DEFAULT);
  });

  it.each([
    ['a sign-out', (store: ReturnType<typeof createSessionStore>) => store.getState().signedOut()],
    [
      'a boot that restores nothing',
      (store: ReturnType<typeof createSessionStore>) =>
        store.getState().bootstrapped({ session: undefined }),
    ],
  ])('forgets the look the moment the session ends, across %s', (_label, end) => {
    const { repository, sessionStore, createStore } = setup();
    repository.write(ADA.id, CORAL);
    sessionStore.getState().signedIn(ADA, 'ready');
    const store = createStore();

    end(sessionStore);

    expect(store.getState().appearance).toEqual(DEFAULT);
  });

  it('keeps the look while the session locks and unlocks', () => {
    const { repository, sessionStore, createStore } = setup();
    repository.write(ADA.id, CORAL);
    sessionStore.getState().signedIn(ADA, 'ready');
    const store = createStore();

    sessionStore.getState().locked();
    sessionStore.getState().unlocked();

    expect(store.getState().appearance).toEqual(CORAL);
  });

  it('publishes a save to every subscriber, and keeps it', () => {
    const { repository, sessionStore, createStore } = setup();
    sessionStore.getState().signedIn(ADA, 'ready');
    const store = createStore();
    const listener = jest.fn();
    store.subscribe(listener);

    store.getState().save(CORAL);

    expect(store.getState().appearance).toEqual(CORAL);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(repository.read(ADA.id)).toEqual(CORAL);
  });

  it('ignores a save with nobody signed in', () => {
    const { cache, createStore } = setup();
    const store = createStore();

    store.getState().save(CORAL);

    expect(store.getState().appearance).toEqual(DEFAULT);
    expect(cache.getString(CacheKey.AvatarPreferences)).toBeUndefined();
  });
});
