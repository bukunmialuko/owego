import { useTranslation } from 'react-i18next';
import { AssetMark, Avatar } from '@/shared/ui';
import type { Beneficiary } from '../../domain/entity/beneficiary';
import { beneficiaryTitle } from './beneficiary-text';

type Props = {
  beneficiary: Beneficiary;
  tint?: 'successSubtle' | 'surface';
};

export function BeneficiaryMark({ beneficiary, tint = 'successSubtle' }: Props) {
  const { t } = useTranslation();

  switch (beneficiary.kind) {
    case 'wallet':
      return (
        <AssetMark symbol={beneficiary.address} badgeSymbol={beneficiary.networkCode} size="lg" />
      );

    case 'merchant':
      if (beneficiary.merchantName === '') {
        return (
          <AssetMark
            symbol={beneficiary.currency}
            size="lg"
            {...(beneficiary.countryCode === undefined
              ? {}
              : { badgeCountryCode: beneficiary.countryCode })}
          />
        );
      }

      return (
        <FaceMark
          name={beneficiaryTitle(beneficiary, t)}
          countryCode={beneficiary.countryCode}
          tint={tint}
        />
      );

    case 'bank':
      return (
        <FaceMark
          name={beneficiaryTitle(beneficiary, t)}
          countryCode={beneficiary.countryCode}
          tint={tint}
        />
      );
  }
}

type FaceMarkProps = {
  name: string;
  countryCode: string | undefined;
  tint: 'successSubtle' | 'surface';
};

function FaceMark({ name, countryCode, tint }: FaceMarkProps) {
  return (
    <Avatar
      name={name}
      size="lg"
      tint={tint}
      {...(countryCode === undefined ? {} : { badgeCountryCode: countryCode })}
    />
  );
}
