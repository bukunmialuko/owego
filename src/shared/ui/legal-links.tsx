import { StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { openInAppBrowser } from './open-in-app-browser';
import { Text, type TextColor } from './text';
import { VStack } from './stack';

const LEGAL_URL = {
  terms: 'https://www.owego.app/terms-of-use',
  privacy: 'https://www.owego.app/privacy-policy',
} as const;

type Props = {
  prefix: string;
  color?: TextColor;
};

export function LegalLinks({ prefix, color = 'secondary' }: Props) {
  const { t } = useTranslation();

  return (
    <VStack gap="xxs" align="center">
      <Text variant="caption.m" color={color} align="center">
        {prefix}
      </Text>

      <Text variant="caption.m" color={color} align="center">
        <Text
          variant="caption.m"
          color={color}
          style={styles.link}
          onPress={() => void openLegal('terms')}
        >
          {t('common.termsOfUse')}
        </Text>
        {` ${t('common.and')} `}
        <Text
          variant="caption.m"
          color={color}
          style={styles.link}
          onPress={() => void openLegal('privacy')}
        >
          {t('common.privacyPolicy')}
        </Text>
      </Text>
    </VStack>
  );
}

export async function openLegalDocument(document: keyof typeof LEGAL_URL): Promise<void> {
  return openLegal(document);
}

async function openLegal(document: keyof typeof LEGAL_URL): Promise<void> {
  await openInAppBrowser(LEGAL_URL[document]);
}

const styles = StyleSheet.create({
  link: { textDecorationLine: 'underline' },
});
