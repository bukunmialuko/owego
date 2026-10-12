import { screen, userEvent } from '@testing-library/react-native';
import { createTestContainer, renderWithProviders } from '@/test/render-with-providers';
import { RepayLoanScreen } from './repay-loan-screen';

jest.useFakeTimers();

function renderRepay() {
  return renderWithProviders(<RepayLoanScreen />, {
    withNavigation: true,
    container: createTestContainer(),
  });
}

async function type(user: ReturnType<typeof userEvent.setup>, digits: string) {
  for (const digit of digits) {
    await user.press(screen.getByRole('button', { name: digit }));
  }
}

describe('RepayLoanScreen', () => {
  it('starts at nothing entered, with the action unavailable', async () => {
    await renderRepay();

    expect(await screen.findByText('$0')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
  });

  it('states what is owed and when', async () => {
    await renderRepay();

    expect(await screen.findByLabelText('Loan amount, $182.16')).toBeTruthy();
    expect(screen.getByLabelText('Due now, $140.16')).toBeTruthy();
    expect(screen.getByLabelText('Due date, Aug 25, 2026')).toBeTruthy();
  });

  it('refuses more than is still owed', async () => {
    const user = userEvent.setup();
    await renderRepay();

    await type(user, '200');

    expect(await screen.findByText('$200')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
  });

  it('confirms the repayment and what it earned on the score', async () => {
    const user = userEvent.setup();
    await renderRepay();

    await type(user, '50');
    await user.press(await screen.findByRole('button', { name: 'Continue' }));

    expect(await screen.findByText('Loan repaid')).toBeTruthy();
    expect(screen.getByLabelText('Amount, $50')).toBeTruthy();
    expect(screen.getByLabelText('Credit score, +10')).toBeTruthy();
  });
});
