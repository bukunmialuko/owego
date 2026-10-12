import { act, screen, userEvent } from '@testing-library/react-native';
import { asValue } from 'awilix';
import { lightTheme } from '@/core/design-system';
import { ErrorCode, rateLimited, serverError, type AppError } from '@/core/errors/app-error';
import { err, ok, type Result } from '@/core/result/result';
import { PREVIEW_USDC_MINT } from '@/core/yield/preview-yield-overview-repository';
import type { WalletBalancePort } from '@/core/wallet/wallet';
import type {
  YieldOverview,
  YieldOverviewRepository,
  YieldPosition,
} from '@/core/yield/yield-overview';
import { createTestContainer, renderWithProviders } from '@/test/render-with-providers';
import { createPreviewYieldRepository } from '../data/repository/preview-yield-repository';
import type { YieldProduct } from '../domain/entity/yield-entity';
import type { YieldMoveRequest } from '../domain/entity/yield-move';
import type { YieldSigningOutcome, YieldSigningPort } from '../domain/port/yield-signing-port';
import type { YieldRepository } from '../domain/repository/yield-repository';
import { YieldNavigator } from './yield-navigator';

jest.useFakeTimers();

type Overrides = {
  repository?: YieldRepository;
  overview?: YieldOverview;
  signer?: YieldSigningPort;
  walletUsdc?: string;
};

function renderFlow(overrides: Overrides = {}) {
  const { overview } = overrides;
  const overviewRepository: YieldOverviewRepository | undefined =
    overview === undefined ? undefined : { getOverview: () => Promise.resolve(ok(overview)) };

  const container = createTestContainer({
    ...(overrides.repository === undefined
      ? {}
      : { yieldRepository: asValue(overrides.repository) }),
    ...(overviewRepository === undefined
      ? {}
      : { yieldOverviewRepository: asValue(overviewRepository) }),
    ...(overrides.signer === undefined ? {} : { yieldSigningPort: asValue(overrides.signer) }),
    ...(overrides.walletUsdc === undefined
      ? {}
      : { walletBalancePort: asValue(solanaWalletHolding(overrides.walletUsdc)) }),
  });

  return renderWithProviders(<YieldNavigator />, { withNavigation: true, container });
}

function solanaWalletHolding(usdc: string): WalletBalancePort {
  return {
    listWallets: () =>
      Promise.resolve(
        ok([
          {
            id: 'wallet-sol',
            address: 'sol-address',
            blockchain: 'SOL-DEVNET',
            balances: [{ tokenId: 'usdc-sol', symbol: 'USDC', amount: usdc, decimals: 6 }],
          },
        ]),
      ),
  };
}

function recordingRepository(products?: YieldProduct[]) {
  const initiated: YieldMoveRequest[] = [];
  const preview = createPreviewYieldRepository();
  const repository: YieldRepository = {
    ...preview,
    ...(products === undefined ? {} : { getProducts: () => Promise.resolve(ok(products)) }),
    initiate: (request) => {
      initiated.push(request);

      return preview.initiate(request);
    },
  };

  return { repository, initiated };
}

function signerAnswering(answer: Result<YieldSigningOutcome, AppError>): YieldSigningPort {
  return { sign: () => Promise.resolve(answer) };
}

const USDC_PRODUCT: YieldProduct = {
  id: 'preview-vault-usdc',
  tokenSymbol: 'USDC',
  tokenMint: PREVIEW_USDC_MINT,
  apyPercent: 4.1,
  provider: 'jupiter',
  isStakeable: true,
  walletBalanceMinor: 100_000,
};

type User = ReturnType<typeof userEvent.setup>;

async function tap(user: User, keys: string[]) {
  for (const key of keys) {
    await user.press(screen.getByRole('button', { name: key }));
  }
}

async function confirmDeposit(user: User, keys: string[]) {
  await user.press(await screen.findByRole('button', { name: 'Deposit' }));
  await screen.findByText('Investment amount');
  await tap(user, keys);
  await user.press(screen.getByRole('button', { name: 'Continue' }));
  await screen.findByText('Confirm deposit');
}

async function openWithdraw(user: User) {
  await screen.findByLabelText(/^Value, /);
  await user.press(screen.getByRole('button', { name: 'Withdraw' }));
  await screen.findByText('Amount');
}

