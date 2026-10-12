import { useTranslation } from 'react-i18next';
import { FeatureIntro, type IntroBenefit } from '@/shared/ui';
import CreditHero from '@/assets/illustrations/credit-hero.svg';
import LimitIcon from '@/assets/icons/credit-limit.svg';
import NoChecksIcon from '@/assets/icons/credit-no-checks.svg';
import PrivateIcon from '@/assets/icons/credit-private.svg';
import ScoreGrowIcon from '@/assets/icons/credit-score-grow.svg';

type Props = {
  limit: string;
  onContinue: () => void;
};

const HERO_RATIO = 348 / 393;

export function ActivationLanding({ limit, onContinue }: Props) {
  const { t } = useTranslation();

  const benefits: IntroBenefit[] = [
    {
      id: 'limit',
      glyph: LimitIcon,
      title: t('credit.benefitLimit', { amount: limit }),
      description: t('credit.benefitLimitDetail'),
    },
    {
      id: 'score',
      glyph: ScoreGrowIcon,
      title: t('credit.benefitScore'),
      description: t('credit.benefitScoreDetail'),
    },
    {
      id: 'private',
      glyph: PrivateIcon,
      title: t('credit.benefitPrivate'),
      description: t('credit.benefitPrivateDetail'),
    },
    {
      id: 'checks',
      glyph: NoChecksIcon,
      title: t('credit.benefitNoChecks'),
      description: t('credit.benefitNoChecksDetail'),
    },
  ];

  return (
    <FeatureIntro
      hero={({ width, height }) => (
        <CreditHero width={width} height={height} preserveAspectRatio="xMidYMid slice" />
      )}
      heroRatio={HERO_RATIO}
      heroLabel={t('credit.title')}
      benefits={benefits}
      disclosure={t('credit.activationDisclosure')}
      actionLabel={t('common.continue')}
      onContinue={onContinue}
    />
  );
}
