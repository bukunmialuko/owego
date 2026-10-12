import {
  latestBlockhashResultSchema,
  rpcEnvelopeSchema,
  signatureStatusesResultSchema,
  tokenAccountResultSchema,
} from './solana-rpc-model';

describe('solana rpc models', () => {
  it('reads an empty envelope, as every model here must', () => {
    expect(rpcEnvelopeSchema.parse({})).toEqual({});
  });

  it('reads a JSON-RPC error', () => {
    expect(
      rpcEnvelopeSchema.parse({ jsonrpc: '2.0', id: 1, error: { code: -32602, message: 'bad' } }),
    ).toEqual({ error: { code: -32602, message: 'bad' } });
  });

  it('reads a latest blockhash', () => {
    expect(
      latestBlockhashResultSchema.parse({
        context: { slot: 2792 },
        value: {
          blockhash: 'EkSnNWid2cvwEVnVx9aBqawnmiCNiDgp3gUdkDPTKN1N',
          lastValidBlockHeight: 3090,
        },
      }),
    ).toEqual({
      context: { slot: 2792 },
      value: {
        blockhash: 'EkSnNWid2cvwEVnVx9aBqawnmiCNiDgp3gUdkDPTKN1N',
        lastValidBlockHeight: 3090,
      },
    });
  });

  it('refuses a blockhash result without a blockhash', () => {
    expect(
      latestBlockhashResultSchema.safeParse({
        context: { slot: 1 },
        value: { lastValidBlockHeight: 2 },
      }).success,
    ).toBe(false);
  });

  it('reads a parsed token account', () => {
    const parsed = tokenAccountResultSchema.parse({
      context: { slot: 1 },
      value: {
        data: {
          program: 'spl-token',
          parsed: {
            type: 'account',
            info: {
              mint: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
              owner: 'HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH',
              tokenAmount: { amount: '12340000', decimals: 6, uiAmountString: '12.34' },
            },
          },
        },
      },
    });

    expect(parsed.value?.data.parsed.info.tokenAmount).toEqual({ amount: '12340000', decimals: 6 });
  });

  it('reads an account that does not exist as null', () => {
    expect(tokenAccountResultSchema.parse({ context: { slot: 1 }, value: null }).value).toBeNull();
  });

  it('refuses a token amount that is not a whole number of base units', () => {
    expect(
      tokenAccountResultSchema.safeParse({
        context: { slot: 1 },
        value: {
          data: {
            parsed: {
              info: { mint: 'm', owner: 'o', tokenAmount: { amount: '12.5', decimals: 6 } },
            },
          },
        },
      }).success,
    ).toBe(false);
  });

  it('reads signature statuses, including one the cluster has not seen', () => {
    expect(
      signatureStatusesResultSchema.parse({
        context: { slot: 82 },
        value: [
          {
            slot: 48,
            confirmations: null,
            err: null,
            status: { Ok: null },
            confirmationStatus: 'finalized',
          },
          null,
        ],
      }),
    ).toEqual({
      value: [{ err: null, confirmationStatus: 'finalized' }, null],
    });
  });

  it('keeps the error of a transaction that landed and failed', () => {
    const parsed = signatureStatusesResultSchema.parse({
      value: [{ err: { InstructionError: [1, { Custom: 1 }] }, confirmationStatus: 'confirmed' }],
    });

    expect(parsed.value[0]?.err).toEqual({ InstructionError: [1, { Custom: 1 }] });
  });
});
