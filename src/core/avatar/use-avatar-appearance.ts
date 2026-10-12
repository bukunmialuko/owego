import { useStore } from 'zustand';
import { useResolve } from '@/core/di/container-provider';
import type { AvatarAppearance } from './avatar-appearance';

export function useAvatarAppearance(): AvatarAppearance {
  return useStore(useResolve('avatarAppearanceStore'), (state) => state.appearance);
}

export function useSaveAvatarAppearance(): (appearance: AvatarAppearance) => void {
  return useStore(useResolve('avatarAppearanceStore'), (state) => state.save);
}
