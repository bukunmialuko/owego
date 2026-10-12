import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';
import { Button } from './button';
import { EmptyState } from './empty-state';
import { Screen } from './screen';
import { VStack } from './stack';

type Props = {
  onGoHome: () => void;
};

export function ScreenFailure({ onGoHome }: Props) {
  const { t } = useTranslation();

  return (
    <Screen>
      <VStack justify="center" style={styles.fill}>
        <EmptyState
          title={t('errors.screenFailed.title')}
          description={t('errors.screenFailed.body')}
          action={<Button label={t('common.backToHome')} onPress={onGoHome} />}
        />
      </VStack>
    </Screen>
  );
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
