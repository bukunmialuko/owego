import { act, screen } from '@testing-library/react-native';
import { asValue } from 'awilix';
import { darkTheme, lightTheme } from '@/core/design-system';
import { createSessionStore } from '@/core/session/session-store';
import { createTestContainer, renderWithProviders } from '@/test/render-with-providers';
import type { BootstrapSessionUseCase } from '../domain/usecase/bootstrap-session-usecase';
import { BOOT_TIMEOUT_MS } from './hook/use-splash-bootstrap';
import { SplashScreen } from './splash-screen';

jest.useFakeTimers();

const neverLands: BootstrapSessionUseCase = { execute: () => new Promise(() => undefined) };

describe('SplashScreen', () => {
  it.each([
    ['light', lightTheme],
    ['dark', darkTheme],
  ] as const)('draws the offline copy in the scrim ink in %s mode', async (mode, theme) => {
    await renderWithProviders(<SplashScreen />, {
      theme: mode,
      container: createTestContainer({
        sessionStore: asValue(createSessionStore()),
        bootstrapSessionUseCase: asValue(neverLands),
      }),
    });

    await act(async () => {
      await jest.advanceTimersByTimeAsync(BOOT_TIMEOUT_MS);
    });

    expect(
      await screen.findByText('You appear to be offline. Check your connection and try again.'),
    ).toHaveStyle({ color: theme.color.textOnScrim });
  });
});
