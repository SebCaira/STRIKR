// Hub for every game mode: pick a game, then a way to play it (solo/duel/
// group — group is wired up for every game ahead of time, just disabled
// until that infra exists, so adding it later doesn't mean redesigning
// this screen again).
import React, { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeContext';
import { useI18n } from '../i18n/i18n';
import { TabParamList } from '../navigation/TabNavigator';
import GameScreen from './GameScreen';
import DuelScreen from './DuelScreen';
import SoloGridScreen from './SoloGridScreen';
import ClubGuessScreen from './ClubGuessScreen';
import QuizListScreen from './QuizListScreen';

type GameId = 'main' | 'grille' | 'club' | 'liste';
type ModeId = 'solo' | 'duel' | 'group';

interface GameDef {
  id: GameId;
  icon: string;
  labelKey: string;
  descKey: string;
  modes: Record<ModeId, boolean>;
}

const GAMES: GameDef[] = [
  { id: 'main', icon: '🎯', labelKey: 'jeux_game_main', descKey: 'jeux_game_main_desc', modes: { solo: true, duel: false, group: false } },
  { id: 'grille', icon: '🧩', labelKey: 'jeux_game_grille', descKey: 'jeux_game_grille_desc', modes: { solo: true, duel: true, group: false } },
  { id: 'club', icon: '🏟️', labelKey: 'jeux_game_club', descKey: 'jeux_game_club_desc', modes: { solo: true, duel: false, group: false } },
  { id: 'liste', icon: '📝', labelKey: 'jeux_game_liste', descKey: 'jeux_game_liste_desc', modes: { solo: true, duel: false, group: false } },
];

const MODE_META: Record<ModeId, { icon: string; labelKey: string }> = {
  solo: { icon: '🎯', labelKey: 'jeux_mode_solo' },
  duel: { icon: '⚔️', labelKey: 'jeux_mode_duel' },
  group: { icon: '👥', labelKey: 'jeux_mode_group' },
};

export default function JeuxScreen() {
  const { colors, accent, fonts } = useTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<TabParamList, 'Jeux'>>();

  const [selectedGame, setSelectedGame] = useState<GameId | null>(null);
  const [selectedMode, setSelectedMode] = useState<ModeId | null>(null);
  const [invite, setInvite] = useState<{ userId: string; userName: string } | null>(null);

  // Deep links from HomeScreen/MissionsScreen ("play now") or LeagueScreen
  // ("challenge this friend") skip straight past the hub and mode picker.
  useEffect(() => {
    if (route.params?.mode === 'game') {
      setSelectedGame('main');
      setSelectedMode('solo');
      navigation.setParams({ mode: undefined });
    } else if (route.params?.mode === 'duel') {
      if (route.params.inviteUserId) {
        setInvite({ userId: route.params.inviteUserId, userName: route.params.inviteUserName || '' });
      }
      setSelectedGame('grille');
      setSelectedMode('duel');
      navigation.setParams({ mode: undefined, inviteUserId: undefined, inviteUserName: undefined });
    }
  }, [route.params?.mode, route.params?.inviteUserId, route.params?.inviteUserName, navigation]);

  const backToHub = () => {
    setSelectedGame(null);
    setSelectedMode(null);
    setInvite(null);
  };
  const backToModes = () => {
    setSelectedMode(null);
    setInvite(null);
  };

  // Playing a specific game+mode.
  if (selectedGame && selectedMode) {
    if (selectedGame === 'main' && selectedMode === 'solo') return <GameScreen onBack={backToModes} />;
    if (selectedGame === 'grille' && selectedMode === 'solo') return <SoloGridScreen onExit={backToModes} />;
    if (selectedGame === 'club' && selectedMode === 'solo') return <ClubGuessScreen onBack={backToModes} />;
    if (selectedGame === 'liste' && selectedMode === 'solo') return <QuizListScreen onBack={backToModes} />;
    if (selectedGame === 'grille' && selectedMode === 'duel') {
      return (
        <DuelScreen
          onBack={backToModes}
          inviteUserId={invite?.userId}
          inviteUserName={invite?.userName}
          onInviteConsumed={() => setInvite(null)}
        />
      );
    }
  }

  // Mode picker for the selected game.
  if (selectedGame) {
    const game = GAMES.find((g) => g.id === selectedGame)!;
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top + 14, paddingHorizontal: 20 }}>
        <Pressable onPress={backToHub} hitSlop={8} style={{ marginBottom: 10 }}>
          <Text style={{ fontFamily: fonts.display, fontSize: 14, color: colors.muted }}>← {t('jeux_title')}</Text>
        </Pressable>
        <Text style={{ fontFamily: fonts.display, fontSize: 24, color: colors.ink, letterSpacing: -0.5 }}>
          {game.icon} {t(game.labelKey)}
        </Text>
        <View style={{ marginTop: 20, gap: 10 }}>
          {(Object.keys(MODE_META) as ModeId[]).map((modeId) => {
            const enabled = game.modes[modeId];
            const meta = MODE_META[modeId];
            return (
              <Pressable
                key={modeId}
                disabled={!enabled}
                onPress={() => setSelectedMode(modeId)}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16,
                  backgroundColor: enabled ? colors.card : colors.track,
                  borderWidth: 2, borderColor: colors.border, borderRadius: 14,
                  opacity: enabled ? 1 : 0.5,
                }}
              >
                <Text style={{ fontSize: 22 }}>{meta.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: fonts.display, fontSize: 14, color: colors.ink }}>{t(meta.labelKey)}</Text>
                  {!enabled && <Text style={{ fontFamily: fonts.mono, fontSize: 9, color: colors.muted, marginTop: 2 }}>{t('jeux_mode_soon')}</Text>}
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  }

  // Hub: pick a game.
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top + 14, paddingHorizontal: 20 }}>
      <Text style={{ fontFamily: fonts.display, fontSize: 26, color: colors.ink, letterSpacing: -0.5 }}>{t('jeux_title')}</Text>
      <Text style={{ fontFamily: fonts.body, fontSize: 12, color: colors.muted, marginTop: 4 }}>{t('jeux_subtitle')}</Text>
      <View style={{ marginTop: 20, gap: 12 }}>
        {GAMES.map((game) => (
          <Pressable
            key={game.id}
            onPress={() => setSelectedGame(game.id)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18, backgroundColor: colors.card, borderWidth: 2.5, borderColor: colors.border, borderRadius: 16 }}
          >
            <Text style={{ fontSize: 30 }}>{game.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: fonts.display, fontSize: 16, color: colors.ink }}>{t(game.labelKey)}</Text>
              <Text style={{ fontFamily: fonts.body, fontSize: 11, color: colors.muted, marginTop: 2 }}>{t(game.descKey)}</Text>
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
