import type {
  Transaction,
  TransactionDirection,
  TransactionStatus,
} from '../../domain/entity/home-entity';
import type { TransactionDto } from '../model/transaction-model';

const KNOWN_TYPES = new Set([
  'deposit',
  'invoice',
  'swap',
  'transfer',
  'credit',
  'charge',
  'debit',
]);
const OUTGOING_TYPES = new Set(['swap', 'transfer', 'charge', 'debit']);

const TITLE_TYPE_LABEL: Record<string, string> = {
  swap: 'transfer',
  debit: 'transfer',
  credit: 'deposit',
};

const STATUSES: Record<string, TransactionStatus> = {
  success: 'completed',
  completed: 'completed',
  successful: 'completed',
  failed: 'failed',
  failure: 'failed',
  cancelled: 'failed',
  pending: 'pending',
  processing: 'pending',
};

export function toTransaction(dto: TransactionDto): Transaction {
  const type = normalizeType(dto.type);
  const direction = toDirection(type);

  return {
    id: dto.id,
    status: toStatus(dto.status),
    direction,
    amountMinor: Math.round(dto.amount * 100),
    currency: dto.currency,
    narration: dto.narration,
    createdAt: dto.created_at,
    title: toTitle(dto, type, direction),
  };
}

function normalizeType(type: string): string {
  const lower = type.toLowerCase();
  return KNOWN_TYPES.has(lower) ? lower : 'debit';
}

export function directionOf(wireType: string): TransactionDirection {
  return toDirection(normalizeType(wireType));
}

function toDirection(type: string): TransactionDirection {
  return OUTGOING_TYPES.has(type) ? 'outgoing' : 'incoming';
}

function toStatus(status: string): TransactionStatus {
  return STATUSES[status.toLowerCase()] ?? 'pending';
}

function toTitle(dto: TransactionDto, type: string, direction: TransactionDirection): string {
  const label = capitalize(TITLE_TYPE_LABEL[type] ?? type);
  const preposition = direction === 'outgoing' ? 'to' : 'from';
  const displayName = counterpartyName(dto, direction);

  return displayName === '' ? label : `${label} ${preposition} ${displayName}`;
}

function counterpartyName(dto: TransactionDto, direction: TransactionDirection): string {
  const recipientName = firstWord(dto.recipient_name);
  if (recipientName !== '') return recipientName;

  const accountHolder = firstWord(dto.recipient.bank_account_information.account_holder);
  if (accountHolder !== '') return accountHolder;

  const address = bestAddress(dto, direction);
  return address === '' ? '' : formatAddress(address);
}

function firstWord(value: string): string {
  if (value === '' || value.toLowerCase() === 'null') return '';

  return value.split(' ')[0] ?? '';
}

function bestAddress(dto: TransactionDto, direction: TransactionDirection): string {
  const candidates =
    direction === 'outgoing'
      ? [dto.meta_data.destination_address, dto.meta_data.wallet_address, dto.recipient_id]
      : [dto.meta_data.source_address, dto.meta_data.wallet_address, dto.recipient_id];

  return candidates.find(isValidAddress) ?? '';
}

function isValidAddress(value: string): boolean {
  if (value === '' || value.toLowerCase() === 'null') return false;

  return !/^[0-]+$/.test(value);
}

function formatAddress(address: string): string {
  if (address.length <= 12) return address;

  const headLength = address.startsWith('0x') ? 8 : 4;
  return `${address.slice(0, headLength)}...${address.slice(-4)}`;
}

function capitalize(value: string): string {
  return value.length === 0 ? value : `${value[0]?.toUpperCase() ?? ''}${value.slice(1)}`;
}
