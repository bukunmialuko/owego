import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { AwilixContainer } from 'awilix';
import type { AppCradle } from './container';

const ContainerContext = createContext<AwilixContainer<AppCradle> | undefined>(undefined);

export function ContainerProvider({
  container,
  children,
}: {
  container: AwilixContainer<AppCradle>;
  children: ReactNode;
}) {
  return <ContainerContext.Provider value={container}>{children}</ContainerContext.Provider>;
}

export function useContainer(): AwilixContainer<AppCradle> {
  const container = useContext(ContainerContext);

  if (container === undefined) {
    throw new Error('useContainer must be used inside a ContainerProvider.');
  }

  return container;
}

export function useResolve<K extends keyof AppCradle>(key: K): AppCradle[K] {
  const container = useContainer();

  return useMemo(() => container.resolve(key), [container, key]);
}
