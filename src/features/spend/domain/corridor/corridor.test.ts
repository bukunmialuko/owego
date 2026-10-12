import { PaymentMethodCode } from '../entity/beneficiary-form';
import { maxAmountFor, type PaymentCommon } from './corridor-spec';
import {
  corridorFor,
  corridorsFor,
  isPayableByForm,
  isPayableByScan,
  payoutCurrencies,
} from './registry';

const COMMON: PaymentCommon = {
  walletId: 'w-1',
  walletAddress: 'Axxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx1',
  amountMinor: 1500,
  currency: 'NGN',
  tokenId: 'usdc-sol',
  narration: 'For upkeep',
  countryCode: 'CI',
};

const spec = (currency: string, method: PaymentMethodCode) => {
  const found = corridorFor(currency, method);
  if (found === undefined) throw new Error(`no corridor for ${currency}:${method}`);

  return found;
};

describe('request bodies', () => {
  it('sends Nigeria a bank code and account number, and no recipient name', () => {
    const body = spec('NGN', PaymentMethodCode.BankTransfer).toBody(
      { bankCode: '058', accountNumber: '0123456789', accountName: 'Hannah Nuggest' },
      COMMON,
    );

    expect(body).toEqual({
      wallet_id: 'w-1',
      wallet_address: COMMON.walletAddress,
      amount: 1500,
      currency: 'NGN',
      token_id: 'usdc-sol',
      recipient_bank_code: '058',
      recipient_account_number: '0123456789',
      narration: 'For upkeep',
      save_beneficiary: false,
    });
    expect(body).not.toHaveProperty('recipient_name');
  });

  it('sends Kenya a msisdn with a token and a narration', () => {
    const body = spec('KES', PaymentMethodCode.MobileMoney).toBody(
      { provider: 'mpesa', beneficiaryName: 'Maya Chen', phoneNumber: '+254700000000' },
      { ...COMMON, currency: 'KES' },
    );

    expect(body).toEqual({
      wallet_id: 'w-1',
      wallet_address: COMMON.walletAddress,
      amount: 1500,
      currency: 'KES',
      token_id: 'usdc-sol',
      msisdn: '+254700000000',
      recipient_name: 'Maya Chen',
      narration: 'For upkeep',
      save_beneficiary: false,
    });
  });

  it('sends the franc zone a provider and a country, and neither token nor narration', () => {
    const body = spec('XOF', PaymentMethodCode.MobileMoney).toBody(
      { provider: 'wave', beneficiaryName: 'Awa Diallo', phoneNumber: '+2250700000000' },
      { ...COMMON, currency: 'XOF' },
    );

    expect(body).toEqual({
      wallet_id: 'w-1',
      wallet_address: COMMON.walletAddress,
      amount: 1500,
      currency: 'XOF',
      destination_type: 'mobile_money',
      provider: 'wave',
      country: 'CI',
      msisdn: '+2250700000000',
      recipient_name: 'Awa Diallo',
      save_beneficiary: false,
    });
    expect(body).not.toHaveProperty('token_id');
    expect(body).not.toHaveProperty('narration');
  });

  describe('Zelle', () => {
    const zelle = (zelleId: string) =>
      spec('USD', PaymentMethodCode.Zelle).toBody(
        { category: 'individual', beneficiaryName: 'Precious Jameson', zelleId },
        { ...COMMON, currency: 'USD' },
      );

    it('carries the beneficiary category in zelle_recipient_type', () => {
      expect(zelle('precious.james@mail.com')).toMatchObject({
        zelle_recipient_type: 'individual',
        zelle_recipient_name: 'Precious Jameson',
        narration: 'For upkeep',
      });
    });

    it('splits the Zelle ID into an email or a phone on the @', () => {
      expect(zelle('precious.james@mail.com')).toMatchObject({
        zelle_recipient_email: 'precious.james@mail.com',
      });
      expect(zelle('+12025550123')).toMatchObject({ zelle_recipient_phone: '+12025550123' });

      expect(zelle('+12025550123')).not.toHaveProperty('zelle_recipient_email');
      expect(zelle('precious.james@mail.com')).not.toHaveProperty('zelle_recipient_phone');
    });
  });

  it('sends a wallet payout a decimal amount and no currency at all', () => {
    const body = spec('USDC', PaymentMethodCode.Crypto).toBody(
      { network: 'SOL', walletAddress: 'Axxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx1' },
      { ...COMMON, amountMinor: 1500 },
    );

    expect(body).toEqual({
      wallet_id: 'w-1',
      amount: '15',
      destination_address: 'Axxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx1',
      token_id: 'usdc-sol',
    });
    expect(body).not.toHaveProperty('currency');
  });

  it('tells the server never to save a payee on its own', () => {
    for (const currency of ['NGN', 'KES', 'XOF', 'USD']) {
      const [payable] = corridorsFor(currency).filter((candidate) => candidate.payable);
      expect(payable?.endpoint).toBe('/transaction/wallet-to-bank');
      expect(payable?.toBody({}, { ...COMMON, currency })).toMatchObject({
        save_beneficiary: false,
      });
    }
  });

  it('always names the currency alongside the rail', () => {
    for (const currency of ['NGN', 'KES', 'XOF', 'USD']) {
      const [payable] = corridorsFor(currency).filter((candidate) => candidate.payable);
      expect(payable).toBeDefined();
      expect(payable?.toBody({}, { ...COMMON, currency })).toMatchObject({ currency });
    }
  });
});