const USDC_VAULT = 'USDC vault, Jupiter • 4.10% APY';
const DEPOSIT_INTO_USDC_VAULT = 'Deposit into USDC vault, Jupiter • 4.10% APY';
const USDT_VAULT = 'USDT vault, Jupiter • 3.77% APY';

const USDC_POSITION: YieldPosition = {
  id: '9BEcn9aPEmhSPbPQeFGjidRiEKki46fVQDyPpSQXPA2D',
  tokenSymbol: 'USDC',
  tokenMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  valueMinor: 10_025,
  currency: 'USD',
  apyPercent: 4.1,
  contributedMinor: 10_000,
  change: { percent: 0.25, amountMinor: 25 },
};

const USDT_POSITION: YieldPosition = {
  id: 'Cmn4v2wipYV41dkakDvCgFJpxhtaaKt11NyWV8pjSE8A',
  tokenSymbol: 'USDT',
  tokenMint: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
  valueMinor: 5_060,
  currency: 'USD',
  apyPercent: 3.77,
  contributedMinor: 5_000,
  change: { percent: 1.2, amountMinor: 60 },
};

const FUNDED_OVERVIEW: YieldOverview = {
  valueMinor: 15_085,
  currency: 'USD',
  change: { percent: 0.57, amountMinor: 85 },
  positions: [USDC_POSITION, USDT_POSITION],
};

function positionOf(text: string): number {
  return JSON.stringify(screen.toJSON()).indexOf(text);
}

async function openInvestment(user: User, name: string) {
  const [row] = await screen.findAllByRole('button', { name });
  if (row === undefined) throw new Error(`expected the investment ${name}`);
  await user.press(row);
}

