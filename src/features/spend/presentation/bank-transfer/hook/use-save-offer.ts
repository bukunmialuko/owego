import { useMemo } from 'react';
import {
  offerReadsSavedList,
  saveOfferFor,
  type SaveOffer,
} from '../../../domain/beneficiary/save-offer';
import type { PayoutRecipient } from '../../../domain/entity/payout-recipient';
import { useBeneficiaryDirectory } from '../../hook/use-beneficiaries';

export function useSaveOffer(recipient: PayoutRecipient): SaveOffer {
  const readsSavedList = offerReadsSavedList(recipient);
  const directory = useBeneficiaryDirectory({ enabled: readsSavedList });
  const saved = readsSavedList ? directory.data : undefined;

  return useMemo(() => saveOfferFor(recipient, saved), [recipient, saved]);
}
