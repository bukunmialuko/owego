import { screen, userEvent } from '@testing-library/react-native';
import { createTestContainer, renderWithProviders } from '@/test/render-with-providers';
import { NewLoanScreen } from './new-loan-screen';

jest.useFakeTimers();

function renderNewLoan() {
  return renderWithProviders(<NewLoanScreen />, {
    withNavigation: true,
    container: createTestContainer(),
  });
}

async function type(user: ReturnType<typeof userEvent.setup>, digits: string) {
  for (const digit of digits) {
    await user.press(screen.getByRole('button', { name: digit }));
  }
}

describe('NewLoanScreen', () => {
  it('starts at nothing borrowed, with the action unavailable', async () => {
    await renderNewLoan();

    expect(await screen.findByText('$0')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
  });

  it('prices what has been typed', async () => {
    const user = userEvent.setup();
    await renderNewLoan();

    await type(user, '180');

    expect(await screen.findByLabelText('Fee (1.2%), $2.16')).toBeTruthy();
    expect(screen.getByLabelText('You repay, $182.16')).toBeTruthy();
    expect(screen.getByLabelText('Due date, Aug 25, 2026')).toBeTruthy();
  });

  it('refuses an amount above the ceiling', async () => {
    const user = userEvent.setup();
    await renderNewLoan();

    await type(user, '600');

    expect(await screen.findByText('$600')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
  });

  it('refuses an amount below the floor', async () => {
    const user = userEvent.setup();
    await renderNewLoan();

    await type(user, '5');

    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
  });

  it('confirms what landed once the loan is taken', async () => {
    const user = userEvent.setup();
    await renderNewLoan();

    await type(user, '180');
    await user.press(await screen.findByRole('button', { name: 'Continue' }));

    expect(await screen.findByText('Loan disbursed')).toBeTruthy();
    expect(screen.getByText('Funds land in your USDC balance instantly.')).toBeTruthy();
    expect(screen.getByLabelText('Amount, $180')).toBeTruthy();
  });
});
