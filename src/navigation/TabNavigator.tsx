import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { createBottomTabNavigator, BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import HomeScreen from '../screens/HomeScreen';
import JeuxScreen from '../screens/JeuxScreen';
import LeagueScreen from '../screens/LeagueScreen';
import ProfilScreen from '../screens/ProfilScreen';
import { useTheme } from '../theme/ThemeContext';
import { useI18n } from '../i18n/i18n';

export type TabParamList = {
  Home: undefined;
  // mode/inviteUserId/inviteUserName: set by HomeScreen/MissionsScreen (deep
  // link straight to the main game) or LeagueScreen's "challenge" button
  // (deep link straight to sending a duel invite) so JeuxScreen can jump
  // past its own hub/mode picker.
  Jeux: { mode?: 'game' | 'duel'; inviteUserId?: string; inviteUserName?: string } | undefined;
  League: undefined;
  Profil: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

const TAB_META: Record<keyof TabParamList, { icon: string; labelKey: string }> = {
  Home: { icon: '🏠', labelKey: 'nav_home' },
  Jeux: { icon: '🎮', labelKey: '' },
  League: { icon: '🏆', labelKey: 'nav_league' },
  Profil: { icon: '👤', labelKey: 'nav_profil' },
};

function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const { colors, accent, fonts } = useTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: colors.card,
        borderTopWidth: 2.5,
        borderTopColor: colors.border,
        paddingTop: 8,
        paddingBottom: Math.max(10, insets.bottom + 6),
        paddingHorizontal: 10,
        alignItems: 'center',
      }}
    >
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const meta = TAB_META[route.name as keyof TabParamList];
        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
        };

        if (route.name === 'Jeux') {
          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              style={{
                width: 52,
                height: 52,
                borderRadius: 999,
                backgroundColor: accent.coral,
                borderWidth: 2.5,
                borderColor: colors.border,
                alignItems: 'center',
                justifyContent: 'center',
                transform: [{ translateY: -4 }],
                marginHorizontal: 4,
                shadowColor: colors.border,
                shadowOffset: { width: 3, height: 3 },
                shadowOpacity: 1,
                shadowRadius: 0,
                elevation: 4,
              }}
            >
              <Text style={{ fontSize: 24 }}>{meta.icon}</Text>
            </Pressable>
          );
        }

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            style={{ flex: 1, alignItems: 'center', gap: 2, paddingVertical: 6, paddingHorizontal: 4 }}
          >
            <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.35 }}>{meta.icon}</Text>
            <Text
              style={{
                fontFamily: fonts.mono,
                fontSize: 9,
                letterSpacing: 0.6,
                color: focused ? accent.coral : colors.muted,
              }}
            >
              {t(meta.labelKey)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function TabNavigator() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }} tabBar={(props) => <CustomTabBar {...props} />}>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Jeux" component={JeuxScreen} />
      <Tab.Screen name="League" component={LeagueScreen} />
      <Tab.Screen name="Profil" component={ProfilScreen} />
    </Tab.Navigator>
  );
}
