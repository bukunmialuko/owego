import { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '@/core/design-system/theme-provider';
import { useConvertedValue } from '@/core/fx/use-converted-value';
import { formatMinor } from '@/core/money/money';
import { PreferenceKey } from '@/core/storage/storage-keys';
import { useBooleanPreference } from '@/core/storage/use-preference';
import { describeYieldChange } from '@/core/yield/describe-yield-change';
import { useYieldOverview } from '@/core/yield/use-yield-overview';
import {
  Banner,
  Button,
  Card,
  Gradient,
  HStack,
  Screen,
  ScreenHeader,
  Skeleton,
  Text,
  VStack,
} from '@/shared/ui';
import { apyOf, depositTargets, withdrawalTargets } from '../domain/entity/move-target';
import { useYieldProducts } from './hook/use-yield';
import { InvestmentRow } from './widget/investment-row';
import { ProductIdentity, useProductIdentity } from './widget/product-identity';
import { YieldSummary } from './widget/yield-summary';
import type { YieldTarget } from '../domain/entity/yield-entity';
import type { YieldParamList } from './yield-param-list';

const HEADER_HEIGHT = 207;

export function YieldScreen() {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<YieldParamList>>();

  const [isBalanceHidden, setIsBalanceHidden] = useBooleanPreference(
    PreferenceKey.BalanceHidden,
    false,
  );
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());

  const overview = useYieldOverview();
  const products = useYieldProducts();
  const chip = useConvertedValue(overview.data);

  const summary = overview.data;
  const positions = summary?.positions ?? [];
  const offered = depositTargets(products.data ?? []);
  const canWithdraw = withdrawalTargets(positions, products.data ?? []).length > 0;
  const canDeposit = products.data === undefined || offered.length > 0;
  const change =
    summary?.change === undefined ? undefined : describeYieldChange(summary.change, i18n.language);

  const toggle = (vaultId: string) => {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(vaultId)) next.delete(vaultId);
      else next.add(vaultId);

      return next;
    });
  };

  return (
    <Screen
      scroll
      clampsOverscroll
      contentStyle={styles.content}
      backdrop={<Gradient name="referHeader" style={[styles.band, { height: HEADER_HEIGHT }]} />}
    >
      <VStack paddingX="lg" gap="xl">
        <ScreenHeader
          title={t('yield.title')}
          tone="surface"
          onBack={() => {
            navigation.goBack();
          }}
        />

        {overview.isError && <Banner tone="error" message={t('errors.common.unknown')} />}

        {overview.isPending ? (
          <VStack gap="md">
            <Skeleton height={40} width="40%" />
            <Skeleton height={16} />
          </VStack>
        ) : (
          summary !== undefined && (
            <YieldSummary
              amount={formatMinor(summary.valueMinor, summary.currency, i18n.language)}
              {...(change === undefined
                ? {}
                : {
                    delta: {
                      label: t('yield.portfolioDelta', {
                        percent: change.percent,
                        amount: change.amount,
                      }),
                      isLoss: change.isLoss,
                    },
                  })}
              {...(chip === undefined ? {} : { chip })}
              isHidden={isBalanceHidden}
              onToggleHidden={() => {
                setIsBalanceHidden(!isBalanceHidden);
              }}
            />
          )
        )}

        <HStack gap="md" align="stretch">
          <Button
            label={t('yield.deposit')}
            icon="add"
            disabled={!canDeposit}
            onPress={() => {
              navigation.navigate('Amount', { kind: 'deposit' });
            }}
            style={styles.half}
          />
          <Button
            label={t('yield.withdraw')}
            variant="brandSubtle"
            icon="arrow-up-circle"
            disabled={!canWithdraw}
            onPress={() => {
              navigation.navigate('Amount', { kind: 'withdrawal' });
            }}
            style={styles.half}
          />
        </HStack>

        {positions.length > 0 && (
          <VStack gap="sm">
            <Text variant="body.mMedium" color="secondary">
              {t('yield.investments')}
            </Text>

            <VStack gap="md">
              {positions.map((position) => {
                const apyPercent = apyOf(position.id, products.data ?? [], positions);

                return (
                  <InvestmentRow
                    key={position.id}
                    position={position}
                    {...(apyPercent === undefined ? {} : { apyPercent })}
                    isExpanded={expanded.has(position.id)}
                    onToggle={() => {
                      toggle(position.id);
                    }}
                    isHidden={isBalanceHidden}
                  />
                );
              })}
            </VStack>
          </VStack>
        )}

        <VStack gap="sm">
          <Text variant="body.mMedium" color="secondary">
            {t('yield.availableProducts')}
          </Text>

          {products.isError && (
            <Banner
              tone="error"
              message={t('errors.common.unknown')}
              action={{
                label: t('common.retry'),
                onPress: () => {
                  void products.refetch();
                },
              }}
            />
          )}

          {products.isPending ? (
            <Skeleton height={88} radius="lg" />
          ) : offered.length === 0 ? (
            !products.isError && (
              <Text variant="body.m" color="tertiary">
                {t('yield.noProducts')}
              </Text>
            )
          ) : (
            offered.map(({ target }) => (
              <ProductCard
                key={target.vaultId}
                target={target}
                onPress={() => {
                  navigation.navigate('Amount', { kind: 'deposit', vaultId: target.vaultId });
                }}
              />
            ))
          )}
        </VStack>
      </VStack>
    </Screen>
  );
}

function ProductCard({ target, onPress }: { target: YieldTarget; onPress: () => void }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const identity = {
    tokenSymbol: target.tokenSymbol,
    variant: 'vault' as const,
    ...(target.apyPercent === undefined ? {} : { apyPercent: target.apyPercent }),
  };
  const { accessibilityLabel } = useProductIdentity(identity);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('yield.depositInto', { product: accessibilityLabel })}
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? theme.opacity.pressed : theme.opacity.full })}
    >
      <Card variant="sunken" radius="lg" padding="md">
        <ProductIdentity {...identity} />
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  band: { left: 0, position: 'absolute', right: 0, top: 0 },
  content: { paddingBottom: 32 },
  half: { flex: 1 },
});
