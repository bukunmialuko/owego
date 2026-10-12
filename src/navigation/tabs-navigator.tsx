import { useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { HomeScreen } from '@/features/home/presentation/home-screen';
import { TravelScreen } from '@/features/travel/presentation/travel-screen';
import { WealthScreen } from '@/features/wealth/presentation/wealth-screen';
import { ActionSheet, TabBar, type ActionSheetItem, type TabId } from '@/shared/ui';
import TabWealth from '@/assets/icons/tab-wealth.svg';
import TabWealthActive from '@/assets/icons/tab-wealth-active.svg';
import TabHome from '@/assets/icons/tab-home.svg';
import TabHomeActive from '@/assets/icons/tab-home-active.svg';
import TabTravel from '@/assets/icons/tab-travel.svg';
import TabTravelActive from '@/assets/icons/tab-travel-active.svg';
import GiftGlyph from '@/assets/icons/gift.svg';
import ArrowDownLeftGlyph from '@/assets/icons/arrow-down-left.svg';
import type { TabParamList } from './param-list';
import { tabScreenLayout } from './screen-error-boundary';

const Tab = createBottomTabNavigator<TabParamList>();

const TAB_ID: Record<keyof TabParamList, TabId> = {
  Home: 'home',
  Wealth: 'wealth',
  Travel: 'travel',
};

const ROUTE_FOR: Record<TabId, keyof TabParamList> = {
  home: 'Home',
  wealth: 'Wealth',
  travel: 'Travel',
};

const ICONS = {
  home: { active: TabHomeActive, inactive: TabHome },
  wealth: { active: TabWealthActive, inactive: TabWealth },
  travel: { active: TabTravelActive, inactive: TabTravel },
} as const;

export function TabsNavigator() {
  const { t } = useTranslation();
  const [isQuickActionsOpen, setIsQuickActionsOpen] = useState(false);

  return (
    <>
      <Tab.Navigator
        screenOptions={{ headerShown: false }}
        screenLayout={tabScreenLayout}
        tabBar={({ state, navigation }) => {
          const current = state.routes[state.index]?.name as keyof TabParamList | undefined;

          return (
            <>
              <TabBar
                items={[
                  { id: 'home', label: t('home.tabHome'), icon: ICONS.home },
                  { id: 'wealth', label: t('home.tabWealth'), icon: ICONS.wealth },
                  { id: 'travel', label: t('home.tabTravel'), icon: ICONS.travel },
                ]}
                activeId={current === undefined ? 'home' : TAB_ID[current]}
                onSelect={(id) => {
                  navigation.navigate(ROUTE_FOR[id]);
                }}
                fabLabel={t('home.openQuickActions')}
                isFabActive={isQuickActionsOpen}
                onPressFab={() => {
                  setIsQuickActionsOpen(true);
                }}
              />

              <ActionSheet
                isOpen={isQuickActionsOpen}
                items={quickActions(t)}
                closeLabel={t('common.close')}
                onClose={() => {
                  setIsQuickActionsOpen(false);
                }}
                onSelect={(id) => {
                  setIsQuickActionsOpen(false);
                  if (id === 'receive') navigation.getParent()?.navigate('Receive');
                  if (id === 'recipients') navigation.getParent()?.navigate('Beneficiaries');
                  if (id === 'settings') navigation.getParent()?.navigate('Profile');
                }}
              />
            </>
          );
        }}
      >
        <Tab.Screen name="Home" component={HomeScreen} />
        <Tab.Screen name="Wealth" component={WealthScreen} />
        <Tab.Screen name="Travel" component={TravelScreen} />
      </Tab.Navigator>
    </>
  );
}

function quickActions(t: TFunction): ActionSheetItem[] {
  return [
    {
      id: 'receive',
      title: t('home.actionReceive'),
      description: t('home.actionReceiveDetail'),
      glyph: ArrowDownLeftGlyph,
      tone: 'success',
    },
    {
      id: 'recipients',
      title: t('home.actionRecipients'),
      description: t('home.actionRecipientsDetail'),
      icon: 'people-outline',
      tone: 'brand',
    },
    {
      id: 'cards',
      title: t('home.actionVirtualCards'),
      description: t('home.actionVirtualCardsDetail'),
      icon: 'card-outline',
      tone: 'error',
      disabled: true,
    },
    {
      id: 'refer',
      title: t('home.actionRefer'),
      description: t('home.actionReferDetail'),
      glyph: GiftGlyph,
      tone: 'brand',
      disabled: true,
    },
    {
      id: 'settings',
      title: t('home.actionSettings'),
      description: t('home.actionSettingsDetail'),
      icon: 'settings-outline',
      tone: 'warning',
    },
  ];
}