describe('the yield dashboard', () => {
  it('reports the value and what it has earned', async () => {
    await renderFlow();

    expect(await screen.findByLabelText('Value, $5,136.98')).toBeTruthy();
    expect(screen.getByText('+2.2% ($336.35)')).toBeTruthy();
  });

  it('shows a loss in the error colour, signed on both figures', async () => {
    await renderFlow({
      overview: {
        valueMinor: 41_000,
        currency: 'USD',
        change: { percent: -1.2, amountMinor: -410 },
        positions: [],
      },
    });

    expect(await screen.findByText('-1.2% (-$4.10)')).toHaveStyle({
      color: lightTheme.color.textError,
    });
  });

  it('lists each investment by its vault, provider and rate', async () => {
    await renderFlow();

    expect(await screen.findByText('Investments')).toBeTruthy();
    expect(screen.getAllByRole('button', { name: USDC_VAULT }).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: USDT_VAULT })).toBeTruthy();
  });

  it('opens an investment’s details in place, and closes them again', async () => {
    const user = userEvent.setup();
    await renderFlow();

    const [row] = await screen.findAllByRole('button', { name: USDC_VAULT });
    if (row === undefined) throw new Error('expected the USDC investment');
    expect(row).toBeCollapsed();

    await user.press(row);

    expect(row).toBeExpanded();
    expect(screen.getByLabelText('Value, $3,500.13')).toBeTruthy();
    expect(screen.getByLabelText('APY, 4.10%')).toBeTruthy();
    expect(screen.getByLabelText('Net contributions, $3,349.40')).toBeTruthy();
    expect(screen.getByLabelText('Total interest, $150.73')).toBeTruthy();
    expect(screen.queryByText('Accrued interest this month')).toBeNull();
    expect(screen.queryByText('Est. next income')).toBeNull();

    await user.press(row);

    expect(row).toBeCollapsed();
    expect(screen.queryByLabelText('Value, $3,500.13')).toBeNull();
  });

  it('opens a funded vault on its rate, contributions and value, then the interest it earned', async () => {
    const user = userEvent.setup();
    await renderFlow({ overview: FUNDED_OVERVIEW });

    await openInvestment(user, USDC_VAULT);

    expect(screen.getByLabelText('APY, 4.10%')).toBeTruthy();
    expect(screen.getByLabelText('Net contributions, $100')).toBeTruthy();
    expect(screen.getByLabelText('Value, $100.25')).toBeTruthy();
    expect(screen.getByLabelText('Total interest, $0.25')).toBeTruthy();
    expect(positionOf('APY, 4.10%')).toBeLessThan(positionOf('Net contributions, $100'));
    expect(positionOf('Net contributions, $100')).toBeLessThan(positionOf('Value, $100.25'));
    expect(positionOf('Value, $100.25')).toBeLessThan(positionOf('Total interest, $0.25'));
  });

  it('opens each vault on its own figures', async () => {
    const user = userEvent.setup();
    await renderFlow({ overview: FUNDED_OVERVIEW });

    await openInvestment(user, USDT_VAULT);

    expect(screen.getByLabelText('APY, 3.77%')).toBeTruthy();
    expect(screen.getByLabelText('Net contributions, $50')).toBeTruthy();
    expect(screen.getByLabelText('Value, $50.60')).toBeTruthy();
    expect(screen.getByLabelText('Total interest, $0.60')).toBeTruthy();
    expect(screen.queryByLabelText('Value, $100.25')).toBeNull();
  });

  it('opens a vault staked only from outside owego on its rate and value alone', async () => {
    const user = userEvent.setup();
    const stakedElsewhere: YieldPosition = {
      id: USDT_POSITION.id,
      tokenSymbol: 'USDT',
      tokenMint: USDT_POSITION.tokenMint,
      valueMinor: 5_060,
      currency: 'USD',
      apyPercent: 3.77,
    };
    await renderFlow({
      overview: { ...FUNDED_OVERVIEW, positions: [USDC_POSITION, stakedElsewhere] },
    });

    await openInvestment(user, USDT_VAULT);

    expect(screen.getByLabelText('APY, 3.77%')).toBeTruthy();
    expect(screen.getByLabelText('Value, $50.60')).toBeTruthy();
    expect(screen.queryByText('Net contributions')).toBeNull();
    expect(screen.queryByText('Total interest')).toBeNull();
  });

  it('hides the value, its change and every open investment’s figures', async () => {
    const user = userEvent.setup();
    await renderFlow();

    const [row] = await screen.findAllByRole('button', { name: USDC_VAULT });
    if (row === undefined) throw new Error('expected the USDC investment');
    await user.press(row);
    await user.press(screen.getByRole('button', { name: 'Hide balance' }));

    expect(screen.getByLabelText('Balance hidden')).toBeTruthy();
    expect(screen.queryByText('+2.2% ($336.35)')).toBeNull();
    expect(screen.queryByLabelText('Value, $3,500.13')).toBeNull();
    expect(screen.queryByLabelText('Total interest, $150.73')).toBeNull();
  });

  it('offers only the products that can take a deposit', async () => {
    await renderFlow();

    expect(await screen.findByText('Available yield products')).toBeTruthy();
    expect(await screen.findByRole('button', { name: DEPOSIT_INTO_USDC_VAULT })).toBeTruthy();
    expect(screen.getAllByRole('button', { name: USDC_VAULT })).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: USDT_VAULT })).toHaveLength(1);
  });

  it('has no performance chart', async () => {
    await renderFlow();

    await screen.findByLabelText('Value, $5,136.98');
    expect(screen.queryByText('Performance Insight')).toBeNull();
  });

  it('turns Deposit off when no vault can take a deposit', async () => {
    const { repository } = recordingRepository([
      { ...USDC_PRODUCT, id: 'vault-usdt', tokenSymbol: 'USDT', isStakeable: false },
    ]);
    await renderFlow({ repository });

    expect(await screen.findByText('No yield products available right now')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Deposit' })).toBeDisabled();
  });

  it('reports $0.00, with no change line and nothing to withdraw, before anything is invested', async () => {
    await renderFlow({ overview: { valueMinor: 0, currency: 'USD', positions: [] } });

    expect(await screen.findByLabelText('Value, $0.00')).toBeTruthy();
    expect(screen.queryByText('Investments')).toBeNull();
    expect(screen.queryByText(/% \(/)).toBeNull();
    expect(screen.getByRole('button', { name: 'Withdraw' })).toBeDisabled();
  });
});

