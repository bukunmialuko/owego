import { createStore, type StoreApi } from 'zustand/vanilla';
import type { SessionStore } from '@/core/session/session-store';
import type { AvatarAppearance, AvatarAppearanceRepository } from './avatar-appearance';

type AvatarAppearanceState = {
  appearance: AvatarAppearance;
  save: (appearance: AvatarAppearance) => void;
};

export type AvatarAppearanceStore = StoreApi<AvatarAppearanceState>;

export function createAvatarAppearanceStore({
  repository,
  sessionStore,
}: {
  repository: AvatarAppearanceRepository;
  sessionStore: SessionStore;
}): AvatarAppearanceStore {
  const ownerId = () => sessionStore.getState().user?.id;

  const store = createStore<AvatarAppearanceState>((set) => ({
    appearance: repository.read(ownerId()),
    save(appearance) {
      const owner = ownerId();
      if (owner === undefined) return;

      repository.write(owner, appearance);
      set({ appearance });
    },
  }));

  sessionStore.subscribe((state, previous) => {
    if (state.user?.id === previous.user?.id) return;

    store.setState({ appearance: repository.read(state.user?.id) });
  });

  return store;
}
