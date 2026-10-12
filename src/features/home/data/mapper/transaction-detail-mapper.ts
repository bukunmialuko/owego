import { isSolanaSignature } from '@/core/reference-data/explorer';
import type {
  Counterparty,
  Figure,
  TransactionDetail,
  TransactionDetailStatus,
  TransactionKind,
} from '../../domain/entity/transaction-detail';
import type { TransactionDirection } from '../../domain/entity/home-entity';
import type { TransactionDto } from '../model/transaction-model';
import { directionOf } from './home-mapper';

const DOLLARS = /^(?:usd|usdc|usdt|)$/i;

const MINOR_PER_UNIT = 100;
const MICRO_USDC_PER_CENT = 10_000;
const MICRO_USDC_PER_DOLLAR = 1_000_000;

const CONVERSION_TOLERANCE = 0.01;

const STATUSES: Record<string, TransactionDetailStatus> = {
  successful: 'successful',
  success: 'successful',
  completed: 'successful',
  processing: 'processing',
  pending: 'pending',
  failed: 'failed',
  failure: 'failed',
  cancelled: 'cancelled',
};

const WALLET_ADDRESS = /^(?:[1-9A-HJ-NP-Za-km-z]{32,44}|0x[0-9a-fA-F]{40})$/;

const COUNTRY_CODE = /^[A-Za-z]{2}$/;

export function toTransactionDetail(dto: TransactionDto): TransactionDetail {
  const direction = directionOf(dto.type);
  const counterparty = toCounterparty(dto, direction);

  return {
    id: dto.id,
    status: STATUSES[dto.status.toLowerCase()] ?? 'pending',
    direction,
    kind: toKind(direction, counterparty),
    ...toAmounts(dto),
    fee:
      dto.meta_data.usdc_total_fee > 0
        ? { minor: Math.round(dto.meta_data.usdc_total_fee * MINOR_PER_UNIT), currency: 'USD' }
        : undefined,
    narration: firstNonBlank(dto.meta_data.narration, dto.narration),
    createdAt: dto.created_at,
    counterparty,
    signature: [dto.tx_hash, dto.id].find(isSolanaSignature),
  };
}

function toKind(
  direction: TransactionDirection,
  counterparty: Counterparty | undefined,
): TransactionKind {
  if (direction === 'incoming') return 'receive';

  return counterparty?.kind === 'bank' ? 'payout' : 'send';
}

type Amounts = Pick<TransactionDetail, 'amount' | 'localAmount' | 'rate'>;

function toAmounts(dto: TransactionDto): Amounts {
  const currency = dto.currency.trim();
  const stated: Figure = {
    minor: Math.round(dto.amount * MINOR_PER_UNIT),
    currency: DOLLARS.test(currency) ? 'USD' : currency,
  };

  if (stated.currency === 'USD') return { amount: stated, localAmount: undefined, rate: undefined };

  const dollars = dto.usdc_amount / MICRO_USDC_PER_DOLLAR;
  const agrees =
    dto.usdc_amount > 0 &&
    dto.rate > 0 &&
    Math.abs(dollars * dto.rate - dto.amount) <= Math.abs(dto.amount) * CONVERSION_TOLERANCE;

  if (!agrees) return { amount: stated, localAmount: undefined, rate: undefined };

  return {
    amount: { minor: Math.round(dto.usdc_amount / MICRO_USDC_PER_CENT), currency: 'USD' },
    localAmount: stated,
    rate: dto.rate,
  };
}

function toCounterparty(
  dto: TransactionDto,
  direction: TransactionDirection,
): Counterparty | undefined {
  const bank = dto.recipient.bank_account_information;
  const accountNumber = bank.account_number.trim();

  if (direction === 'outgoing' && accountNumber !== '') {
    const country = bank.bank_country.trim();

    return {
      kind: 'bank',
      name: firstNonBlank(dto.recipient_name, bank.account_holder) ?? '',
      bankName: bank.bank_name.trim(),
      accountNumber,
      countryCode: COUNTRY_CODE.test(country) ? country : undefined,
    };
  }

  const candidates =
    direction === 'outgoing'
      ? [dto.meta_data.destination_address, dto.meta_data.wallet_address, dto.recipient_id]
      : [dto.meta_data.source_address, dto.recipient_id];
  const address = candidates
    .map((value) => value.trim())
    .find((value) => WALLET_ADDRESS.test(value));

  return address === undefined
    ? undefined
    : { kind: 'wallet', address, network: dto.network.trim() };
}

function firstNonBlank(...values: string[]): string | undefined {
  return values
    .map((value) => value.trim())
    .find((value) => value !== '' && value.toLowerCase() !== 'null');
}
