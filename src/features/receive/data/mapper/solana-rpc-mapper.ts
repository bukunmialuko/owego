import { unknownError, type AppError } from '@/core/errors/app-error';
import { err, ok, type Result } from '@/core/result/result';
import type { DepositToken } from '../../domain/entity/deposit-token';
import type { RecentBlockhash, SignatureStatus } from '../../domain/entity/external-deposit';
import type {
  LatestBlockhashDto,
  SignatureStatusDto,
  TokenAccountDto,
} from '../model/solana-rpc-model';

export function toRecentBlockhash(dto: LatestBlockhashDto): RecentBlockhash {
  return {
    blockhash: dto.value.blockhash,
    lastValidBlockHeight: BigInt(dto.value.lastValidBlockHeight),
    minContextSlot: BigInt(dto.context.slot),
  };
}

export function toTokenBalance(
  dto: TokenAccountDto | null,
  token: DepositToken,
): Result<bigint, AppError> {
  if (dto === null) return ok(0n);

  const { mint, tokenAmount } = dto.data.parsed.info;
  if (mint !== token.mint || tokenAmount.decimals !== token.decimals) {
    return err(unknownError(`token account holds ${mint} at ${tokenAmount.decimals} decimals`));
  }
  return ok(BigInt(tokenAmount.amount));
}

export function toSignatureStatus(dto: SignatureStatusDto | null): SignatureStatus {
  if (dto === null) return { type: 'unknown' };

  return {
    type: 'landed',
    commitment: dto.confirmationStatus ?? 'processed',
    failed: dto.err !== null,
  };
}
