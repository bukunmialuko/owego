import { NavigationContainer, useRoute, type RouteProp } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { QueryClient } from '@tanstack/react-query';
import { act, screen, userEvent, waitFor } from '@testing-library/react-native';
import { asValue } from 'awilix';
import { Text } from 'react-native';
import { serverError, type AppError } from '@/core/errors/app-error';
import { err, ok, type Result } from '@/core/result/result';
import { createTestContainer, renderWithProviders } from '@/test/render-with-providers';
import { buildMerchantCode, PIX_STATIC_PAYLOAD } from '@/test/qr-payloads';
import { resolveMerchantCode } from '../../domain/usecase/resolve-merchant-code-usecase';
import type { FxRateRepository } from '@/core/fx/fx-rate';
import { PAYEE_QUERY_ROOT } from '@/core/payee/payee';
import { PaymentMethodCode } from '../../domain/entity/beneficiary-form';
import type { PayoutQuote } from '../../domain/entity/payout-quote';
import type { PayoutRecipient } from '../../domain/entity/payout-recipient';
import type { SendOutcome } from '../../domain/entity/send-outcome';
import type {
  BankPayoutDraft,
  PreparedPayout,
  PrepareBankPayoutUseCase,
} from '../../domain/usecase/prepare-bank-payout-usecase';
import type {
  SavePaidRecipientInput,
  SavePaidRecipientOutcome,
  SavePaidRecipientUseCase,
} from '../../domain/usecase/save-paid-recipient-usecase';
import { ConfirmScreen } from './confirm-screen';
import type { BankTransferParamList } from './bank-transfer-param-list';

jest.useFakeTimers();

type ConfirmParams = BankTransferParamList['Confirm'];

const NAIRA_AMOUNT_MINOR = 150_000;

const NIGERIAN_RECIPIENT: PayoutRecipient = {
  displayName: 'Hannah Nuggest',
  subtitle: 'Guaranty Trust Bank • 0123456789',
  currency: 'NGN',
  method: PaymentMethodCode.BankTransfer,
  rail: 'bank_transfer',
  endpoint: '/transaction/wallet-to-bank',
  requiresNarration: true,
  limits: [],
  countryCode: 'NG',
  values: { bankCode: '058', accountNumber: '0123456789' },
  labels: { bankCode: 'Guaranty Trust Bank' },
};

const ZELLE_RECIPIENT: PayoutRecipient = {
  ...NIGERIAN_RECIPIENT,
  subtitle: 'Zelle • hannah@example.com',
  currency: 'USD',
  method: PaymentMethodCode.Zelle,
  rail: 'zelle_transfer',
};

const NAIRA_QUOTE: PayoutQuote = {
  destination: {
    recipientGetsMinor: 150_000,
    feeMinor: 3_000,
    totalMinor: 153_000,
    currency: 'NGN',
  },
  wallet: { recipientGetsMinor: 100, feeMinor: 2, totalMinor: 102, currency: 'USD' },
  rate: 1_500,
};

const DOLLAR_QUOTE: PayoutQuote = {
  destination: { recipientGetsMinor: 5_000, feeMinor: 100, totalMinor: 5_100, currency: 'USD' },
  wallet: { recipientGetsMinor: 5_000, feeMinor: 100, totalMinor: 5_100, currency: 'USD' },
  rate: 1,
};

const SENT: SendOutcome = { type: 'sent' };

function merchantPaying(qrString: string): PayoutRecipient {
  const resolved = resolveMerchantCode(qrString);
  if (resolved.kind !== 'merchant') throw new Error(`not payable: ${resolved.reason}`);

  return resolved.recipient;
}

const STICKER_MERCHANT = merchantPaying(buildMerchantCode({ merchantName: 'PHO 24' }));

function paramsFor(overrides: Partial<ConfirmParams> = {}): ConfirmParams {
  return {
    recipient: NIGERIAN_RECIPIENT,
    fundingToken: 'USDC',
    amountMinor: NAIRA_AMOUNT_MINOR,
    narration: 'For upkeep',
    origin: 'transfer',
    ...overrides,
  };
}

