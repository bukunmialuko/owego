import { screen, userEvent } from '@testing-library/react-native';
import { createTestContainer, renderWithProviders } from '@/test/render-with-providers';
import { InsuranceNavigator } from './insurance-navigator';

jest.useFakeTimers();

beforeEach(() => {
  jest.setSystemTime(new Date('2026-08-01T00:00:00Z'));
});

function renderFlow() {
  return renderWithProviders(<InsuranceNavigator />, {
    withNavigation: true,
    container: createTestContainer(),
  });
}

async function completeTripForm(user: ReturnType<typeof userEvent.setup>) {
  await user.press(await screen.findByRole('button', { name: 'Destination' }));
  await user.press(await screen.findByRole('button', { name: 'Kenya' }));

  await user.press(await screen.findByRole('button', { name: 'Departure' }));
  await user.press(await screen.findByRole('button', { name: 'August 14, 2026' }));

  await user.press(await screen.findByRole('button', { name: 'Return' }));
  await user.press(await screen.findByRole('button', { name: 'August 21, 2026' }));
}

describe('Insurance flow', () => {
  it('will not quote until the trip is described', async () => {
    await renderFlow();

    expect(await screen.findByRole('button', { name: 'Continue' })).toBeDisabled();
  });

  it('warns what the cover excludes before anything is chosen', async () => {
    await renderFlow();

    expect(
      await screen.findByRole('alert', { name: /Pre-existing conditions aren't covered/ }),
    ).toBeTruthy();
  });

  it('counts travellers through one adjustable control', async () => {
    const user = userEvent.setup();
    await renderFlow();

    const stepper = await screen.findByLabelText('Travellers');
    expect(stepper).toHaveAccessibilityValue({ min: 1, max: 9, now: 1 });

    await user.press(screen.getByRole('button', { name: 'Add traveller' }));

    expect(stepper).toHaveAccessibilityValue({ min: 1, max: 9, now: 2 });
  });

  it('refuses a departure before today', async () => {
    const user = userEvent.setup();
    await renderFlow();

    await user.press(await screen.findByRole('button', { name: 'Departure' }));
    expect(await screen.findByRole('button', { name: 'August 14, 2026' })).toBeEnabled();

    await user.press(screen.getByRole('button', { name: 'Previous month' }));

    expect(await screen.findByRole('button', { name: 'July 15, 2026' })).toBeDisabled();
  });

  it('offers three covers once the trip is described', async () => {
    const user = userEvent.setup();
    await renderFlow();

    await completeTripForm(user);
    await user.press(await screen.findByRole('button', { name: 'Continue' }));

    expect(await screen.findByRole('radio', { name: /Essential, \$61/ })).toBeChecked();
    expect(screen.getByRole('radio', { name: /Deluxe, Most popular, \$90/ })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: /Platinum, \$130/ })).toBeTruthy();
  });

  it('reviews what was chosen before charging for it', async () => {
    const user = userEvent.setup();
    await renderFlow();

    await completeTripForm(user);
    await user.press(await screen.findByRole('button', { name: 'Continue' }));
    await user.press(await screen.findByRole('radio', { name: /Deluxe/ }));
    await user.press(await screen.findByRole('button', { name: 'Continue' }));

    expect(await screen.findByLabelText('Plan, Deluxe')).toBeTruthy();
    expect(screen.getByLabelText('Destination, Kenya')).toBeTruthy();
    expect(screen.getByLabelText('Amount, $90')).toBeTruthy();
    expect(screen.getByLabelText('Emergency medical, $150,000')).toBeTruthy();
  });

  it('issues a policy with its reference', async () => {
    const user = userEvent.setup();
    await renderFlow();

    await completeTripForm(user);
    await user.press(await screen.findByRole('button', { name: 'Continue' }));
    await user.press(await screen.findByRole('button', { name: 'Continue' }));
    await user.press(await screen.findByRole('button', { name: 'Confirm & pay' }));

    expect(await screen.findByText("You're covered")).toBeTruthy();
    expect(screen.getByText(/POL-WGXJUJ/)).toBeTruthy();
  });
});
