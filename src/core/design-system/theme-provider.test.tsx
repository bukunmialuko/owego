import { act, renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { Appearance, useColorScheme } from 'react-native';
import {
  ThemeProvider,
  useTheme,
  useThemePreference,
  type ThemePreference,
  type ThemePreferenceStore,
} from './theme-provider';

jest.mock('react-native/Libraries/Utilities/useColorScheme');

const mockedColorScheme = jest.mocked(useColorScheme);

const wrapperFor = (initialPreference: ThemePreference) =>
  function Wrapper({ children }: { children: ReactNode }) {
    return <ThemeProvider initialPreference={initialPreference}>{children}</ThemeProvider>;
  };

describe('ThemeProvider', () => {
  beforeEach(() => {
    mockedColorScheme.mockReturnValue('light');
  });

  it('follows the system scheme by default', async () => {
    mockedColorScheme.mockReturnValue('dark');

    const { result } = await renderHook(() => useTheme(), { wrapper: wrapperFor('system') });

    expect(result.current.mode).toBe('dark');
  });

  it('falls back to light when the system expresses no preference', async () => {
    mockedColorScheme.mockReturnValue('unspecified');

    const { result } = await renderHook(() => useTheme(), { wrapper: wrapperFor('system') });

    expect(result.current.mode).toBe('light');
  });

  it('lets an explicit preference win over the system', async () => {
    mockedColorScheme.mockReturnValue('dark');

    const { result } = await renderHook(() => useTheme(), { wrapper: wrapperFor('light') });

    expect(result.current.mode).toBe('light');
  });

  it('re-themes when the preference changes', async () => {
    const { result } = await renderHook(() => ({ theme: useTheme(), ...useThemePreference() }), {
      wrapper: wrapperFor('system'),
    });

    expect(result.current.theme.mode).toBe('light');

    await act(async () => {
      result.current.setPreference('dark');
    });

    expect(result.current.theme.mode).toBe('dark');
  });

  it('exposes semantic tokens rather than raw palette entries', async () => {
    const { result } = await renderHook(() => useTheme(), { wrapper: wrapperFor('light') });

    expect(result.current.color.fillBrand).toBe('#4274ED');
    expect(result.current.spacing.lg).toBe(16);
    expect(result.current.radius.pill).toBe(999);
  });

  it('fails with a clear message when no provider is mounted', async () => {
    await expect(renderHook(() => useTheme())).rejects.toThrow(/ThemeProvider/);
  });
});

describe('telling the OS which mode the app chose', () => {
  const setColorScheme = jest.spyOn(Appearance, 'setColorScheme');

  const storeHolding = (preference: ThemePreference): ThemePreferenceStore => ({
    read: () => preference,
    write: jest.fn(),
  });

  const ownerOf = (store: ThemePreferenceStore) =>
    function Wrapper({ children }: { children: ReactNode }) {
      return <ThemeProvider store={store}>{children}</ThemeProvider>;
    };

  beforeEach(() => {
    mockedColorScheme.mockReturnValue('light');
    setColorScheme.mockReset();
    setColorScheme.mockImplementation(() => undefined);
  });

  afterAll(() => {
    setColorScheme.mockRestore();
  });

  it.each(['light', 'dark'] as const)('hands an explicit %s choice to the OS', async (mode) => {
    await renderHook(() => useTheme(), { wrapper: ownerOf(storeHolding(mode)) });

    expect(setColorScheme).toHaveBeenLastCalledWith(mode);
  });

  it('hands the decision back to the OS when the app follows it again', async () => {
    const { result } = await renderHook(() => useThemePreference(), {
      wrapper: ownerOf(storeHolding('dark')),
    });

    await act(async () => {
      result.current.setPreference('system');
    });

    expect(setColorScheme).toHaveBeenLastCalledWith('unspecified');
  });

  it('leaves the OS alone from a provider that owns no stored choice', async () => {
    await renderHook(() => useTheme(), { wrapper: wrapperFor('dark') });

    expect(setColorScheme).not.toHaveBeenCalled();
  });
});
