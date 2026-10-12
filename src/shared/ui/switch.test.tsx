import { screen, userEvent } from '@testing-library/react-native';
import { darkTheme } from '@/core/design-system';
import { renderWithProviders } from '@/test/render-with-providers';
import { Switch } from './switch';

jest.useFakeTimers();

describe('Switch', () => {
  it('toggles when tapped', async () => {
    const onChange = jest.fn();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    await renderWithProviders(<Switch checked={false} onChange={onChange} label="Email" />);

    const control = await screen.findByRole('switch', { name: 'Email' });
    expect(control).not.toBeBusy();
    expect(control).toBeEnabled();

    await user.press(control);

    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('draws a light knob on the off track in dark mode', async () => {
    await renderWithProviders(<Switch checked={false} onChange={jest.fn()} label="Email" />, {
      theme: 'dark',
    });

    const control = await screen.findByRole('switch', { name: 'Email' });
    const [knob] = control.children;
    if (typeof knob === 'string' || knob === undefined) throw new Error('no knob');

    expect(control).toHaveStyle({ backgroundColor: darkTheme.color.fillNeutralPressed });
    expect(knob).toHaveStyle({ backgroundColor: darkTheme.color.fillSwitchKnob });
  });

  describe('while busy', () => {
    it('announces itself as busy and disabled', async () => {
      await renderWithProviders(<Switch checked onChange={jest.fn()} label="Email" busy />);

      const control = await screen.findByRole('switch', { name: 'Email' });
      expect(control).toBeBusy();
      expect(control).toBeDisabled();
    });

    it('ignores taps until its change has landed', async () => {
      const onChange = jest.fn();
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      await renderWithProviders(<Switch checked onChange={onChange} label="Email" busy />);

      await user.press(await screen.findByRole('switch', { name: 'Email' }));

      expect(onChange).not.toHaveBeenCalled();
    });
  });
});
