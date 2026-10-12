import { truncateAddress } from '@/core/format/address';
import { AssetMark } from '@/shared/ui';
import { RecipientCard } from '../../widget/recipient-card';
import type { TransferRecipient } from '../../../domain/entity/asset-transfer';

type Props = {
  recipient: TransferRecipient;
  variant?: 'compact' | 'full';
};

const COMPACT_HEAD = 26;
const FULL_HEAD = 22;

export function AssetRecipientCard({ recipient, variant = 'compact' }: Props) {
  const isFull = variant === 'full';

  return (
    <RecipientCard
      variant={variant}
      title={truncateAddress(recipient.address, isFull ? FULL_HEAD : COMPACT_HEAD, 0)}
      subtitle={
        isFull ? recipient.networkName : `${recipient.tokenSymbol} • ${recipient.networkName}`
      }
      accessibleValue={`${recipient.address}, ${recipient.networkName}`}
      mark={<AssetMark symbol={recipient.address} badgeSymbol={recipient.networkCode} />}
    />
  );
}
