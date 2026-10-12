import { useTranslation } from 'react-i18next';
import { FeatureIntro, openLegalDocument, type IntroBenefit } from '@/shared/ui';
import WealthHero from '@/assets/illustrations/wealth-hero.svg';
import CreditIcon from '@/assets/icons/credit-private.svg';
import InvestmentsIcon from '@/assets/icons/credit-score-grow.svg';
import SavingsIcon from '@/assets/icons/credit-no-checks.svg';
import YieldIcon from '@/assets/icons/credit-limit.svg';

type Props = {
  onContinue: () => void;
};

const HERO_RATIO = 380 / 393;

export function WealthIntro({ onContinue }: Props) {
  const { t } = useTranslation();

  const benefits: IntroBenefit[] = [
    {
      id: 'yield',
      glyph: YieldIcon,
      title: t('wealth.introBenefitYield'),
      description: t('wealth.introBenefitYieldDetail'),
    },
    {
      id: 'investments',
      glyph: InvestmentsIcon,
      title: t('wealth.introBenefitInvestments'),
      description: t('wealth.introBenefitInvestmentsDetail'),
    },
    {
      id: 'credit',
      glyph: CreditIcon,
      title: t('wealth.introBenefitCredit'),
      description: t('wealth.introBenefitCreditDetail'),
    },
    {
      id: 'savings',
      glyph: SavingsIcon,
      title: t('wealth.introBenefitSavings'),
      description: t('wealth.introBenefitSavingsDetail'),
    },
  ];

  return (
    <FeatureIntro
      hero={({ width, height }) => (
        <WealthHero width={width} height={height} preserveAspectRatio="xMidYMid slice" />
      )}
      heroRatio={HERO_RATIO}
      heroLabel={t('wealth.title')}
      benefits={benefits}
      disclosure={t('wealth.introDisclosure')}
      disclosureLink={{
        label: t('wealth.introTermsLink'),
        suffix: t('wealth.introTermsSuffix'),
        onPress: () => void openLegalDocument('terms'),
      }}
      smallPrintPlacement="aboveAction"
      actionLabel={t('common.continue')}
      onContinue={onContinue}
    />
  );
}
