// "Ma collection": every player already solved at least once in Devine le
// joueur (solo) shown in color with its rarity border, everyone else shown
// as a locked silhouette. Ownership itself is just `solvedPlayers` (see
// state/solvedPlayers.tsx) — nothing new to store, this screen is a view
// over data that already exists.
import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeContext';
import { useI18n } from '../i18n/i18n';
import { useSolvedPlayers } from '../state/solvedPlayers';
import { PLAYERS } from '../data/players';
import { cardRarity, CardRarity } from '../game/cardCollection';
import PlayerPortrait from '../components/PlayerPortrait';

export default function CollectionScreen() {
  const { colors, accent, fonts } = useTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { solvedPlayers } = useSolvedPlayers();

  const ownedCount = PLAYERS.filter((p) => solvedPlayers.has(p.n)).length;
  const rarityBorder: Record<CardRarity, string> = { commune: colors.border, rare: accent.blue, legendaire: accent.yellow };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top + 14 }}>
      <View style={{ paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={{ fontFamily: fonts.displayBold, fontSize: 22, color: colors.ink }}>←</Text>
        </Pressable>
        <Text style={{ fontFamily: fonts.display, fontSize: 24, color: colors.ink, letterSpacing: -0.4, flex: 1 }}>
          🃏 {t('collection_title')}
        </Text>
        <View style={{ paddingVertical: 5, paddingHorizontal: 10, backgroundColor: accent.mint, borderWidth: 2, borderColor: colors.border, borderRadius: 999 }}>
          <Text style={{ fontFamily: fonts.displayBold, fontSize: 12, color: '#1a1a1a' }}>{ownedCount}/{PLAYERS.length}</Text>
        </View>
      </View>
      <Text style={{ fontFamily: fonts.body, fontSize: 12, color: colors.muted, paddingHorizontal: 20, marginTop: 4 }}>
        {t('collection_subtitle')}
      </Text>

      <ScrollView contentContainerStyle={{ padding: 20, flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingBottom: 32 + insets.bottom }}>
        {PLAYERS.map((p) => {
          const owned = solvedPlayers.has(p.n);
          const rarity = cardRarity(p);
          return (
            <View key={p.n} style={{ width: 78, alignItems: 'center' }}>
              {owned ? (
                <View style={{ borderWidth: 3, borderColor: rarityBorder[rarity], borderRadius: 999 }}>
                  <PlayerPortrait name={p.n} size={64} />
                </View>
              ) : (
                <View
                  style={{
                    width: 64, height: 64, borderRadius: 999, backgroundColor: colors.card,
                    borderWidth: 2, borderColor: colors.muted, borderStyle: 'dashed',
                    alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontFamily: fonts.display, fontSize: 22, color: colors.muted }}>?</Text>
                </View>
              )}
              <Text
                numberOfLines={1}
                style={{
                  fontFamily: fonts.mono, fontSize: 9, marginTop: 5, textAlign: 'center',
                  color: owned ? colors.ink : colors.muted,
                }}
              >
                {owned ? p.n.split(' ').slice(-1)[0] : '???'}
              </Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