describe('depositing', () => {
  it('starts at nothing, against the wallet’s USDC, into the one vault on offer', async () => {
    const user = userEvent.setup();
    await renderFlow();

    await user.press(await screen.findByRole('button', { name: 'Deposit' }));

    expect(await screen.findByText('Investment amount')).toBeTruthy();
    expect(await screen.findByLabelText('Wallet balance, $5,136.98')).toBeTruthy();
    expect(screen.getByText('USDC vault')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'USDC vault' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
  });

  it('writes a shortcut amount straight into the figure', async () => {
    const user = userEvent.setup();
    await renderFlow();

    await user.press(await screen.findByRole('button', { name: 'Deposit' }));
    await user.press(await screen.findByRole('button', { name: '$500' }));

    expect(await screen.findByLabelText('Amount, $500.00')).toBeTruthy();
  });

  it('fills the whole balance from the balance chip', async () => {
    const user = userEvent.setup();
    await renderFlow();

    await user.press(await screen.findByRole('button', { name: 'Deposit' }));
    await user.press(await screen.findByRole('button', { name: 'Wallet balance, $5,136.98' }));

    expect(await screen.findByLabelText('Amount, $5,136.98')).toBeTruthy();
  });

  it('refuses more than the wallet holds', async () => {
    const user = userEvent.setup();
    await renderFlow({ walletUsdc: '1000' });

    await user.press(await screen.findByRole('button', { name: 'Deposit' }));
    await screen.findByText('Investment amount');
    await tap(user, ['2', '0', '0', '0']);

    expect(await screen.findByText('That’s more than your wallet holds.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
  });

  it('asks a user with no USDC to fund the wallet first', async () => {
    const user = userEvent.setup();
    const { repository } = recordingRepository([{ ...USDC_PRODUCT, isStakeable: false }]);
    await renderFlow({ repository, walletUsdc: '0' });

    expect(await screen.findByRole('button', { name: DEPOSIT_INTO_USDC_VAULT })).toBeTruthy();
    await user.press(screen.getByRole('button', { name: 'Deposit' }));

    expect(await screen.findByText('Add USDC to your wallet to deposit.')).toBeTruthy();
    expect(screen.getByLabelText('Wallet balance, $0.00')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
  });

  it('says so on the amount when nothing turns out to be on offer after Deposit was tapped', async () => {
    const user = userEvent.setup();
    let deliver: (products: YieldProduct[]) => void = () => undefined;
    const preview = createPreviewYieldRepository();
    await renderFlow({
      repository: {
        ...preview,
        getProducts: () =>
          new Promise((resolve) => {
            deliver = (products) => {
              resolve(ok(products));
            };
          }),
      },
    });

    await user.press(await screen.findByRole('button', { name: 'Deposit' }));
    await screen.findByText('Investment amount');
    await act(async () => {
      deliver([]);
    });

    expect(await screen.findByText('No yield products available right now')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
  });

  it('confirms what goes in, what it costs, and the total', async () => {
    const user = userEvent.setup();
    await renderFlow();

    await confirmDeposit(user, ['1', '5']);

    expect(screen.getByLabelText('Transaction, Deposit')).toBeTruthy();
    expect(screen.getByLabelText('Investment, $15')).toBeTruthy();
    expect(screen.getByLabelText('Fee, $0.25')).toBeTruthy();
    expect(screen.getByLabelText('Total payment, $15.25')).toBeTruthy();
  });

  it('says when the balance cannot even cover the fee, and stays on the amount', async () => {
    const user = userEvent.setup();
    await renderFlow({ walletUsdc: '0.20' });

    await user.press(await screen.findByRole('button', { name: 'Deposit' }));
    await user.press(await screen.findByRole('button', { name: 'Wallet balance, $0.20' }));
    await user.press(screen.getByRole('button', { name: 'Continue' }));

    expect(await screen.findByText('Your balance can’t cover the $0.25 fee.')).toBeTruthy();
    expect(screen.queryByText('Confirm deposit')).toBeNull();
  });

  it('says when the deposit cannot be priced, and stays on the amount', async () => {
    const user = userEvent.setup();
    const preview = createPreviewYieldRepository();
    await renderFlow({
      repository: { ...preview, quote: () => Promise.resolve(err(serverError(503))) },
    });

    await user.press(await screen.findByRole('button', { name: 'Deposit' }));
    await screen.findByText('Investment amount');
    await tap(user, ['1', '5']);
    await user.press(screen.getByRole('button', { name: 'Continue' }));

    expect(
      await screen.findByText('We couldn’t price this right now. Please try again.'),
    ).toBeTruthy();
    expect(screen.queryByText('Confirm deposit')).toBeNull();
  });

  it('lowers a deposit of the whole balance so the fee fits, and says so', async () => {
    const user = userEvent.setup();
    await renderFlow({ walletUsdc: '1000' });

    await user.press(await screen.findByRole('button', { name: 'Deposit' }));
    await user.press(await screen.findByRole('button', { name: 'Wallet balance, $1,000.00' }));
    await user.press(screen.getByRole('button', { name: 'Continue' }));

    expect(await screen.findByText('Confirm deposit')).toBeTruthy();
    expect(screen.getByLabelText('Investment, $999.75')).toBeTruthy();
    expect(screen.getByLabelText('Total payment, $1,000')).toBeTruthy();
    expect(
      screen.getByText('We lowered your deposit to $999.75 so the $0.25 fee fits your balance.'),
    ).toBeTruthy();
  });

  it('builds exactly the deposit the user confirmed, then shows it succeeded', async () => {
    const user = userEvent.setup();
    const { repository, initiated } = recordingRepository();
    await renderFlow({ repository });

    await confirmDeposit(user, ['1', '5']);
    await user.press(screen.getByRole('button', { name: 'Confirm' }));

    expect(await screen.findByText('Transaction successful')).toBeTruthy();
    expect(initiated).toEqual([
      { kind: 'deposit', amountMinor: 1_500, tokenSymbol: 'USDC', tokenMint: PREVIEW_USDC_MINT },
    ]);
    expect(screen.getByTestId('yield-move-art')).toBeTruthy();
    expect(screen.getByRole('header', { name: '$15' })).toBeTruthy();
    expect(screen.getByText('USDC investment yield')).toBeTruthy();
    expect(screen.getByText('4.10% APY')).toBeTruthy();
    expect(screen.getByLabelText('Total payment, $15.25')).toBeTruthy();
    expect(screen.queryByText('Enter passcode')).toBeNull();

    await user.press(screen.getByRole('button', { name: 'Done' }));
    expect(await screen.findByLabelText('Value, $5,136.98')).toBeTruthy();
  });

  it('stays on Confirm, silently, when Circle’s sheet is cancelled', async () => {
    const user = userEvent.setup();
    await renderFlow({ signer: signerAnswering(ok({ type: 'cancelled' })) });

    await confirmDeposit(user, ['1', '5']);
    await user.press(screen.getByRole('button', { name: 'Confirm' }));

    expect(await screen.findByRole('button', { name: 'Confirm' })).toBeEnabled();
    expect(screen.queryByText('Transaction successful')).toBeNull();
  });

  it('says the PIN did not match, and offers Confirm again', async () => {
    const user = userEvent.setup();
    await renderFlow({ signer: signerAnswering(ok({ type: 'failed', reason: 'incorrect-pin' })) });

    await confirmDeposit(user, ['1', '5']);
    await user.press(screen.getByRole('button', { name: 'Confirm' }));

    expect(await screen.findByText('That PIN didn’t match. Please try again.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeEnabled();
  });

  it('asks the user to wait rather than retry at once when deposits are rate limited', async () => {
    const user = userEvent.setup();
    const preview = createPreviewYieldRepository();
    await renderFlow({
      repository: { ...preview, initiate: () => Promise.resolve(err(rateLimited(60))) },
    });

    await confirmDeposit(user, ['1', '5']);
    await user.press(screen.getByRole('button', { name: 'Confirm' }));

    expect(
      await screen.findByText(
        'Too many attempts right now. Wait a few minutes before trying again.',
      ),
    ).toBeTruthy();
    expect(screen.queryByText('That didn’t go through. Please try again.')).toBeNull();
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeEnabled();
  });

  it('ends on “not confirmed” when the broadcast does not answer', async () => {
    const user = userEvent.setup();
    const preview = createPreviewYieldRepository();
    await renderFlow({
      repository: { ...preview, broadcast: () => Promise.resolve(err(serverError(502))) },
    });

    await confirmDeposit(user, ['1', '5']);
    await user.press(screen.getByRole('button', { name: 'Confirm' }));

    expect(await screen.findByText('Transaction not confirmed')).toBeTruthy();
    expect(screen.queryByTestId('yield-move-art')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Confirm' })).toBeNull();
  });

  it('asks the user to keep the app open while the transaction is confirmed, with no way back', async () => {
    const user = userEvent.setup();
    const preview = createPreviewYieldRepository();
    await renderFlow({
      repository: { ...preview, broadcast: () => new Promise(() => undefined) },
    });

    await confirmDeposit(user, ['1', '5']);
    await user.press(screen.getByRole('button', { name: 'Confirm' }));

    expect(
      await screen.findByText(
        'Confirming on Solana. This can take a couple of minutes — keep the app open.',
      ),
    ).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Back' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Close' })).toBeNull();
  });

  it.each([
    [
      'pending',
      'Transaction processing',
      'It’s on its way. Your Yield value updates once it settles.',
      lightTheme.color.textWarning,
    ],
    [
      'failed',
      'Transaction failed',
      'It didn’t go through. Check your balance before trying again.',
      lightTheme.color.textError,
    ],
  ] as const)(
    'ends on its own result when the broadcast reports %s',
    async (status, title, detail, colour) => {
      const user = userEvent.setup();
      const preview = createPreviewYieldRepository();
      await renderFlow({
        repository: { ...preview, broadcast: () => Promise.resolve(ok(status)) },
      });

      await confirmDeposit(user, ['1', '5']);
      await user.press(screen.getByRole('button', { name: 'Confirm' }));

      expect(await screen.findByText(title)).toHaveStyle({ color: colour });
      expect(screen.getByText(detail)).toBeTruthy();
      expect(screen.queryByTestId('yield-move-art')).toBeNull();
      expect(screen.queryByRole('button', { name: 'Confirm' })).toBeNull();
    },
  );
});

describe('withdrawing', () => {
  it('draws on the vault’s value rather than the wallet', async () => {
    const user = userEvent.setup();
    await renderFlow();

    await openWithdraw(user);

    expect(await screen.findByLabelText('Available to withdraw, $3,500.13')).toBeTruthy();
    expect(screen.getByText('Amount')).toBeTruthy();
    expect(screen.queryByText('Investment amount')).toBeNull();
  });

  it('refuses more than the vault holds', async () => {
    const user = userEvent.setup();
    await renderFlow();

    await openWithdraw(user);
    await tap(user, ['9', '9', '9', '9']);

    expect(await screen.findByText('That’s more than you have in this vault.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
  });

  it('refuses a withdrawal the fee would swallow', async () => {
    const user = userEvent.setup();
    await renderFlow();

    await openWithdraw(user);
    await tap(user, ['0', 'Decimal point', '2']);
    await user.press(screen.getByRole('button', { name: 'Continue' }));

    expect(await screen.findByText('Withdraw more than the $0.25 fee.')).toBeTruthy();
    expect(screen.queryByText('Confirm transaction')).toBeNull();
  });

  it('says when the backend refuses the withdrawal', async () => {
    const user = userEvent.setup();
    const preview = createPreviewYieldRepository();
    await renderFlow({
      repository: {
        ...preview,
        quote: () => Promise.resolve(err({ ...serverError(400), code: ErrorCode.InvalidInput })),
      },
    });

    await openWithdraw(user);
    await tap(user, ['1', '5']);
    await user.press(screen.getByRole('button', { name: 'Continue' }));

    expect(
      await screen.findByText('That amount can’t be withdrawn. Try a smaller one.'),
    ).toBeTruthy();
  });

  it('confirms what comes out, the fee and what reaches the wallet, then withdraws exactly that', async () => {
    const user = userEvent.setup();
    const { repository, initiated } = recordingRepository();
    await renderFlow({ repository });

    await openWithdraw(user);
    await tap(user, ['1', '5']);
    await user.press(screen.getByRole('button', { name: 'Continue' }));

    expect(await screen.findByText('Confirm transaction')).toBeTruthy();
    expect(screen.getByLabelText('Transaction, Withdrawal')).toBeTruthy();
    expect(screen.getByLabelText('Amount, $15')).toBeTruthy();
    expect(screen.getByLabelText('Fee, $0.25')).toBeTruthy();
    expect(screen.getByLabelText('Total payment, $14.75')).toBeTruthy();

    await user.press(screen.getByRole('button', { name: 'Confirm' }));

    expect(await screen.findByText('Transaction successful')).toBeTruthy();
    expect(screen.getByTestId('yield-move-art')).toBeTruthy();
    expect(initiated).toEqual([
      { kind: 'withdrawal', amountMinor: 1_500, tokenSymbol: 'USDC', tokenMint: PREVIEW_USDC_MINT },
    ]);
  });
});