function fakePayouts({
  quote = NAIRA_QUOTE,
  initiation,
  outcomes = [SENT],
}: {
  quote?: PayoutQuote;
  initiation?: () => Promise<Result<PreparedPayout, AppError>>;
  outcomes?: (SendOutcome | Promise<SendOutcome>)[];
} = {}) {
  const drafts: BankPayoutDraft[] = [];
  const confirmations: 'confirmed'[] = [];
  const useCase: PrepareBankPayoutUseCase = {
    execute: (draft) => {
      drafts.push(draft);
      if (initiation !== undefined) return initiation();

      return Promise.resolve(
        ok({
          quote,
          confirm: () => {
            confirmations.push('confirmed');

            return Promise.resolve(
              outcomes[Math.min(confirmations.length - 1, outcomes.length - 1)] ?? SENT,
            );
          },
        }),
      );
    },
  };

  return { useCase, drafts, confirmations };
}

function heldOutcome() {
  let settle = (_outcome: SendOutcome): void => undefined;
  const outcome = new Promise<SendOutcome>((resolve) => {
    settle = resolve;
  });

  return { outcome, settle: (answer: SendOutcome) => settle(answer) };
}

const Root = createNativeStackNavigator();
const Flow = createNativeStackNavigator();

function BehindTheFlow() {
  return <Text>the screen the flow was opened from</Text>;
}

function AmountStub() {
  return <Text>the amount step</Text>;
}

function SuccessStub() {
  const { recipient, quote, outcome } =
    useRoute<RouteProp<BankTransferParamList, 'Success'>>().params;

  return (
    <Text>
      {`${outcome}: ${String(quote.destination.totalMinor)} ${quote.destination.currency} to ` +
        `${recipient.displayName} via ${recipient.endpoint}`}
    </Text>
  );
}

function FlowNavigator() {
  return (
    <Flow.Navigator screenOptions={{ headerShown: false }}>
      <Flow.Screen name="Amount" component={AmountStub} />
      <Flow.Screen name="Confirm" component={ConfirmScreen} />
      <Flow.Screen name="Success" component={SuccessStub} />
    </Flow.Navigator>
  );
}

function TestApp({ params }: { params: ConfirmParams }) {
  return (
    <NavigationContainer
      initialState={{
        index: 1,
        routes: [
          { name: 'Behind' },
          {
            name: 'Flow',
            state: { index: 1, routes: [{ name: 'Amount' }, { name: 'Confirm', params }] },
          },
        ],
      }}
    >
      <Root.Navigator screenOptions={{ headerShown: false }}>
        <Root.Screen name="Behind" component={BehindTheFlow} />
        <Root.Screen name="Flow" component={FlowNavigator} />
      </Root.Navigator>
    </NavigationContainer>
  );
}

function fakeSaves(
  answer: Promise<SavePaidRecipientOutcome> = Promise.resolve({ kind: 'skipped' }),
) {
  const handed: SavePaidRecipientInput[] = [];
  const useCase: SavePaidRecipientUseCase = {
    execute: async (input) => {
      handed.push(input);

      return ok(await answer);
    },
  };

  return { useCase, handed };
}

function renderConfirm({
  params = paramsFor(),
  payouts = fakePayouts(),
  saves = fakeSaves(),
  fx,
  queryClient,
}: {
  params?: ConfirmParams;
  payouts?: ReturnType<typeof fakePayouts>;
  saves?: ReturnType<typeof fakeSaves>;
  fx?: FxRateRepository;
  queryClient?: QueryClient;
} = {}) {
  return renderWithProviders(<TestApp params={params} />, {
    container: createTestContainer({
      prepareBankPayoutUseCase: asValue(payouts.useCase),
      savePaidRecipientUseCase: asValue(saves.useCase),
      ...(fx === undefined ? {} : { fxRateRepository: asValue(fx) }),
    }),
    ...(queryClient === undefined ? {} : { queryClient }),
  });
}

function confirmButton() {
  return screen.getByRole('button', { name: 'Confirm' });
}