describe('registry', () => {
  it('covers every fixture currency that is not paid by QR', () => {
    const uncovered = payoutCurrencies()
      .filter((currency) => currency.payment_method !== 'qr_scan')
      .filter((currency) => corridorsFor(currency.code).length === 0);

    expect(uncovered).toEqual([]);
  });

  it('pays exactly the QR currencies by scanning', () => {
    const byScan = payoutCurrencies()
      .filter(isPayableByScan)
      .map((currency) => currency.code)
      .sort();

    expect(byScan).toEqual(['ARS', 'BRL', 'COP', 'IDR', 'KHR', 'PHP', 'THB', 'VND']);
  });

  it('marks no scan currency as coming soon', () => {
    const waiting = payoutCurrencies()
      .filter((currency) => currency.payment_method === 'qr_scan' && currency.coming_soon)
      .map((currency) => currency.code);

    expect(waiting).toEqual([]);
  });

  it('treats the QR currencies as unpayable by form', () => {
    const qrCurrencies = payoutCurrencies().filter(
      (currency) => currency.payment_method === 'qr_scan',
    );

    expect(qrCurrencies.length).toBeGreaterThan(0);
    for (const currency of qrCurrencies) {
      expect(isPayableByForm(currency)).toBe(false);
    }
  });

  it('offers USD three methods and marks only Zelle payable', () => {
    const usd = corridorsFor('USD');

    expect(usd.map((candidate) => candidate.method)).toEqual(
      expect.arrayContaining([
        PaymentMethodCode.Zelle,
        PaymentMethodCode.Ach,
        PaymentMethodCode.Swift,
      ]),
    );
    expect(
      usd.filter((candidate) => candidate.payable).map((candidate) => candidate.method),
    ).toEqual([PaymentMethodCode.Zelle]);
  });

  it('lists payable methods first, so the picker leads with what works', () => {
    const payable = corridorsFor('USD').map((candidate) => candidate.payable);

    expect(payable).toEqual([...payable].sort((left, right) => Number(right) - Number(left)));
  });

  it('refuses to build a body for a rail the backend does not have', () => {
    expect(() => spec('USD', PaymentMethodCode.Ach).toBody({}, COMMON)).toThrow(TypeError);
  });
});

