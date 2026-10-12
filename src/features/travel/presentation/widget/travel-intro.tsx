import { useTranslation } from 'react-i18next';
import { Image } from 'react-native';
import { FeatureIntro, type IntroBenefit } from '@/shared/ui';
import CoveredIcon from '@/assets/icons/travel-covered.svg';
import DataIcon from '@/assets/icons/travel-data.svg';
import FlightsIcon from '@/assets/icons/travel-flights.svg';
import travelHero from '@/assets/images/travel-hero.png';

const HERO_RATIO = 348 / 393;

export function TravelIntro({
  actionLabel,
  onContinue,
}: {
  actionLabel: string;
  onContinue: () => void;
}) {
  const { t } = useTranslation();

  const benefits: IntroBenefit[] = [
    {
      id: 'flights',
      glyph: FlightsIcon,
      title: t('travel.benefitFlights'),
      description: t('travel.benefitFlightsDetail'),
    },
    {
      id: 'data',
      glyph: DataIcon,
      title: t('travel.benefitData'),
      description: t('travel.benefitDataDetail'),
    },
    {
      id: 'covered',
      glyph: CoveredIcon,
      title: t('travel.benefitCovered'),
      description: t('travel.benefitCoveredDetail'),
    },
  ];

  return (
    <FeatureIntro
      hero={({ width, height }) => (
        <Image source={travelHero} style={{ width, height }} resizeMode="cover" />
      )}
      heroRatio={HERO_RATIO}
      heroLabel={t('travel.title')}
      benefits={benefits}
      disclosure={t('travel.introDisclosure')}
      actionLabel={actionLabel}
      onContinue={onContinue}
    />
  );
}
