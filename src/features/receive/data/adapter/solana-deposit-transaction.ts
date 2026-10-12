import {
  address,
  appendTransactionMessageInstructions,
  blockhash,
  compileTransaction,
  createNoopSigner,
  createTransactionMessage,
  getBase64EncodedWireTransaction,
  isAddress,
  isBlockhash,
  pipe,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
} from '@solana/kit';
import {
  getCreateAssociatedTokenIdempotentInstruction,
  getTransferCheckedInstruction,
} from '@solana-program/token';
import type { DepositTransfer, RecentBlockhash } from '../../domain/entity/external-deposit';
import { findAssociatedTokenAddress } from './solana-address';

export function buildDepositTransaction(
  transfer: DepositTransfer,
  recent: RecentBlockhash,
): string | undefined {
  const { source, destination, token, amount } = transfer;
  if (
    !isAddress(source) ||
    !isAddress(destination) ||
    !isAddress(token.mint) ||
    !isBlockhash(recent.blockhash)
  ) {
    return undefined;
  }

  const sourceAccount = findAssociatedTokenAddress(source, token.mint);
  const destinationAccount = findAssociatedTokenAddress(destination, token.mint);
  if (sourceAccount === undefined || destinationAccount === undefined) return undefined;

  const payer = createNoopSigner(address(source));
  const mint = address(token.mint);

  const message = pipe(
    createTransactionMessage({ version: 'legacy' }),
    (draft) => setTransactionMessageFeePayerSigner(payer, draft),
    (draft) =>
      setTransactionMessageLifetimeUsingBlockhash(
        {
          blockhash: blockhash(recent.blockhash),
          lastValidBlockHeight: recent.lastValidBlockHeight,
        },
        draft,
      ),
    (draft) =>
      appendTransactionMessageInstructions(
        [
          getCreateAssociatedTokenIdempotentInstruction({
            payer,
            ata: address(destinationAccount),
            owner: address(destination),
            mint,
          }),
          getTransferCheckedInstruction({
            source: address(sourceAccount),
            mint,
            destination: address(destinationAccount),
            authority: payer,
            amount,
            decimals: token.decimals,
          }),
        ],
        draft,
      ),
  );

  return getBase64EncodedWireTransaction(compileTransaction(message));
}