describe('scan corridors', () => {
  it('describes every currency the fixture settles by QR', () => {
    const scanCurrencies = payoutCurrencies()
      .filter((currency) => currency.payment_method === 'qr_scan')
      .map((currency) => currency.code);

    expect(scanCurrencies.length).toBe(8);
    for (const code of scanCurrencies) {
      expect(corridorsFor(code).some((candidate) => candidate.entry === 'scan')).toBe(true);
    }
  });

  it('has no form at all', () => {
    const [scan] = corridorsFor('VND');

    expect(scan?.entry).toBe('scan');
    expect(scan?.steps).toEqual([]);
  });

  it('is payable, and still not payable by a form', () => {
    const scanCurrencies = payoutCurrencies().filter(
      (currency) => currency.payment_method === 'qr_scan',
    );

    for (const currency of scanCurrencies) {
      expect(corridorsFor(currency.code).some((candidate) => candidate.payable)).toBe(true);
      expect(isPayableByForm(currency)).toBe(false);
    }
  });

  it('sends a merchant code verbatim, with the amount as a decimal', () => {
    const body = spec('VND', PaymentMethodCode.Crypto).toBody(
      { qrString: '00020101021126390014tz.go.bot.tips6304AB3A', merchantName: 'EXAMPLE MERCHANT' },
      { ...COMMON, amountMinor: 2372 },
    );

    expect(body).toEqual({
      qr_string: '00020101021126390014tz.go.bot.tips6304AB3A',
      wallet_id: 'w-1',
      wallet_address: 'Axxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx1',
      token_id: 'usdc-sol',
      amount: 23.72,
    });
  });

  it('never sends the merchant name it displays', () => {
    const body = spec('VND', PaymentMethodCode.Crypto).toBody(
      { qrString: 'RAW', merchantName: 'EXAMPLE MERCHANT' },
      COMMON,
    );

    expect(body).not.toHaveProperty('merchant');
    expect(JSON.stringify(body)).not.toContain('EXAMPLE MERCHANT');
  });
});

describe('corridor shape', () => {
  it('asks Nigeria alone to verify an account', () => {
    const verifying = payoutCurrencies()
      .flatMap((currency) => corridorsFor(currency.code))
      .filter((candidate) => candidate.verification !== undefined);

    expect(verifying.map((candidate) => candidate.currency)).toEqual(['NGN']);
    expect(verifying[0]?.verification).toEqual({
      dependsOn: ['bankCode', 'accountNumber'],
      resolves: 'accountName',
      call: 'resolveAccount',
    });
  });

  it('splits SWIFT across two screens, and nothing else', () => {
    const multiStep = payoutCurrencies()
      .flatMap((currency) => corridorsFor(currency.code))
      .filter((candidate) => candidate.steps.length > 1);

    expect(multiStep.map((candidate) => candidate.method)).toEqual([PaymentMethodCode.Swift]);
  });

  it('hides narration only where the wire drops it', () => {
    expect(spec('XOF', PaymentMethodCode.MobileMoney).requiresNarration).toBe(false);
    expect(spec('KES', PaymentMethodCode.MobileMoney).requiresNarration).toBe(true);
    expect(spec('NGN', PaymentMethodCode.BankTransfer).requiresNarration).toBe(true);
  });

  it('offers each mobile-money corridor its own providers', () => {
    const providersOf = (currency: string) =>
      spec(currency, PaymentMethodCode.MobileMoney)
        .steps[0]?.fields.find((field) => field.name === 'provider')
        ?.options?.map((option) => option.value);

    expect(providersOf('XOF')).toEqual(['wave', 'orange']);
    expect(providersOf('KES')).toEqual(['mpesa']);
  });
});

describe('maxAmountFor', () => {
  const zelleLimits = spec('USD', PaymentMethodCode.Zelle).limits;

  it('moves Zelle’s ceiling with the beneficiary category', () => {
    expect(maxAmountFor(zelleLimits, { category: 'individual' })).toBe(2000);
    expect(maxAmountFor(zelleLimits, { category: 'business' })).toBe(4000);
  });

  it('imposes no ceiling before the category is chosen', () => {
    expect(maxAmountFor(zelleLimits, {})).toBeUndefined();
  });

  it('imposes no ceiling where a corridor sets none', () => {
    expect(maxAmountFor(spec('NGN', PaymentMethodCode.BankTransfer).limits, {})).toBeUndefined();
  });
});
