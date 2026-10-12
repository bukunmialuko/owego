import { z } from 'zod';

export const rpcEnvelopeSchema = z.object({
  result: z.unknown().optional(),
  error: z.object({ code: z.number(), message: z.string() }).optional(),
});

const slot = z.number().int().nonnegative();
const context = z.object({ slot });

export const latestBlockhashResultSchema = z.object({
  context,
  value: z.object({
    blockhash: z.string().min(32).max(44),
    lastValidBlockHeight: z.number().int().nonnegative(),
  }),
});

export type LatestBlockhashDto = z.infer<typeof latestBlockhashResultSchema>;

export const tokenAccountResultSchema = z.object({
  value: z
    .object({
      data: z.object({
        parsed: z.object({
          info: z.object({
            mint: z.string(),
            owner: z.string(),
            tokenAmount: z.object({
              amount: z.string().regex(/^\d+$/),
              decimals: z.number().int().nonnegative(),
            }),
          }),
        }),
      }),
    })
    .nullable(),
});

export type TokenAccountDto = NonNullable<z.infer<typeof tokenAccountResultSchema>['value']>;

const signatureStatusSchema = z.object({
  err: z.unknown().nullable(),
  confirmationStatus: z.enum(['processed', 'confirmed', 'finalized']).nullable(),
});

export const signatureStatusesResultSchema = z.object({
  value: z.array(signatureStatusSchema.nullable()),
});

export type SignatureStatusDto = z.infer<typeof signatureStatusSchema>;
