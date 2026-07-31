// "Ma collection": every player already solved at least once in Devine le
// joueur (solo) shown in color with its rarity border, everyone else shown
// as a locked silhouette. Ownership itself is just `solvedPlayers` (see
// state/solvedPlayers.tsx) — nothing new to store, this screen is a view
// over data that already exists.
import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeContext';
import { useI18n } from '../i18n/i18n';
import { useSolvedPlayers } from '../state/solvedPlayers';
import { PLAYERS, Player } from '../data/players';
import { cardRarity, CardRarity } from '../game/cardCollection';
import { NAT_FR, POS_FR } from '../game/engine';
import { clubYearsLabel } from '../data/playerClubYears';
import PlayerPortrait from '../components/PlayerPortrait';
import ClubShield from '../components/ClubShield';

export default function CollectionScreen() {
  const { colors, accent, fonts } = useTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { solvedPlayers } = useSolvedPlayers();
  const [selected, setSelected] = useState<Player | null>(null);

  const ownedCount = PLAYERS.filter((p) => solvedPlayers.has(p.n)).length;
  const rarityBorder: Record<CardRarity, string> = { commune: colors.border, rare: accent.blue, legendaire: accent.yellow };
  const rarityBg: Record<CardRarity, string> = { commune: colors.card, rare: accent.blue, legendaire: accent.yellow };
  const rarityText: Record<CardRarity, string> = { commune: colors.ink, rare: '#fff', legendaire: '#1a1a1a' };

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
            <Pressable key={p.n} disabled={!owned} onPress={() => setSelected(p)} style={{ width: 78, alignItems: 'center' }}>
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
            </Pressable>
          );
        })}
      </ScrollView>

      <Modal visible={!!selected} transparent animationType="fade" onRequestClose={() => setSelected(null)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,.5)', alignItems: 'center', justifyContent: 'center', padding: 24 }} onPress={() => setSelected(null)}>
          {selected && (
            <Pressable onPress={() => {}} style={{ backgroundColor: colors.bg, borderWidth: 2.5, borderColor: colors.border, borderRadius: 20, padding: 20, maxWidth: 340, width: '100%', alignItems: 'center' }}>
              <PlayerPortrait name={selected.n} size={100} />
              <Text style={{ fontFamily: fonts.display, fontSize: 18, color: colors.ink, marginTop: 10, textAlign: 'center' }}>{selected.n}</Text>
              <View style={{ flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                <View style={{ paddingVertical: 4, paddingHorizontal: 9, backgroundColor: '#1a1a1a', borderRadius: 999 }}>
                  <Text style={{ fontFamily: fonts.mono, fontSize: 9, color: '#fff' }}>{NAT_FR[selected.nat] || selected.nat}</Text>
                </View>
                <View style={{ paddingVertical: 4, paddingHorizontal: 9, backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.border, borderRadius: 999 }}>
                  <Text style={{ fontFamily: fonts.displayBold, fontSize: 9, color: colors.ink }}>{POS_FR[selected.pos] || selected.pos}</Text>
                </View>
                <View style={{ paddingVertical: 4, paddingHorizontal: 9, backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.border, borderRadius: 999 }}>
                  <Text style={{ fontFamily: fonts.displayBold, fontSize: 9, color: colors.ink }}>{selected.dob}</Text>
                </View>
                <View style={{ paddingVertical: 4, paddingHorizontal: 9, backgroundColor: rarityBg[cardRarity(selected)], borderWidth: 1.5, borderColor: colors.border, borderRadius: 999 }}>
                  <Text style={{ fontFamily: fonts.displayBold, fontSize: 9, color: rarityText[cardRarity(selected)], textTransform: 'uppercase' }}>
                    🃏 {t(`card_rarity_${cardRarity(selected)}`)}
                  </Text>
                </View>
              </View>

              <ScrollView style={{ marginTop: 14, maxHeight: 260, width: '100%' }} contentContainerStyle={{ gap: 6 }}>
                {selected.clubs.map((c, i) => (
                  <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 8, backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.border, borderRadius: 10 }}>
                    <ClubShield name={c} size={28} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 12, color: colors.ink }}>{c}</Text>
                      {clubYearsLabel(selected.n, i) && (
                        <Text style={{ fontFamily: fonts.mono, fontSize: 9, color: colors.muted }}>{clubYearsLabel(selected.n, i)}</Text>
                      )}
                    </View>
                  </View>
                ))}
              </ScrollView>

              <Pressable onPress={() => setSelected(null)} style={{ marginTop: 14, paddingVertical: 10, paddingHorizontal: 24, backgroundColor: accent.coral, borderRadius: 12 }}>
                <Text style={{ fontFamily: fonts.displayBold, fontSize: 13, color: '#fff' }}>OK</Text>
              </Pressable>
            </Pressable>
          )}
        </Pressable>
      </Modal>
    </View>
  );
}
