import { isStepComplete } from '../corridor/step-completeness';
import { PaymentMethodCode, fieldsFor, type FieldDescriptor } from './beneficiary-form';

function field(method: PaymentMethodCode, name: string): FieldDescriptor {
  const found = fieldsFor(method).find((candidate) => candidate.name === name);
  if (found === undefined) throw new Error(`${method} has no ${name} field`);

  return found;
}

function accepts(method: PaymentMethodCode, name: string, value: string): boolean {
  return isStepComplete([field(method, name)], { [name]: value });
}

describe('fieldsFor', () => {
  it('describes every supported method', () => {
    for (const method of Object.values(PaymentMethodCode)) {
      expect(fieldsFor(method).length).toBeGreaterThan(0);
    }
  });

  it('gives each method a distinct shape', () => {
    const names = (method: PaymentMethodCode) => fieldsFor(method).map((field) => field.name);

    expect(names(PaymentMethodCode.Ach)).toContain('routingNumber');
    expect(names(PaymentMethodCode.Zelle)).not.toContain('routingNumber');
    expect(names(PaymentMethodCode.Swift)).toContain('postalCode');
    expect(names(PaymentMethodCode.Ach)).not.toContain('postalCode');
    expect(names(PaymentMethodCode.Crypto)).toEqual(['network', 'walletAddress']);
  });

  it('gives every select a source for its choices', () => {
    const selects = Object.values(PaymentMethodCode)
      .flatMap((method) => fieldsFor(method))
      .filter((field) => field.kind === 'select');

    expect(selects.length).toBeGreaterThan(0);

    for (const field of selects) {
      expect((field.options?.length ?? 0) > 0 || field.optionsFrom !== undefined).toBe(true);
    }
  });

  it('labels every field with a translation key, never a literal', () => {
    for (const method of Object.values(PaymentMethodCode)) {
      for (const field of fieldsFor(method)) {
        expect(field.labelKey).toMatch(/^(common|spend)\./);
      }
    }
  });
});

describe('identifier rules', () => {
  it('holds a routing number to nine digits', () => {
    expect(accepts(PaymentMethodCode.Ach, 'routingNumber', '021000021')).toBe(true);
    expect(accepts(PaymentMethodCode.Ach, 'routingNumber', '12345')).toBe(false);
  });

  it('accepts a zelle id as either an email or a phone number', () => {
    expect(accepts(PaymentMethodCode.Zelle, 'zelleId', 'p@example.com')).toBe(true);
    expect(accepts(PaymentMethodCode.Zelle, 'zelleId', '+2348012345678')).toBe(true);
    expect(accepts(PaymentMethodCode.Zelle, 'zelleId', 'not valid')).toBe(false);
  });

  it('holds a mobile-money number to a phone number', () => {
    expect(accepts(PaymentMethodCode.MobileMoney, 'phoneNumber', '+254712345678')).toBe(true);
    expect(accepts(PaymentMethodCode.MobileMoney, 'phoneNumber', '07123')).toBe(false);
  });

  it('holds a SWIFT code to eight or eleven characters', () => {
    expect(accepts(PaymentMethodCode.Swift, 'swiftCode', 'CITIUS33')).toBe(true);
    expect(accepts(PaymentMethodCode.Swift, 'swiftCode', 'CITIUS33XXX')).toBe(true);
    expect(accepts(PaymentMethodCode.Swift, 'swiftCode', 'CITIUS3')).toBe(false);
  });

  it('asks for a SWIFT code in capitals rather than rewriting what was typed', () => {
    expect(field(PaymentMethodCode.Swift, 'swiftCode').capitalize).toBe('characters');
  });

  it('treats a SWIFT state as optional but a postal code as required', () => {
    const swift = fieldsFor(PaymentMethodCode.Swift).filter((candidate) =>
      ['state', 'postalCode'].includes(candidate.name),
    );

    expect(isStepComplete(swift, { postalCode: 'E1 6AN' })).toBe(true);
    expect(isStepComplete(swift, { state: 'London' })).toBe(false);
  });

  it('never lets the keyboard reshape a wallet address', () => {
    expect(field(PaymentMethodCode.Crypto, 'walletAddress').capitalize).toBe('none');
  });
});
