import { act, screen, userEvent } from '@testing-library/react-native';
import { asValue } from 'awilix';
import { ok } from '@/core/result/result';
import { PreferenceKey } from '@/core/storage/storage-keys';
import { createTestContainer, renderWithProviders } from '@/test/render-with-providers';
import type { CreditRepository } from '../domain/repository/credit-repository';
import { createPreviewCreditRepository } from '../data/repository/preview-credit-repository';
import { CreditScreen } from './credit-screen';

jest.useFakeTimers();

function renderCredit(
  options: { isActivated?: boolean; repository?: CreditRepository; theme?: 'light' | 'dark' } = {},
) {
  const container = createTestContainer(
    options.repository === undefined ? {} : { creditRepository: asValue(options.repository) },
  );

  if (options.isActivated === true) {
    container.resolve('cache').setString(PreferenceKey.CreditActivated, 'true');
  }

  return renderWithProviders(<CreditScreen />, {
    withNavigation: true,
    container,
    ...(options.theme === undefined ? {} : { theme: options.theme }),
  });
}

describe('CreditScreen before activation', () => {
  it('explains what the credit line is before asking for anything', async () => {
    await renderCredit();

    expect(await screen.findByText('Private by design')).toBeTruthy();
    expect(screen.getByText('No external credit checks')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Continue' })).toBeTruthy();
  });

  it('asks for consent before calculating a score', async () => {
    const user = userEvent.setup();
    await renderCredit();

    await user.press(await screen.findByRole('button', { name: 'Continue' }));

    expect(await screen.findByText('Connect to Yumi')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Allow & calculate score' })).toBeTruthy();
  });

  it('presents the access list as status rather than as controls', async () => {
    const user = userEvent.setup();
    await renderCredit();

    await user.press(await screen.findByRole('button', { name: 'Continue' }));

    expect(
      await screen.findByLabelText('Owego transaction history, last 12 months: accessed'),
    ).toBeTruthy();
    expect(
      screen.getByLabelText('Connect external wallet, coming soon: not accessed'),
    ).toBeTruthy();
    expect(screen.queryByRole('checkbox')).toBeNull();
  });

  it('declining consent leaves the line unactivated', async () => {
    const user = userEvent.setup();
    await renderCredit();

    await user.press(await screen.findByRole('button', { name: 'Continue' }));
    await user.press(await screen.findByRole('button', { name: 'Not now' }));

    expect(screen.getByRole('button', { name: 'Continue' })).toBeTruthy();
    expect(screen.queryByText('Outstanding balance')).toBeNull();
  });

  it('shows the dashboard once the score has been calculated', async () => {
    const user = userEvent.setup();
    await renderCredit();

    await user.press(await screen.findByRole('button', { name: 'Continue' }));
    await user.press(await screen.findByRole('button', { name: 'Allow & calculate score' }));

    expect(await screen.findByText('Calculating your score')).toBeTruthy();

    await act(async () => {
      jest.advanceTimersByTime(6000);
    });

    expect(await screen.findByText('Outstanding balance')).toBeTruthy();
  });
});

describe('CreditScreen dashboard', () => {
  it('shows the score with the movement that earned it', async () => {
    await renderCredit({ isActivated: true });

    expect(await screen.findByText('72')).toBeTruthy();
    expect(screen.getByText('+24 in 7 days')).toBeTruthy();
  });

  it('shows the tier legend instead of a badge before the score has moved', async () => {
    const repository = createPreviewCreditRepository();
    const firstScore: CreditRepository = {
      ...repository,
      getScore: () =>
        Promise.resolve(
          ok({ value: 72, deltaPoints: 0, deltaDays: 0, ceilingMinor: 50_000, currency: 'USD' }),
        ),
    };

    await renderCredit({ isActivated: true, repository: firstScore });

    expect(await screen.findByLabelText('Good rating, 70+')).toBeTruthy();
    expect(screen.queryByText(/in 7 days/)).toBeNull();
  });

  it('reports the outstanding balance on the active loan', async () => {
    await renderCredit({ isActivated: true });

    expect(await screen.findByText('Outstanding balance')).toBeTruthy();
    expect(screen.getByText('$140.16')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Repay' })).toBeTruthy();
  });

  it('invites a first loan when none is running', async () => {
    const repository = createPreviewCreditRepository();
    const noLoan: CreditRepository = {
      ...repository,
      getActiveLoan: () => Promise.resolve(ok(undefined)),
    };

    await renderCredit({ isActivated: true, repository: noLoan });

    expect(await screen.findByText('You haven’t taken a loan yet')).toBeTruthy();
  });

  it('switches to the loan history and its totals', async () => {
    const user = userEvent.setup();
    await renderCredit({ isActivated: true });

    await user.press(await screen.findByRole('tab', { name: 'Loan history' }));

    expect(await screen.findByLabelText('Total borrowed, $230')).toBeTruthy();
    expect(screen.getByLabelText('On-time rate, 50%')).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Loan history' })).toBeSelected();
  });

  it('lists each drawdown and repayment as one line', async () => {
    const user = userEvent.setup();
    await renderCredit({ isActivated: true });

    await user.press(await screen.findByRole('tab', { name: 'Loan history' }));

    expect(await screen.findAllByLabelText(/Loan repayment, \+\$50\.00/)).toHaveLength(2);
    expect(screen.getByLabelText(/Loan collected, -\$50\.00/)).toBeTruthy();
  });

  it('explains the score from the info control', async () => {
    const user = userEvent.setup();
    await renderCredit({ isActivated: true });

    await user.press(await screen.findByRole('button', { name: 'About your credit score' }));

    expect(await screen.findByLabelText('At risk, 0 - 39')).toBeTruthy();
    expect(screen.getByLabelText('Building credit, 40 - 69')).toBeTruthy();
  });

  it('announces the score bar as a percentage rather than as decoration', async () => {
    await renderCredit({ isActivated: true });

    const bar = await screen.findByRole('progressbar', { name: 'Credit score' });
    expect(bar).toHaveAccessibilityValue({ min: 0, max: 100, now: 72 });
  });

  it('renders in dark mode without losing its controls', async () => {
    await renderCredit({ isActivated: true, theme: 'dark' });

    expect(await screen.findByRole('button', { name: 'Get new loan' })).toBeTruthy();
  });
});