describe('what the payer is about to send', () => {
  it("shows the backend's figures in the destination currency and the wallet's", async () => {
    await renderConfirm();

    expect(await screen.findByLabelText(/Amount to send, ₦1,500\.00/)).toBeOnTheScreen();
    expect(await screen.findByLabelText(/Total amount paid, ₦1,530\.00/)).toBeOnTheScreen();
    expect(screen.getByLabelText(/^Fee, ₦30\.00/)).toBeOnTheScreen();
    expect(screen.getByLabelText(/Recipient gets, ₦1,500\.00/)).toBeOnTheScreen();
    expect(screen.getByText(' ($1.02)')).toBeOnTheScreen();
    expect(screen.getByText(' ($0.02)')).toBeOnTheScreen();
    expect(screen.getByText(' ($1.00)')).toBeOnTheScreen();
  });

  it('names the rate the backend locked for this payout', async () => {
    const getQuote = jest.fn(() => Promise.resolve(ok(undefined)));
    await renderConfirm({ fx: { getQuote } });

    expect(await screen.findByLabelText(/Rate, \$1\.00 = ₦1,500\.00/)).toBeOnTheScreen();
    expect(getQuote).not.toHaveBeenCalled();
  });

  it('shows who is being paid, with their initials', async () => {
    await renderConfirm();

    expect(
      await screen.findByLabelText('To, Hannah Nuggest, Guaranty Trust Bank • 0123456789'),
    ).toBeOnTheScreen();
    expect(screen.getByText('HN')).toBeOnTheScreen();
  });

  it('marks a nameless recipient with their currency instead of an avatar', async () => {
    await renderConfirm({
      params: paramsFor({ recipient: { ...NIGERIAN_RECIPIENT, displayName: '' } }),
    });

    await screen.findByLabelText(/Total amount paid/);

    expect(screen.getByText('NG', { includeHiddenElements: true })).toBeOnTheScreen();
    expect(screen.queryByText('HN', { includeHiddenElements: true })).not.toBeOnTheScreen();
  });

  it('carries the narration into the breakdown', async () => {
    await renderConfirm();

    expect(await screen.findByLabelText('Transaction narration, For upkeep')).toBeOnTheScreen();
  });

  it('leaves the narration row out for a corridor that sends none', async () => {
    await renderConfirm({
      params: paramsFor({
        recipient: { ...NIGERIAN_RECIPIENT, requiresNarration: false },
        narration: '',
      }),
    });

    await screen.findByLabelText(/Total amount paid/);

    expect(screen.queryByLabelText(/^Transaction narration/)).not.toBeOnTheScreen();
  });

  it('shows a dollar payout in dollars only, with no rate', async () => {
    await renderConfirm({
      params: paramsFor({ recipient: ZELLE_RECIPIENT, amountMinor: 5_000 }),
      payouts: fakePayouts({ quote: DOLLAR_QUOTE }),
    });

    expect(await screen.findByLabelText('Amount to send, $50.00')).toBeOnTheScreen();
    expect(await screen.findByLabelText('Total amount paid, $51.00')).toBeOnTheScreen();
    expect(screen.getByLabelText('Recipient gets, $50.00')).toBeOnTheScreen();
    expect(screen.queryByLabelText(/^Rate,/)).not.toBeOnTheScreen();
    expect(screen.queryByText(/^ \(/)).not.toBeOnTheScreen();
  });

  it('does not inflate a zero-decimal amount in the hero figure', async () => {
    await renderConfirm({
      params: paramsFor({
        recipient: { ...NIGERIAN_RECIPIENT, currency: 'XOF', countryCode: 'SN' },
        amountMinor: 10_000,
      }),
      payouts: fakePayouts({
        quote: {
          ...NAIRA_QUOTE,
          destination: { ...NAIRA_QUOTE.destination, currency: 'XOF', recipientGetsMinor: 10_000 },
        },
      }),
    });

    expect(await screen.findByLabelText(/Amount to send, .*100$/)).toBeOnTheScreen();
    expect(screen.queryByText(/10[  ]?000/)).not.toBeOnTheScreen();
  });

  it('refuses a currency it cannot format rather than calling it dollars', async () => {
    const payouts = fakePayouts();
    await renderConfirm({
      params: paramsFor({
        recipient: { ...NIGERIAN_RECIPIENT, currency: 'GHS', countryCode: 'GH' },
        amountMinor: 10_000,
      }),
      payouts,
    });

    await screen.findByText('Confirm payment');

    expect(await screen.findByRole('alert')).toBeOnTheScreen();
    expect(confirmButton()).toBeDisabled();
    expect(payouts.drafts).toEqual([]);
    expect(screen.queryByText(/\$100\.00/)).toBeNull();
  });
});

describe('initiating the payout', () => {
  it('initiates it once, as the payer chose it, when the screen opens', async () => {
    const payouts = fakePayouts();
    await renderConfirm({ payouts });

    await screen.findByLabelText(/Total amount paid/);

    expect(payouts.drafts).toEqual([
      {
        recipient: NIGERIAN_RECIPIENT,
        fundingToken: 'USDC',
        amountMinor: NAIRA_AMOUNT_MINOR,
        narration: 'For upkeep',
        origin: 'transfer',
      },
    ]);
  });

  it('will not confirm while the payout is being initiated', async () => {
    await renderConfirm({
      payouts: fakePayouts({ initiation: () => new Promise(() => undefined) }),
    });

    expect(await screen.findByLabelText(/Amount to send/)).toBeOnTheScreen();
    expect(screen.queryByLabelText(/Total amount paid/)).not.toBeOnTheScreen();
    expect(screen.queryByRole('alert')).not.toBeOnTheScreen();
    expect(confirmButton()).toBeDisabled();
  });

  it('says the payment could not be priced, and blocks Confirm, when initiation fails', async () => {
    const payouts = fakePayouts({ initiation: () => Promise.resolve(err(serverError())) });
    const user = userEvent.setup();
    await renderConfirm({ payouts });

    expect(
      await screen.findByRole('alert', { name: /We could not price this payment\./ }),
    ).toBeOnTheScreen();
    expect(screen.queryByLabelText(/Total amount paid/)).not.toBeOnTheScreen();

    await user.press(confirmButton());

    expect(confirmButton()).toBeDisabled();
    expect(payouts.confirmations).toEqual([]);
  });
});

describe('confirming', () => {
  it('lands on the result with the confirmed payout, leaving nothing to go back to', async () => {
    const user = userEvent.setup();
    await renderConfirm();

    await screen.findByLabelText(/Total amount paid/);
    await user.press(confirmButton());

    expect(
      await screen.findByText('sent: 153000 NGN to Hannah Nuggest via /transaction/wallet-to-bank'),
    ).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Confirm' })).not.toBeOnTheScreen();
    expect(screen.queryByText('the amount step')).not.toBeOnTheScreen();
  });

  it.each<SendOutcome>([{ type: 'processing' }, { type: 'unconfirmed' }])(
    'lands on the result as $type when Circle says so',
    async (outcome) => {
      const user = userEvent.setup();
      await renderConfirm({ payouts: fakePayouts({ outcomes: [outcome] }) });

      await screen.findByLabelText(/Total amount paid/);
      await user.press(confirmButton());

      expect(await screen.findByText(new RegExp(`^${outcome.type}: 153000 NGN`))).toBeOnTheScreen();
    },
  );

  it('pays once however many times Confirm is pressed', async () => {
    const held = heldOutcome();
    const payouts = fakePayouts({ outcomes: [held.outcome] });
    const user = userEvent.setup();
    await renderConfirm({ payouts });

    await screen.findByLabelText(/Total amount paid/);
    await user.press(confirmButton());
    await user.press(confirmButton());

    expect(payouts.confirmations).toHaveLength(1);

    held.settle(SENT);

    expect(await screen.findByText(/^sent:/)).toBeOnTheScreen();
  });

  it('offers no way back or out while the payment is being signed', async () => {
    const held = heldOutcome();
    const user = userEvent.setup();
    await renderConfirm({ payouts: fakePayouts({ outcomes: [held.outcome] }) });

    await screen.findByLabelText(/Total amount paid/);
    await user.press(confirmButton());

    expect(screen.queryByRole('button', { name: 'Back' })).not.toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Close' })).not.toBeOnTheScreen();

    held.settle(SENT);
    expect(await screen.findByText(/^sent:/)).toBeOnTheScreen();
  });

  it('says the payment expired and initiates a fresh one', async () => {
    const payouts = fakePayouts({
      outcomes: [{ type: 'notSent', reason: 'expired' }, SENT],
    });
    const user = userEvent.setup();
    await renderConfirm({ payouts });

    await screen.findByLabelText(/Total amount paid/);
    await user.press(confirmButton());

    expect(
      await screen.findByText('This payment expired before it was approved. Nothing was sent.'),
    ).toBeOnTheScreen();
    expect(payouts.drafts).toHaveLength(2);

    await screen.findByLabelText(/Total amount paid/);
    await user.press(confirmButton());

    expect(await screen.findByText(/^sent:/)).toBeOnTheScreen();
  });

  it('reports a failed payment, stays, and initiates a fresh one', async () => {
    const payouts = fakePayouts({ outcomes: [{ type: 'notSent', reason: 'failed' }] });
    const user = userEvent.setup();
    await renderConfirm({ payouts });

    await screen.findByLabelText(/Total amount paid/);
    await user.press(confirmButton());

    expect(
      await screen.findByRole('alert', { name: /Payment could not be completed/ }),
    ).toBeOnTheScreen();
    expect(confirmButton()).toBeOnTheScreen();
    expect(payouts.drafts).toHaveLength(2);
  });

  it('stays silently after a closed PIN sheet, and confirms the same payout again', async () => {
    const payouts = fakePayouts({ outcomes: [{ type: 'cancelled' }, SENT] });
    const user = userEvent.setup();
    await renderConfirm({ payouts });

    await screen.findByLabelText(/Total amount paid/);
    await user.press(confirmButton());

    expect(screen.queryByRole('alert')).not.toBeOnTheScreen();
    expect(confirmButton()).toBeEnabled();

    await user.press(confirmButton());

    expect(await screen.findByText(/^sent:/)).toBeOnTheScreen();
    expect(payouts.drafts).toHaveLength(1);
    expect(payouts.confirmations).toHaveLength(2);
  });
});

describe('saving the payee', () => {
  it('starts with saving switched off', async () => {
    await renderConfirm();

    expect(await screen.findByRole('switch', { name: 'Save as beneficiary' })).not.toBeChecked();
  });

  it.each([
    ['left off', false],
    ['switched on', true],
  ])('hands the payee over after the payment with saving %s', async (_case, switchedOn) => {
    const saves = fakeSaves();
    const user = userEvent.setup();
    await renderConfirm({ saves });

    await screen.findByLabelText(/Total amount paid/);
    if (switchedOn) await user.press(screen.getByRole('switch', { name: 'Save as beneficiary' }));
    await user.press(confirmButton());

    expect(await screen.findByText(/^sent:/)).toBeOnTheScreen();
    expect(saves.handed).toEqual([
      { recipient: NIGERIAN_RECIPIENT, outcome: SENT, saveAsBeneficiary: switchedOn },
    ]);
  });

  it('shows the result without waiting for the save', async () => {
    const saves = fakeSaves(new Promise(() => undefined));
    const user = userEvent.setup();
    await renderConfirm({ saves });

    await screen.findByLabelText(/Total amount paid/);
    await user.press(screen.getByRole('switch', { name: 'Save as beneficiary' }));
    await user.press(confirmButton());

    expect(await screen.findByText(/^sent:/)).toBeOnTheScreen();
    expect(saves.handed).toHaveLength(1);
  });

  it('refreshes the saved payees once the save lands, after Confirm has closed', async () => {
    let land = (_outcome: SavePaidRecipientOutcome): void => undefined;
    const saves = fakeSaves(
      new Promise((resolve) => {
        land = resolve;
      }),
    );
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const payeeKey = [...PAYEE_QUERY_ROOT, 'quick-send'];
    queryClient.setQueryData(payeeKey, []);
    const user = userEvent.setup();
    await renderConfirm({ saves, queryClient });

    await screen.findByLabelText(/Total amount paid/);
    await user.press(screen.getByRole('switch', { name: 'Save as beneficiary' }));
    await user.press(confirmButton());
    expect(await screen.findByText(/^sent:/)).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Confirm' })).not.toBeOnTheScreen();

    queryClient.setQueryData(payeeKey, []);
    expect(queryClient.getQueryState(payeeKey)?.isInvalidated).toBe(false);

    await act(async () => {
      land({ kind: 'saved' });
      await Promise.resolve();
    });

    expect(queryClient.getQueryState(payeeKey)?.isInvalidated).toBe(true);
  });
});

describe('saving a merchant', () => {
  function merchantParams(recipient = STICKER_MERCHANT): ConfirmParams {
    return paramsFor({ recipient, amountMinor: 10_000_000, narration: '', origin: 'scan' });
  }

  function saveSwitch() {
    return screen.getByRole('switch', { name: 'Save as beneficiary' });
  }

  it('switches straight on for a merchant, with no tag to type', async () => {
    const user = userEvent.setup();
    await renderConfirm({ params: merchantParams() });

    await screen.findByLabelText(/Total amount paid/);
    await user.press(saveSwitch());

    expect(saveSwitch()).toBeChecked();
    expect(screen.queryByText('Add merchant tag')).not.toBeOnTheScreen();
  });

  it('hands the merchant over after the payment with the switch on, and pays it unchanged', async () => {
    const saves = fakeSaves();
    const payouts = fakePayouts();
    const user = userEvent.setup();
    await renderConfirm({ params: merchantParams(), saves, payouts });

    await screen.findByLabelText(/Total amount paid/);
    await user.press(saveSwitch());
    await user.press(confirmButton());

    expect(await screen.findByText(/^sent:/)).toBeOnTheScreen();
    expect(payouts.drafts.map((draft) => draft.recipient)).toEqual([STICKER_MERCHANT]);
    expect(saves.handed).toEqual([
      { recipient: STICKER_MERCHANT, outcome: SENT, saveAsBeneficiary: true },
    ]);
  });

  it('offers no switch for a code generated for a single sale', async () => {
    const oneTime = merchantPaying(buildMerchantCode({ amount: '100000', initiation: '12' }));
    await renderConfirm({ params: merchantParams(oneTime) });

    await screen.findByLabelText(/Total amount paid/);

    expect(screen.queryByRole('switch', { name: 'Save as beneficiary' })).not.toBeOnTheScreen();
  });

  it('offers no switch for a merchant already saved', async () => {
    await renderConfirm({ params: merchantParams(merchantPaying(PIX_STATIC_PAYLOAD)) });

    await screen.findByLabelText(/Total amount paid/);

    await waitFor(() => {
      expect(screen.queryByRole('switch', { name: 'Save as beneficiary' })).not.toBeOnTheScreen();
    });
  });

  it('calls a merchant whose code names nobody "(No merchant name)"', async () => {
    const nameless = merchantPaying(buildMerchantCode({ merchantName: '' }));
    await renderConfirm({ params: merchantParams(nameless) });

    expect(await screen.findByLabelText('To, (No merchant name), VND')).toBeOnTheScreen();
  });
});

describe('leaving without paying', () => {
  function headerControl(position: 'back' | 'close') {
    return screen.getByRole('button', { name: position === 'back' ? 'Back' : 'Close' });
  }

  it('steps back to the amount', async () => {
    const user = userEvent.setup();
    await renderConfirm();

    await screen.findByLabelText(/Total amount paid/);
    await user.press(headerControl('back'));

    expect(await screen.findByText('the amount step')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Confirm' })).not.toBeOnTheScreen();
  });

  it('closes the whole payout flow, not just this step', async () => {
    const user = userEvent.setup();
    await renderConfirm();

    await screen.findByLabelText(/Total amount paid/);
    await user.press(headerControl('close'));

    expect(await screen.findByText('the screen the flow was opened from')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Confirm' })).not.toBeOnTheScreen();
  });
});
