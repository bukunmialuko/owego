import { useState } from 'react';
import { screen, userEvent } from '@testing-library/react-native';
import { renderWithProviders } from '@/test/render-with-providers';
import { PinEntryLayout } from './pin-entry-layout';

jest.useFakeTimers();

type HarnessProps = Partial<React.ComponentProps<typeof PinEntryLayout>>;

function Harness(props: HarnessProps) {
  const [pin, setPin] = useState('');

  return (
    <PinEntryLayout
      title="Create a PIN"
      subtitle="Choose four digits"
      pin={pin}
      onChangePin={setPin}
      submitLabel="Continue"
      onSubmit={jest.fn()}
      {...props}
    />
  );
}

async function setup(props: HarnessProps = {}) {
  const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
  await renderWithProviders(<Harness {...props} />);

  return {
    user,
    press: (name: string) => user.press(screen.getByRole('button', { name })),
    typeDigits: async (digits: string) => {
      for (const digit of digits) await user.press(screen.getByRole('button', { name: digit }));
    },
  };
}

const progress = (entered: number) => screen.getByLabelText(`${entered} of 4 digits entered`);

describe('PinEntryLayout', () => {
  it('shows the title and the subtitle', async () => {
    await setup();

    expect(screen.getByText('Create a PIN')).toBeOnTheScreen();
    expect(screen.getByText('Choose four digits')).toBeOnTheScreen();
  });

  it('fills a dot for each digit pressed', async () => {
    const { typeDigits } = await setup();

    await typeDigits('13');

    expect(progress(2)).toBeOnTheScreen();
  });

  it('removes one digit per press of delete', async () => {
    const { typeDigits, press } = await setup();
    await typeDigits('135');

    await press('Delete');

    expect(progress(2)).toBeOnTheScreen();
  });

  it('stops at four digits', async () => {
    const { typeDigits } = await setup();

    await typeDigits('135790');

    expect(progress(4)).toBeOnTheScreen();
  });

  it('holds Continue until four digits are in', async () => {
    const { typeDigits } = await setup();

    await typeDigits('135');
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();

    await typeDigits('7');
    expect(screen.getByRole('button', { name: 'Continue' })).toBeEnabled();
  });

  it('submits when Continue is pressed', async () => {
    const onSubmit = jest.fn();
    const { typeDigits, press } = await setup({ onSubmit });

    await typeDigits('1357');
    await press('Continue');

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('offers no text field at all', async () => {
    await setup();

    expect(JSON.stringify(screen.toJSON())).not.toContain('"type":"TextInput"');
  });

  it('shows a message and a hint under the dots', async () => {
    await setup({ message: 'Those PINs didn’t match.', hint: '2 attempts left.' });

    expect(screen.getByText('Those PINs didn’t match.')).toBeOnTheScreen();
    expect(screen.getByText('2 attempts left.')).toBeOnTheScreen();
  });

  it('offers the back control when given one', async () => {
    const onPress = jest.fn();
    const { press } = await setup({ onBack: onPress });

    await press('Back');

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('offers the pill action when given one', async () => {
    const onPress = jest.fn();
    const { press } = await setup({ action: { label: 'Wrong account', onPress } });

    await press('Wrong account');

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('draws the helper line and follows its link', async () => {
    const onLinkPress = jest.fn();
    await setup({
      helper: { text: 'Don’t remember your login pin?', linkLabel: 'Reset', onLinkPress },
    });

    expect(screen.getByText('Don’t remember your login pin?')).toBeOnTheScreen();
    await userEvent
      .setup({ advanceTimers: jest.advanceTimersByTime })
      .press(screen.getByRole('link', { name: 'Reset' }));

    expect(onLinkPress).toHaveBeenCalledTimes(1);
  });

  it('puts the accessory in the pad’s empty bottom-left cell', async () => {
    const onPress = jest.fn();
    const { press } = await setup({
      accessory: { icon: 'finger-print', label: 'Use biometrics', onPress },
    });

    await press('Use biometrics');

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('ignores the pad while busy, and reports itself busy', async () => {
    const { typeDigits } = await setup({ isBusy: true });

    await typeDigits('13');

    expect(progress(0)).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
  });
});
