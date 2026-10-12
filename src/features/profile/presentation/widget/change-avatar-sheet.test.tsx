import { screen, userEvent } from '@testing-library/react-native';
import { asValue } from 'awilix';
import type { AvatarAppearance } from '@/core/avatar/avatar-appearance';
import { createSessionStore, type SessionUser } from '@/core/session/session-store';
import { createTestContainer, renderWithProviders } from '@/test/render-with-providers';
import { ChangeAvatarSheet } from './change-avatar-sheet';
import { KycState } from '@/core/session/onboarding-gate';

jest.useFakeTimers();

const ADA: SessionUser = { id: 'u1', firstName: 'Ada', kycState: KycState.Approved };
const MINT: AvatarAppearance = { kind: 'initials', swatch: 'mint' };

const COLOURS = [
  'Charcoal',
  'Coral',
  'Mint',
  'Violet',
  'Pink',
  'Lime',
  'Aqua',
  'Blue',
  'Sand',
  'White',
];

async function renderSheet(saved?: AvatarAppearance) {
  const user = userEvent.setup();
  const onClose = jest.fn();
  const sessionStore = createSessionStore();
  sessionStore.getState().signedIn(ADA, 'ready');
  const container = createTestContainer({ sessionStore: asValue(sessionStore) });
  const { avatarAppearanceStore } = container.cradle;
  if (saved !== undefined) avatarAppearanceStore.getState().save(saved);

  const sheet = (isOpen: boolean) => (
    <ChangeAvatarSheet isOpen={isOpen} name="Ada Lovelace" onClose={onClose} />
  );
  const view = await renderWithProviders(sheet(true), { container });

  return {
    user,
    onClose,
    appearance: () => avatarAppearanceStore.getState().appearance,
    reopen: async () => {
      await view.rerender(sheet(false));
      await view.rerender(sheet(true));
    },
  };
}

const save = () => screen.getByRole('button', { name: 'Save' });

describe('ChangeAvatarSheet', () => {
  it('offers ten colours, each named', async () => {
    await renderSheet();

    expect(await screen.findByRole('header', { name: 'Change avatar' })).toBeOnTheScreen();
    expect(screen.getAllByRole('radio')).toHaveLength(10);
    for (const colour of COLOURS) {
      expect(screen.getByRole('radio', { name: colour })).toBeOnTheScreen();
    }
  });

  it('marks the saved colour when it opens', async () => {
    await renderSheet(MINT);

    expect(await screen.findByRole('radio', { name: 'Mint' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Coral' })).not.toBeChecked();
  });

  it('moves the check without saving', async () => {
    const { user, appearance } = await renderSheet(MINT);

    await user.press(await screen.findByRole('radio', { name: 'Coral' }));

    expect(screen.getByRole('radio', { name: 'Coral' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Mint' })).not.toBeChecked();
    expect(appearance()).toEqual(MINT);
  });

  it('saves the pick and closes', async () => {
    const { user, onClose, appearance } = await renderSheet(MINT);

    await user.press(await screen.findByRole('radio', { name: 'Coral' }));
    await user.press(save());

    expect(appearance()).toEqual({ kind: 'initials', swatch: 'coral' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('discards a pick closed with the close button', async () => {
    const { user, onClose, appearance } = await renderSheet(MINT);

    await user.press(await screen.findByRole('radio', { name: 'Coral' }));
    const closeControls = screen.getAllByRole('button', { name: 'Close' });
    await user.press(closeControls[closeControls.length - 1]!);

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(appearance()).toEqual(MINT);
  });

  it('discards a pick dismissed by the scrim', async () => {
    const { user, onClose, appearance } = await renderSheet(MINT);

    await user.press(await screen.findByRole('radio', { name: 'Coral' }));
    await user.press(screen.getAllByRole('button', { name: 'Close' })[0]!);

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(appearance()).toEqual(MINT);
  });

  it('starts from the saved colour after a discarded pick', async () => {
    const { user, reopen } = await renderSheet(MINT);

    await user.press(await screen.findByRole('radio', { name: 'Coral' }));
    await reopen();

    expect(await screen.findByRole('radio', { name: 'Mint' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Coral' })).not.toBeChecked();
  });

  it('cannot save until a different colour is chosen', async () => {
    const { user } = await renderSheet(MINT);

    expect(await screen.findByRole('button', { name: 'Save' })).toBeDisabled();

    await user.press(screen.getByRole('radio', { name: 'Mint' }));
    expect(save()).toBeDisabled();

    await user.press(screen.getByRole('radio', { name: 'Coral' }));
    expect(save()).toBeEnabled();
  });

  it('cannot save before any colour is chosen', async () => {
    await renderSheet();

    expect(await screen.findByRole('button', { name: 'Save' })).toBeDisabled();
    for (const colour of COLOURS) {
      expect(screen.getByRole('radio', { name: colour })).not.toBeChecked();
    }
  });
});
