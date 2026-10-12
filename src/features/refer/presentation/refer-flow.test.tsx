import { act, screen, userEvent } from '@testing-library/react-native';
import { Share } from 'react-native';
import { asValue } from 'awilix';
import Clipboard from '@react-native-clipboard/clipboard';
import { offline } from '@/core/errors/app-error';
import { err, ok } from '@/core/result/result';
import { createTestContainer, renderWithProviders } from '@/test/render-with-providers';
import { createAbsentReferRepository } from '../data/repository/absent-refer-repository';
import { createPreviewReferRepository } from '../data/repository/preview-refer-repository';
import { ReferNavigator } from './refer-navigator';
import type { ReferRepository } from '../domain/repository/refer-repository';

jest.useFakeTimers();

function renderRefer(referRepository?: ReferRepository) {
  return renderWithProviders(<ReferNavigator />, {
    withNavigation: true,
    container: createTestContainer(
      referRepository === undefined ? {} : { referRepository: asValue(referRepository) },
    ),
  });
}

describe('refer & earn overscroll', () => {
  it('holds the invite page at its ends instead of bouncing', async () => {
    await renderRefer();
    await screen.findByText('FJFOW342');

    const bouncing: unknown[] = [];
    const walk = (node: unknown): void => {
      if (node === null || typeof node !== 'object') return;
      const n = node as { type?: string; props?: Record<string, unknown>; children?: unknown[] };
      if (n.type === 'RCTScrollView' && n.props?.['bounces'] !== false) bouncing.push(n.props);
      n.children?.forEach(walk);
    };
    walk(screen.toJSON());

    expect(bouncing).toHaveLength(0);
  });
});

describe('refer & earn', () => {
  it('shows the referral code the account was issued', async () => {
    await renderRefer();

    expect(await screen.findByText('FJFOW342')).toBeOnTheScreen();
  });

  it('explains all three steps before asking for a share', async () => {
    await renderRefer();

    expect(await screen.findByText('Invite your friends to Owego')).toBeOnTheScreen();
    expect(screen.getByText('Have them make their first transaction')).toBeOnTheScreen();
    expect(
      screen.getByText('When they spend up to $150 (within 30 days of signup), you earn $50'),
    ).toBeOnTheScreen();
  });

  it('copies the code, confirms it, and settles back', async () => {
    const user = userEvent.setup();
    await renderRefer();

    await user.press(await screen.findByRole('button', { name: 'Copy referral code' }));

    expect(Clipboard.setString).toHaveBeenCalledWith('FJFOW342');
    expect(await screen.findByRole('button', { name: 'Referral code copied' })).toBeOnTheScreen();

    await act(async () => {
      jest.advanceTimersByTime(2000);
    });

    expect(await screen.findByRole('button', { name: 'Copy referral code' })).toBeOnTheScreen();
  });

  it('shares an invite carrying the code and the link', async () => {
    const user = userEvent.setup();
    const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'dismissedAction' });
    await renderRefer();

    await screen.findByText('FJFOW342');
    await user.press(screen.getByRole('button', { name: 'Share invite' }));

    expect(share).toHaveBeenCalledWith({
      message: expect.stringContaining('FJFOW342') as string,
    });
    expect(share.mock.calls[0]?.[0]).toMatchObject({
      message: expect.stringContaining('https://owego.app/join/FJFOW342') as string,
    });

    share.mockRestore();
  });

  it('renders its frame when no code has been issued yet', async () => {
    await renderRefer(createAbsentReferRepository());

    expect(await screen.findByText(/referral code is on its way/)).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Copy referral code' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Share invite' })).toBeDisabled();
  });

  it('surfaces a failure to load without losing the page', async () => {
    const failing: ReferRepository = {
      ...createPreviewReferRepository(),
      getSummary: () => Promise.resolve(err(offline())),
    };
    await renderRefer(failing);

    expect(
      await screen.findByRole('alert', { name: /couldn't load your referral code/ }),
    ).toBeOnTheScreen();
    expect(screen.getByText('How it works')).toBeOnTheScreen();
  });
});

describe('earnings', () => {
  async function openEarnings(referRepository?: ReferRepository) {
    const user = userEvent.setup();
    await renderRefer(referRepository);

    await user.press(await screen.findByRole('button', { name: 'View earnings' }));

    return user;
  }

  it('opens on the total earned and the payouts behind it', async () => {
    await openEarnings();

    expect(await screen.findByText('$5,136.98')).toBeOnTheScreen();
    expect(await screen.findByRole('tab', { name: 'Payouts' })).toBeSelected();
    expect(screen.getAllByText('+$50.00').length).toBeGreaterThan(0);
  });

  it('groups rewards under the day they landed', async () => {
    await openEarnings();

    expect(await screen.findByText('Today')).toBeOnTheScreen();
    expect(screen.getByText('Yesterday')).toBeOnTheScreen();
  });

  it('switches to referrals and reports which are still pending', async () => {
    const user = await openEarnings();

    await user.press(await screen.findByRole('tab', { name: 'Referrals' }));

    expect(await screen.findByRole('tab', { name: 'Referrals' })).toBeSelected();
    expect(screen.getAllByText('pending')).toHaveLength(4);
  });

  it('shows a settled referral as the amount it paid', async () => {
    const user = await openEarnings();

    await user.press(await screen.findByRole('tab', { name: 'Referrals' }));

    expect(await screen.findByRole('tab', { name: 'Referrals' })).toBeSelected();
    expect(screen.getAllByText('+$50.00')).toHaveLength(3);
  });

  it('says so when nothing has been earned yet', async () => {
    const empty: ReferRepository = {
      ...createPreviewReferRepository(),
      getPayouts: () => Promise.resolve(ok([])),
    };
    await openEarnings(empty);

    expect(await screen.findByText('No rewards yet')).toBeOnTheScreen();
  });

  it('walks back to the invite page', async () => {
    const user = await openEarnings();

    await user.press(await screen.findByRole('button', { name: 'Back' }));

    expect(await screen.findByText('FJFOW342')).toBeOnTheScreen();
  });
});
