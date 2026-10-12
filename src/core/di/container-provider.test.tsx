import { renderHook } from '@testing-library/react-native';
import { asValue } from 'awilix';
import type { ReactNode } from 'react';
import type { AppConfig } from '@/core/config/app-config';
import { testAppConfig } from '@/test/test-config';
import { createAppContainer, type AppCradle } from './container';
import { ContainerProvider, useResolve } from './container-provider';
import type { AwilixContainer } from 'awilix';

const config: AppConfig = testAppConfig;

const wrapperFor = (container: AwilixContainer<AppCradle>) =>
  function Wrapper({ children }: { children: ReactNode }) {
    return <ContainerProvider container={container}>{children}</ContainerProvider>;
  };

describe('useResolve', () => {
  it('returns the registered dependency', async () => {
    const telemetry = { captureError: jest.fn(), track: jest.fn(), identify: jest.fn() };
    const container = createAppContainer(config, { telemetry: asValue(telemetry) });

    const { result } = await renderHook(() => useResolve('telemetry'), {
      wrapper: wrapperFor(container),
    });

    expect(result.current).toBe(telemetry);
  });

  it('keeps the same reference across rerenders', async () => {
    const container = createAppContainer(config);

    const { result, rerender } = await renderHook(() => useResolve('cache'), {
      wrapper: wrapperFor(container),
    });
    const first = result.current;

    await rerender({});

    expect(result.current).toBe(first);
  });

  it('fails with a clear message when no provider is mounted', async () => {
    await expect(renderHook(() => useResolve('cache'))).rejects.toThrow(/ContainerProvider/);
  });
});
