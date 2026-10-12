import {
  depositQuoteResponseSchema,
  withdrawalQuoteResponseSchema,
  yieldBroadcastResponseSchema,
  yieldInitiationResponseSchema,
} from './yield-move-model';

describe('the yield move models', () => {
  it.each([
    ['deposit quote', depositQuoteResponseSchema],
    ['withdrawal quote', withdrawalQuoteResponseSchema],
    ['initiation', yieldInitiationResponseSchema],
    ['broadcast', yieldBroadcastResponseSchema],
  ] as const)('parses an empty %s', (_name, schema) => {
    expect(schema.safeParse({}).success).toBe(true);
  });

  it('reads the withdrawal quote Swagger documents', () => {
    expect(
      withdrawalQuoteResponseSchema.parse({
        data: { estimated_gas_usdc: 0.25, net_received_usdc: 14.75, withdraw_amount_usdc: 15 },
      }).data,
    ).toEqual({ estimated_gas_usdc: 0.25, net_received_usdc: 14.75, withdraw_amount_usdc: 15 });
  });

  it('reads the deposit quote staging sends', () => {
    expect(
      depositQuoteResponseSchema.parse({
        error: false,
        data: { stake_amount_usdc: 1.37, estimated_gas_usdc: 0.0021, total_debit_usdc: 1.3721 },
      }).data,
    ).toEqual({ stake_amount_usdc: 1.37, estimated_gas_usdc: 0.0021, total_debit_usdc: 1.3721 });
  });

  it('leaves a missing fee absent rather than zero', () => {
    expect(depositQuoteResponseSchema.parse({ data: {} }).data.estimated_gas_usdc).toBeUndefined();
  });

  it('reads the challenge triple and the transaction id', () => {
    expect(
      yieldInitiationResponseSchema.parse({
        data: { challenge_id: 'c', user_token: 'u', encryption_key: 'k', transaction_id: 't' },
      }).data,
    ).toEqual({ challenge_id: 'c', user_token: 'u', encryption_key: 'k', transaction_id: 't' });
  });

  it('reads the settlement from data.status, never the envelope', () => {
    expect(yieldBroadcastResponseSchema.parse({ status: 'success', data: {} }).data.status).toBe(
      '',
    );
    expect(yieldBroadcastResponseSchema.parse({ data: { status: 'confirmed' } }).data.status).toBe(
      'confirmed',
    );
  });

  it('rejects a fee sent as a string', () => {
    expect(
      depositQuoteResponseSchema.safeParse({ data: { estimated_gas_usdc: '0.25' } }).success,
    ).toBe(false);
  });
});
