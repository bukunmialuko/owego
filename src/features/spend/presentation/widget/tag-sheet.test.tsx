import { screen, userEvent } from '@testing-library/react-native';
import { lightTheme } from '@/core/design-system';
import { renderWithProviders } from '@/test/render-with-providers';
import { TagSheet } from './tag-sheet';

const WALLET_COPY = {
  title: 'Add wallet tag',
  label: 'Wallet tag',
  placeholder: 'e.g. John’s wallet',
};

function sheet(isOpen: boolean, saved: string[], closed: true[], copy = WALLET_COPY) {
  return (
    <TagSheet
      isOpen={isOpen}
      {...copy}
      onSave={(tag) => {
        saved.push(tag);
      }}
      onClose={() => {
        closed.push(true);
      }}
    />
  );
}

async function renderSheet(copy = WALLET_COPY) {
  const saved: string[] = [];
  const closed: true[] = [];
  const view = await renderWithProviders(sheet(true, saved, closed, copy));

  return { saved, closed, view };
}

describe('TagSheet', () => {
  it('asks for a wallet tag, with an example of one', async () => {
    await renderSheet();

    expect(await screen.findByText('Add wallet tag')).toBeOnTheScreen();
    expect(screen.getByLabelText('Wallet tag')).toBeOnTheScreen();
    expect(screen.getByPlaceholderText('e.g. John’s wallet')).toBeOnTheScreen();
  });

  it('asks for whatever kind of tag it is handed', async () => {
    await renderSheet({
      title: 'Add merchant tag',
      label: 'Merchant tag',
      placeholder: 'e.g. Corner café',
    });

    expect(await screen.findByText('Add merchant tag')).toBeOnTheScreen();
    expect(screen.getByLabelText('Merchant tag')).toBeOnTheScreen();
    expect(screen.getByPlaceholderText('e.g. Corner café')).toBeOnTheScreen();
  });

  it('leaves a small space between the field and Save', async () => {
    await renderSheet();

    expect((await screen.findByRole('button', { name: 'Save' })).parent).toHaveStyle({
      paddingTop: lightTheme.spacing.md,
    });
  });

  it('keeps Save shut until there is a tag', async () => {
    const user = userEvent.setup();
    await renderSheet();

    expect(await screen.findByRole('button', { name: 'Save' })).toBeDisabled();

    await user.type(screen.getByLabelText('Wallet tag'), '   ');
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('hands back the tag, less the spaces around it', async () => {
    const user = userEvent.setup();
    const { saved, closed } = await renderSheet();

    await user.type(await screen.findByLabelText('Wallet tag'), ' Tunde’s wallet ');
    await user.press(screen.getByRole('button', { name: 'Save' }));

    expect(saved).toEqual(['Tunde’s wallet']);
    expect(closed).toEqual([]);
  });

  it('saves from the keyboard, so the tag can be typed and kept without reaching past it', async () => {
    const user = userEvent.setup();
    const { saved } = await renderSheet();

    const field = await screen.findByLabelText('Wallet tag');
    expect(field).toHaveProp('returnKeyType', 'done');
    await user.type(field, 'Main wallet', { submitEditing: true });

    expect(saved).toEqual(['Main wallet']);
  });

  it('keeps nothing when the keyboard submits an empty tag', async () => {
    const user = userEvent.setup();
    const { saved } = await renderSheet();

    await user.type(await screen.findByLabelText('Wallet tag'), '  ', { submitEditing: true });

    expect(saved).toEqual([]);
  });

  it('opens again on the tag typed before', async () => {
    const user = userEvent.setup();
    const { saved, closed, view } = await renderSheet();

    await user.type(await screen.findByLabelText('Wallet tag'), 'Main wallet');
    await view.rerender(sheet(false, saved, closed));
    await view.rerender(sheet(true, saved, closed));

    expect(await screen.findByDisplayValue('Main wallet')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
  });

  it.each([0, 1])('hands back nothing when closed by close control %i', async (control) => {
    const user = userEvent.setup();
    const { saved, closed } = await renderSheet();

    await user.type(await screen.findByLabelText('Wallet tag'), 'Main wallet');
    const closeControl = screen.getAllByRole('button', { name: 'Close' })[control];
    if (closeControl === undefined) throw new Error(`no close control ${String(control)}`);
    await user.press(closeControl);

    expect(saved).toEqual([]);
    expect(closed).toEqual([true]);
  });
});
