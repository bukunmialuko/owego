import Clipboard from '@react-native-clipboard/clipboard';
import { screen, userEvent } from '@testing-library/react-native';
import { asValue } from 'awilix';
import { darkTheme, lightTheme } from '@/core/design-system';
import { ok } from '@/core/result/result';
import { offline } from '@/core/errors/app-error';
import { err } from '@/core/result/result';
import { createTestContainer, renderWithProviders } from '@/test/render-with-providers';
import { createPreviewReceiveRepository } from '../data/repository/preview-receive-repository';
import type { ReceiveRepository } from '../domain/repository/receive-repository';
import { ReceiveScreen } from './receive-screen';

jest.useFakeTimers();

const qrValues: string[] = [];

jest.mock('react-native-qrcode-styled', () => ({
  __esModule: true,
  default: ({ data }: { data: string }) => {
    qrValues.push(data);
    return null;
  },
}));

beforeEach(() => {
  qrValues.length = 0;
});

function renderReceive(repository?: ReceiveRepository, theme: 'light' | 'dark' = 'light') {
  return renderWithProviders(<ReceiveScreen />, {
    theme,
    withNavigation: true,
    container: createTestContainer(
      repository === undefined ? {} : { receiveRepository: asValue(repository) },
    ),
  });
}

const SOLANA_ADDRESS = 'Axxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx1';
const BASE_ADDRESS = '0xb249111111111111111111111111111111110e93';

describe('ReceiveScreen', () => {
  it('defaults to Solana and shows its address with no confirmation step', async () => {
    await renderReceive();

    expect(await screen.findByText(SOLANA_ADDRESS)).toBeTruthy();
    expect(screen.getByRole('image', { name: /Solana/ })).toBeTruthy();
  });

  it('switches the address the instant a different network is picked', async () => {
    const user = userEvent.setup();
    await renderReceive();

    await screen.findByText(SOLANA_ADDRESS);

    await user.press(screen.getByRole('button', { name: 'Network' }));
    await user.press(await screen.findByRole('button', { name: /Base/ }));

    expect(await screen.findByText(BASE_ADDRESS)).toBeTruthy();
    expect(screen.queryByText(SOLANA_ADDRESS)).toBeNull();
  });

  it('states what each network costs and how long it takes', async () => {
    const user = userEvent.setup();
    await renderReceive();

    await screen.findByText(SOLANA_ADDRESS);
    await user.press(screen.getByRole('button', { name: 'Network' }));

    expect(
      await screen.findByRole('button', { name: /Solana, SOL, 1 - 2 min · 1% fee/ }),
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: /Base, BASE-SEPOLIA/ })).toBeTruthy();
  });

  it('shows a disabled chain as disabled rather than hiding it', async () => {
    const repository = createPreviewReceiveRepository();
    const withDisabled: ReceiveRepository = {
      ...repository,
      getChains: async () => {
        const chains = await repository.getChains();
        if (!chains.ok) return chains;

        return ok(
          chains.value.map((chain) =>
            chain.code === 'ARC' ? { ...chain, isEnabled: false } : chain,
          ),
        );
      },
    };
    const user = userEvent.setup();
    await renderReceive(withDisabled);

    await screen.findByText(SOLANA_ADDRESS);
    await user.press(screen.getByRole('button', { name: 'Network' }));

    expect(await screen.findByRole('button', { name: /Arc/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Solana/ })).toBeEnabled();
  });

  it('falls back to a token the newly chosen chain actually supports', async () => {
    const user = userEvent.setup();
    await renderReceive();

    await screen.findByText(SOLANA_ADDRESS);
    await user.press(await screen.findByRole('button', { name: 'Token, USDC' }));
    await user.press(await screen.findByRole('button', { name: 'USDT' }));
    expect(await screen.findByRole('button', { name: 'Token, USDT' })).toBeTruthy();

    await user.press(screen.getByRole('button', { name: 'Network' }));
    await user.press(await screen.findByRole('button', { name: /Base/ }));

    expect(await screen.findByRole('button', { name: 'Token, USDC' })).toBeTruthy();
  });

  it('encodes exactly the address, with nothing wrapped around it', async () => {
    await renderReceive();

    await screen.findByText(SOLANA_ADDRESS);

    expect(qrValues).toContain(SOLANA_ADDRESS);
    expect(qrValues.every((value) => screen.queryByText(value) !== null)).toBe(true);
  });

  it('warns which token to send and on which network', async () => {
    await renderReceive();

    await screen.findByText(SOLANA_ADDRESS);

    expect(
      await screen.findByRole('alert', { name: /only send USDC on Solana to this address/ }),
    ).toBeTruthy();
  });

  it('paints the warning on the notice tone, not the generic error tone', async () => {
    await renderReceive();

    expect(
      await screen.findByRole('alert', { name: /only send USDC on Solana to this address/ }),
    ).toHaveStyle({ backgroundColor: lightTheme.color.fillNoticeSubtle });
  });

  it('keeps the notice tone legible in dark mode', async () => {
    await renderReceive(undefined, 'dark');

    expect(
      await screen.findByRole('alert', { name: /only send USDC on Solana to this address/ }),
    ).toHaveStyle({ backgroundColor: darkTheme.color.fillNoticeSubtle });
  });

  it('renders Share on the same neutral fill as a secondary action', async () => {
    await renderReceive();

    await screen.findByText(SOLANA_ADDRESS);

    expect(await screen.findByRole('button', { name: 'Share' })).toHaveStyle({
      backgroundColor: lightTheme.color.fillNeutral,
    });
  });

  it('copies the address and confirms it', async () => {
    const user = userEvent.setup();
    await renderReceive();

    await screen.findByText(SOLANA_ADDRESS);
    await user.press(await screen.findByRole('button', { name: 'Copy address' }));

    expect(Clipboard.setString).toHaveBeenCalledWith(SOLANA_ADDRESS);
    expect(await screen.findByRole('button', { name: 'Address copied' })).toBeTruthy();
  });

  it('says so rather than showing an address when the load fails', async () => {
    const repository = createPreviewReceiveRepository();
    const failing: ReceiveRepository = {
      ...repository,
      getAddress: () => Promise.resolve(err(offline())),
    };
    await renderReceive(failing);

    expect(
      await screen.findByRole('alert', { name: /could not load your deposit address/ }),
    ).toBeTruthy();
    expect(screen.queryByRole('image')).toBeNull();
  });

  it('renders in dark mode without losing its actions', async () => {
    await renderReceive(undefined, 'dark');

    await screen.findByText(SOLANA_ADDRESS);

    expect(await screen.findByRole('button', { name: 'Copy address' })).toBeTruthy();
  });
});
