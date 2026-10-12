import { useStore } from 'zustand';
import { useResolve } from '@/core/di/container-provider';
import type { SessionState } from './session-store';

export function useSession(): SessionState {
  return useStore(useResolve('sessionStore'));
}
