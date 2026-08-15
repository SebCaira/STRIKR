import React, { useCallback, useEffect, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, Share, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { useI18n } from '../i18n/i18n';
import { useGameEngine } from '../game/useGameEngine';
import { useInterstitialAd } from '../game/useInterstitialAd';
import { useStats } from '../state/stats';
import { useAuth } from '../state/auth';
import { supabase } from '../lib/supabase';
import { FORFEIT_COST, GAME_WIN_XP, HINT_COSTS, Level, flagUrl, streakMultiplier } from '../game/engine';
import ClubShield from '../components/ClubShield';
import PlayerPortrait from '../components/PlayerPortrait';
import HardShadowBox from '../components/HardShadowBox';
import RevealCard from '../components/RevealCard';
import RulesModal from '../components/RulesModal';
import { useRulesModal } from '../lib/useRulesModal';
import { clubYearsLabel } from '../data/playerClubYears';
import { cardRarity, CardRarity } from '../game/cardCollection';
import { KEY_ROWS_BY_LANG } from '../lib/keyboard';

export default function GameScreen({ onBack }: { onBack?: () => void } = {}) {
  const { colors, accent, fonts } = useTheme();
  const { t, lang } = useI18n();
  const insets = useSafeAreaInsets();
  const { state, diamonds, suggestions, pickPlayer, setGuess, submit, buyHint, skipOrForfeit, doubleReward, doubling } = useGameEngine();
  const { recordRoundPlayed } = useInterstitialAd();
  const { stats } = useStats();
  const { user } = useAuth();
  const rules = useRulesModal('main');
  const [flashDiamonds, setFlashDiamonds] = useState(false);
  const [resultSnapshot, setResultSnapshot] = useState<{ player: NonNullable<typeof state.player>; solvedAt: number; level: Level; winStreak: number; reward: number; cardBonus: number; isNewCard: boolean; rewardCapped: boolean } | null>(null);
  const [skipConfirmOpen, setSkipConfirmOpen] = useState(false);

  useEffect(() => {
    if (state.status === 'idle') pickPlayer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The "Partager" button on the win screen invites a friend (referral
  // code) rather than spoiling the round's answer — same code already
  // shown in Réglages/Amis, just surfaced at the moment a player is most
  // engaged (right after a win).
  const [myReferralCode, setMyReferralCode] = useState<string | null>(null);
  useEffect(() => {
    if (!user) return;
    supabase
      .from('profiles')
      .select('referral_code')
      .eq('id', user.id)
      .single()
      .then(({ data }) => setMyReferralCode(data?.referral_code ?? null));
  }, [user]);

  const shareInvite = useCallback(() => {
    const message = myReferralCode
      ? `${t('game_share_message_prefix')} ${myReferralCode} ${t('game_share_message_suffix')}`
      : t('game_share_message_no_code');
    Share.share({ message }).catch(() => {});
  }, [myReferralCode, t]);

  useEffect(() => {
    if ((state.status === 'won' || state.status === 'lost') && state.player) {
      setResultSnapshot({
        player: state.player,
        solvedAt: state.solvedAt || 1,
        level: state.level || 'medium',
        winStreak: state.winStreak,
        reward: state.lastReward,
        cardBonus: state.cardBonus,
        isNewCard: state.isNewCard,
        rewardCapped: state.rewardCapped,
      });
    }
  }, [state.status, state.player, state.solvedAt, state.level, state.winStreak, state.lastReward, state.cardBonus, state.isNewCard, state.rewardCapped]);

  useEffect(() => {
    if (state.lowDiamondsFlash > 0) {
      setFlashDiamonds(true);
      const timer = setTimeout(() => setFlashDiamonds(false), 500);
      return () => clearTimeout(timer);
    }
  }, [state.lowDiamondsFlash]);

  const player = state.player;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {onBack && (
              <Pressable onPress={onBack} hitSlop={8}>
                <Text style={{ fontFamily: fonts.display, fontSize: 16, color: colors.muted }}>←</Text>
              </Pressable>
            )}
            <Text style={{ fontFamily: fonts.mono, fontSize: 10, color: accent.coral, letterSpacing: 1.4, textTransform: 'uppercase' }}>{t('game_kicker')}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 5, alignItems: 'center' }}>
            <View style={{ paddingVertical: 4, paddingHorizontal: 9, backgroundColor: accent.yellow, borderWidth: 2, borderColor: colors.border, borderRadius: 999 }}>
              <Text style={{ fontFamily: fonts.displayBold, fontSize: 10, color: '#1a1a1a' }}>🔥 {stats.currentStreak}</Text>
            </View>
            <View style={{ paddingVertical: 4, paddingHorizontal: 9, backgroundColor: flashDiamonds ? accent.wrongRed : accent.mint, borderWidth: 2, borderColor: colors.border, borderRadius: 999 }}>
              <Text style={{ fontFamily: fonts.displayBold, fontSize: 10, color: '#1a1a1a' }}>💎 {diamonds}</Text>
            </View>
            <Pressable onPress={rules.show} hitSlop={8} style={{ width: 22, height: 22, borderRadius: 999, backgroundColor: colors.card, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontFamily: fonts.displayBold, fontSize: 11, color: colors.ink }}>?</Text>
            </Pressable>
          </View>
        </View>
        <Text style={{ fontFamily: fonts.display, fontSize: 26, color: colors.ink, marginTop: 8, letterSpacing: -0.5 }}>
          {t('game_title_pre')}<Text style={{ color: accent.coral }}>{t('game_title_accent')}</Text>{t('game_title_suf')}
        </Text>
        <Text style={{ fontFamily: fonts.body, fontSize: 12, color: colors.muted, marginTop: 4 }}>
          {player ? `${state.revealed} / ${player.clubs.length} ${t('game_reveal_count')}` : '…'}
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4, gap: 5 }}>
        {player &&
          player.clubs.map((c, i) => {
            const revealed = i < state.revealed;
            if (revealed) {
              return (
                <RevealCard key={i} animate={state.animateReveal}>
                  <HardShadowBox bg={colors.card} radius={12} offset={3} style={{ marginBottom: 5 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 6 }}>
                      <ClubShield name={c} size={40} />
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                          <Text numberOfLines={1} style={{ fontFamily: fonts.display, fontSize: 13, color: colors.ink }}>{c}</Text>
                          {player && clubYearsLabel(player.n, i) && (
                            <Text style={{ fontFamily: fonts.mono, fontSize: 9, color: colors.muted }}>{clubYearsLabel(player.n, i)}</Text>
                          )}
                        </View>
                        <Text style={{ fontFamily: fonts.mono, fontSize: 8, color: colors.muted, letterSpacing: 0.8, marginTop: 1 }}>{t('game_club_label')} {i + 1}</Text>
                      </View>
                      <View style={{ width: 20, height: 20, borderRadius: 999, backgroundColor: accent.mint, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ fontFamily: fonts.display, fontSize: 11, color: colors.ink }}>✓</Text>
                      </View>
                    </View>
                  </HardShadowBox>
                </RevealCard>
              );
            }
            return (
              <View
                key={i}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 6, backgroundColor: colors.track, borderWidth: 2, borderColor: 'rgba(0,0,0,.2)', borderStyle: 'dashed', borderRadius: 12, marginBottom: 5 }}
              >
                <View style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: colors.card, borderWidth: 2, borderColor: 'rgba(0,0,0,.2)', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontFamily: fonts.display, fontSize: 16, color: colors.muted }}>?</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: fonts.displayBold, fontSize: 12, color: colors.muted }}>{t('game_locked_club')}</Text>
                  <Text style={{ fontFamily: fonts.monoMedium, fontSize: 8, color: colors.muted, marginTop: 1 }}>{t('game_sticker')} #{i + 1}</Text>
                </View>
              </View>
            );
          })}
      </ScrollView>

      {player && (
        <View style={{ paddingHorizontal: 20, paddingTop: 6 }}>
          <Text style={{ fontFamily: fonts.mono, fontSize: 9, color: colors.muted, letterSpacing: 1.4, marginBottom: 5 }}>{t('game_hints_label')}</Text>
          <View style={{ flexDirection: 'row', gap: 5, flexWrap: 'wrap' }}>
            <HintChip kind="nat" icon="🌍" label={t('hint_nat')} state={state} diamonds={diamonds} buyHint={buyHint}
              revealed={state.hints.nat ? `${flagUrl(player.nat) ? '🏳 ' : ''}${t('nat_' + player.nat)}` : undefined} />
            <HintChip kind="pos" icon="⚽" label={t('hint_pos')} state={state} diamonds={diamonds} buyHint={buyHint}
              revealed={state.hints.pos ? t('pos_' + player.pos) : undefined} />
            <HintChip kind="age" icon="🎂" label={t('hint_age')} state={state} diamonds={diamonds} buyHint={buyHint}
              revealed={state.hints.age ? `${2026 - player.dob} ${t('hint_age_suffix')}` : undefined} />
          </View>
        </View>
      )}

      {state.wrongList.length > 0 && (
        <View style={{ paddingHorizontal: 20, paddingTop: 6, flexDirection: 'row', gap: 5, flexWrap: 'wrap' }}>
          {state.wrongList.map((w, i) => (
            <View key={i} style={{ paddingVertical: 3, paddingHorizontal: 9, backgroundColor: accent.wrongRed, borderWidth: 1.5, borderColor: colors.border, borderRadius: 999 }}>
              <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 9, color: colors.ink }}>✕ {w}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: Math.max(12, insets.bottom + 8) }}>
        {suggestions.length > 0 && state.status === 'playing' && (
          <View style={{ backgroundColor: colors.card, borderWidth: 2, borderColor: colors.border, borderRadius: 12, marginBottom: 6, overflow: 'hidden' }}>
            {suggestions.map((name) => (
              <Pressable
                key={name}
                onPress={() => submit(name)}
                style={{ paddingVertical: 9, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,.06)' }}
              >
                <Text style={{ fontFamily: fonts.displayBold, fontSize: 13, color: colors.ink }}>{name}</Text>
              </Pressable>
            ))}
          </View>
        )}
        <View style={{ backgroundColor: colors.card, borderWidth: 2, borderColor: colors.border, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 9 }}>
          <Text style={{ fontSize: 15 }}>✏️</Text>
          <Text
            numberOfLines={1}
            style={{ flex: 1, fontFamily: fonts.displayBold, fontSize: 14, color: state.guess ? colors.ink : colors.muted }}
          >
            {state.guess || t('game_input_placeholder')}
          </Text>
        </View>

        <View style={{ marginTop: 8, gap: 4 }}>
          {KEY_ROWS_BY_LANG[lang].map((row, ri) => (
            <View key={ri} style={{ flexDirection: 'row', gap: 4 }}>
              {ri === 2 && <View style={{ flex: 0.5 }} />}
              {row.split('').map((l) => (
                <Pressable
                  key={l}
                  onPress={() => setGuess(state.guess + l)}
                  style={{ flex: 1, height: 38, borderRadius: 6, backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Text style={{ fontFamily: fonts.displayBold, fontSize: 11, color: colors.ink }}>{l}</Text>
                </Pressable>
              ))}
              {ri === 2 && <View style={{ flex: 0.5 }} />}
            </View>
          ))}
          <View style={{ flexDirection: 'row', gap: 4 }}>
            <Pressable
              onPress={() => setGuess(state.guess.slice(0, -1))}
              style={{ flex: 1.4, height: 38, borderRadius: 6, backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ fontFamily: fonts.displayBold, fontSize: 11, color: colors.ink }}>{t('game_backspace')}</Text>
            </Pressable>
            <Pressable
              onPress={() => setGuess(state.guess + ' ')}
              style={{ flex: 3, height: 38, borderRadius: 6, backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ fontFamily: fonts.displayBold, fontSize: 11, color: colors.ink }}>{t('game_space')}</Text>
            </Pressable>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
          <Pressable
            onPress={() => {
              if (state.status === 'playing' && diamonds >= FORFEIT_COST) setSkipConfirmOpen(true);
              else skipOrForfeit();
            }}
            style={{ paddingVertical: 12, paddingHorizontal: 14, backgroundColor: colors.card, borderWidth: 2, borderColor: colors.border, borderRadius: 12 }}
          >
            <Text style={{ fontFamily: fonts.display, fontSize: 14, color: colors.ink }}>{state.status === 'playing' ? '↻ 30💎' : '↻'}</Text>
          </Pressable>
          <Pressable onPress={() => submit()} style={{ flex: 1, paddingVertical: 12, backgroundColor: accent.coral, borderWidth: 2, borderColor: colors.border, borderRadius: 12, alignItems: 'center' }}>
            <Text style={{ fontFamily: fonts.display, fontSize: 13, color: '#fff', letterSpacing: 1, textTransform: 'uppercase' }}>{t('game_send')}</Text>
          </Pressable>
        </View>
      </View>

      <Modal visible={skipConfirmOpen} transparent animationType="fade" onRequestClose={() => setSkipConfirmOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,.45)', alignItems: 'center', justifyContent: 'center', padding: 24 }} onPress={() => setSkipConfirmOpen(false)}>
          <Pressable style={{ backgroundColor: colors.bg, borderWidth: 2.5, borderColor: accent.coral, borderRadius: 20, padding: 22, maxWidth: 340, width: '100%' }}>
            <Text style={{ fontFamily: fonts.display, fontSize: 16, color: colors.ink, marginBottom: 10 }}>{t('game_skip_confirm_title')}</Text>
            <Text style={{ fontFamily: fonts.body, fontSize: 13, color: colors.ink, lineHeight: 19 }}>{t('game_skip_confirm_body')}</Text>
            <Pressable
              onPress={() => {
                setSkipConfirmOpen(false);
                skipOrForfeit();
              }}
              style={{ marginTop: 18, paddingVertical: 12, backgroundColor: accent.coral, borderRadius: 12, alignItems: 'center' }}
            >
              <Text style={{ fontFamily: fonts.displayBold, fontSize: 13, color: '#fff' }}>{t('game_skip_confirm_button')}</Text>
            </Pressable>
            <Pressable onPress={() => setSkipConfirmOpen(false)} style={{ marginTop: 10, paddingVertical: 10, alignItems: 'center' }}>
              <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 12, color: colors.muted }}>{t('settings_delete_account_cancel')}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={state.status === 'won' && !!resultSnapshot} animationType="slide">
        {resultSnapshot && (
          <WinOverlay
            player={resultSnapshot.player}
            solvedAt={resultSnapshot.solvedAt}
            level={resultSnapshot.level}
            winStreak={resultSnapshot.winStreak}
            reward={resultSnapshot.reward}
            cardBonus={resultSnapshot.cardBonus}
            isNewCard={resultSnapshot.isNewCard}
            rewardCapped={resultSnapshot.rewardCapped}
            doubled={state.doubled}
            doubling={doubling}
            onDouble={doubleReward}
            onShare={shareInvite}
            onNext={() => recordRoundPlayed(() => pickPlayer())}
          />
        )}
      </Modal>

      <Modal visible={state.status === 'lost' && !!resultSnapshot} animationType="slide">
        {resultSnapshot && <LostOverlay player={resultSnapshot.player} onRetry={() => recordRoundPlayed(() => pickPlayer())} />}
      </Modal>

      <RulesModal visible={rules.visible} onClose={rules.hide} title={t('rules_main_title')} body={t('rules_main_body')} />
    </View>
  );
}

function HintChip({ kind, icon, label, state, diamonds, buyHint, revealed }: any) {
  const { colors, fonts } = useTheme();
  if (revealed !== undefined) {
    return (
      <View style={{ paddingVertical: 5, paddingHorizontal: 9, backgroundColor: '#1a1a1a', borderWidth: 1.5, borderColor: '#1a1a1a', borderRadius: 999, flexDirection: 'row', alignItems: 'center', gap: 5 }}>
        <Text style={{ fontFamily: fonts.displayBold, fontSize: 10, color: '#ffe66b' }}>{revealed}</Text>
      </View>
    );
  }
  const cost = HINT_COSTS[kind as keyof typeof HINT_COSTS];
  const afford = diamonds >= cost;
  return (
    <Pressable
      onPress={() => buyHint(kind)}
      style={{
        paddingVertical: 5, paddingHorizontal: 9, backgroundColor: afford ? colors.card : colors.track,
        borderWidth: 1.5, borderColor: colors.border, borderStyle: 'dashed', borderRadius: 999,
        flexDirection: 'row', alignItems: 'center', gap: 5, opacity: afford ? 1 : 0.5,
      }}
    >
      <Text style={{ fontFamily: fonts.displayBold, fontSize: 10, color: colors.ink }}>{icon} {label}</Text>
      <View style={{ paddingVertical: 1, paddingHorizontal: 5, backgroundColor: '#a8f5c6', borderWidth: 1, borderColor: colors.border, borderRadius: 999 }}>
        <Text style={{ fontFamily: fonts.mono, fontSize: 8, color: '#1a1a1a' }}>💎{cost}</Text>
      </View>
    </Pressable>
  );
}

function WinOverlay({
  player,
  solvedAt,
  level,
  winStreak,
  reward,
  cardBonus,
  isNewCard,
  rewardCapped,
  doubled,
  doubling,
  onDouble,
  onShare,
  onNext,
}: {
  player: any;
  solvedAt: number;
  level: Level;
  winStreak: number;
  reward: number;
  cardBonus: number;
  isNewCard: boolean;
  rewardCapped: boolean;
  doubled: boolean;
  doubling: boolean;
  onDouble: () => void;
  onShare: () => void;
  onNext: () => void;
}) {
  const { colors, accent, fonts } = useTheme();
  const { t, tArray } = useI18n();
  const insets = useSafeAreaInsets();
  const parts = player.n.split(' ');
  const lastName = parts[parts.length - 1].toUpperCase();
  const firstName = parts.slice(0, -1).join(' ');
  const flag = flagUrl(player.nat, 60);
  const natLabel = t('nat_' + player.nat) || player.nat || '';
  const posLabel = t('pos_' + player.pos) || player.pos || '';
  const multiplier = streakMultiplier(winStreak);
  const diamondsReward = reward;
  const ordinals = tArray('ordinals');
  const solveOrd = ordinals[solvedAt - 1] || '';
  const rarity = cardRarity(player);
  const rarityColor: Record<CardRarity, string> = { commune: colors.card, rare: accent.blue, legendaire: accent.yellow };
  const rarityTextColor: Record<CardRarity, string> = { commune: '#1a1a1a', rare: '#fff', legendaire: '#1a1a1a' };

  return (
    <View style={{ flex: 1, backgroundColor: accent.coral }}>
      <View style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 26 + insets.bottom }}
          style={{ flex: 1 }}
        >
          <View style={{ paddingHorizontal: 22, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ paddingVertical: 5, paddingHorizontal: 10, backgroundColor: '#1a1a1a', borderRadius: 999 }}>
              <Text style={{ fontFamily: fonts.mono, fontSize: 10, color: accent.yellow, letterSpacing: 2 }}>{t('game_found')}</Text>
            </View>
            <Pressable onPress={onNext} style={{ paddingVertical: 6, paddingHorizontal: 12, backgroundColor: '#fff', borderWidth: 2, borderColor: '#1a1a1a', borderRadius: 999 }}>
              <Text style={{ fontFamily: fonts.display, fontSize: 10, color: '#1a1a1a' }}>{t('game_new')}</Text>
            </Pressable>
          </View>

          <View style={{ paddingHorizontal: 22, paddingTop: 22, alignItems: 'center' }}>
            <PlayerPortrait name={player.n} size={200} rarity={rarity} />
            <Text style={{ fontFamily: fonts.mono, fontSize: 10, color: '#1a1a1a', letterSpacing: 3, marginTop: 16 }}>✦ {t('game_found_at')} {solveOrd} {t('game_found_club')} ✦</Text>
            <Text style={{ fontFamily: fonts.display, fontSize: 26, color: '#1a1a1a', marginTop: 8, textAlign: 'center' }}>
              {firstName} <Text style={{ color: accent.blue }}>{lastName}</Text>
            </Text>
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
              {flag && (
                <View style={{ paddingVertical: 4, paddingRight: 10, paddingLeft: 4, backgroundColor: '#1a1a1a', borderRadius: 999, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Image source={{ uri: flag }} style={{ width: 22, height: 16, borderRadius: 2 }} />
                  <Text style={{ fontFamily: fonts.mono, fontSize: 10, color: '#fff' }}>{natLabel}</Text>
                </View>
              )}
              <View style={{ paddingVertical: 4, paddingHorizontal: 10, backgroundColor: '#fff', borderWidth: 2, borderColor: '#1a1a1a', borderRadius: 999 }}>
                <Text style={{ fontFamily: fonts.displayBold, fontSize: 10, color: '#1a1a1a' }}>{posLabel}</Text>
              </View>
              <View style={{ paddingVertical: 4, paddingHorizontal: 10, backgroundColor: '#fff', borderWidth: 2, borderColor: '#1a1a1a', borderRadius: 999 }}>
                <Text style={{ fontFamily: fonts.displayBold, fontSize: 10, color: '#1a1a1a' }}>{player.dob}</Text>
              </View>
            </View>
            <View style={{ paddingVertical: 5, paddingHorizontal: 12, backgroundColor: rarityColor[rarity], borderWidth: 2, borderColor: '#1a1a1a', borderRadius: 999, marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontFamily: fonts.displayBold, fontSize: 10, color: rarityTextColor[rarity], letterSpacing: 0.6, textTransform: 'uppercase' }}>
                🃏 {t(`card_rarity_${rarity}`)}
              </Text>
              {isNewCard && (
                <Text style={{ fontFamily: fonts.displayBold, fontSize: 10, color: rarityTextColor[rarity] }}>
                  · {t('card_new')}{cardBonus > 0 ? ` +${cardBonus}💎` : ''}
                </Text>
              )}
            </View>
          </View>

          <View style={{ paddingHorizontal: 22, paddingTop: 12 }}>
            <Text style={{ fontFamily: fonts.mono, fontSize: 10, color: 'rgba(26,26,26,.7)', letterSpacing: 2, marginBottom: 6 }}>
              {t('game_career')} · {player.clubs.length} {t('game_clubs')}
            </Text>
            <View style={{ backgroundColor: '#fff', borderWidth: 2.5, borderColor: '#1a1a1a', borderRadius: 14, padding: 8, flexDirection: 'row', flexWrap: 'wrap', gap: 5, alignItems: 'center', justifyContent: 'center' }}>
              {player.clubs.map((c: string, i: number) => (
                <React.Fragment key={i}>
                  {i > 0 && <Text style={{ color: 'rgba(0,0,0,.3)', fontFamily: fonts.mono, fontSize: 12 }}>→</Text>}
                  <ClubShield name={c} size={36} />
                </React.Fragment>
              ))}
            </View>
          </View>

          <View style={{ paddingHorizontal: 22, paddingTop: 12, flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1, backgroundColor: accent.mint, borderWidth: 2.5, borderColor: '#1a1a1a', borderRadius: 12, padding: 10, alignItems: 'center' }}>
              <Text style={{ fontFamily: fonts.display, fontSize: 20, color: '#1a1a1a' }}>💎+{diamondsReward}</Text>
              <Text style={{ fontFamily: fonts.mono, fontSize: 9, color: 'rgba(0,0,0,.55)', marginTop: 2 }}>
                {rewardCapped ? t('game_reward_capped') : `${t('game_gems')}${multiplier > 1 ? ` ×${multiplier}` : ''}`}
              </Text>
            </View>
            <View style={{ flex: 1, backgroundColor: '#fff', borderWidth: 2.5, borderColor: '#1a1a1a', borderRadius: 12, padding: 10, alignItems: 'center' }}>
              <Text style={{ fontFamily: fonts.display, fontSize: 20, color: '#1a1a1a' }}>+{GAME_WIN_XP}</Text>
              <Text style={{ fontFamily: fonts.mono, fontSize: 9, color: 'rgba(0,0,0,.55)', marginTop: 2 }}>{t('game_xp')}</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: '#1a1a1a', borderWidth: 2.5, borderColor: '#1a1a1a', borderRadius: 12, padding: 10, alignItems: 'center' }}>
              <Text style={{ fontFamily: fonts.display, fontSize: 20, color: '#fff' }}>🔥 {winStreak}</Text>
              <Text style={{ fontFamily: fonts.mono, fontSize: 9, color: 'rgba(255,255,255,.7)', marginTop: 2 }}>{t('game_streak')}</Text>
            </View>
          </View>

          {!rewardCapped && reward + cardBonus > 0 && (
            <View style={{ paddingHorizontal: 22, paddingTop: 10 }}>
              {doubled ? (
                <View style={{ padding: 12, backgroundColor: accent.mint, borderWidth: 2.5, borderColor: '#1a1a1a', borderRadius: 14, alignItems: 'center' }}>
                  <Text style={{ fontFamily: fonts.displayBold, fontSize: 12, color: '#1a1a1a' }}>{t('game_double_done')}</Text>
                </View>
              ) : (
                <Pressable
                  onPress={onDouble}
                  disabled={doubling}
                  style={{ padding: 12, backgroundColor: '#1a1a1a', borderWidth: 2.5, borderColor: '#1a1a1a', borderRadius: 14, alignItems: 'center', opacity: doubling ? 0.7 : 1 }}
                >
                  <Text style={{ fontFamily: fonts.display, fontSize: 12, color: accent.yellow }}>
                    {doubling ? t('game_double_loading') : `📺 ${t('game_double_cta')} (+💎${reward + cardBonus} · +${GAME_WIN_XP} XP)`}
                  </Text>
                </Pressable>
              )}
            </View>
          )}

          <View style={{ paddingHorizontal: 22, paddingTop: 14, flexDirection: 'row', gap: 8 }}>
            <Pressable onPress={onShare} style={{ flex: 1, padding: 14, backgroundColor: '#fff', borderWidth: 2.5, borderColor: '#1a1a1a', borderRadius: 14, alignItems: 'center' }}>
              <Text style={{ fontFamily: fonts.display, fontSize: 12, color: '#1a1a1a' }}>{t('game_share')}</Text>
            </Pressable>
            <Pressable onPress={onNext} style={{ flex: 1.4, padding: 14, backgroundColor: accent.blue, borderWidth: 2.5, borderColor: '#1a1a1a', borderRadius: 14, alignItems: 'center' }}>
              <Text style={{ fontFamily: fonts.display, fontSize: 13, color: '#fff', letterSpacing: 0.4, textTransform: 'uppercase' }}>{t('game_next')}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

function LostOverlay({ player, onRetry }: { player: any; onRetry: () => void }) {
  const { colors, fonts } = useTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const parts = player.n.split(' ');
  const lastName = parts[parts.length - 1].toUpperCase();
  const firstName = parts.slice(0, -1).join(' ');
  const flag = flagUrl(player.nat, 60);
  const natLabel = t('nat_' + player.nat) || player.nat || '';
  const posLabel = t('pos_' + player.pos) || player.pos || '';

  return (
    <View style={{ flex: 1, backgroundColor: '#2b3ff2' }}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 26 + insets.bottom }}
        style={{ flex: 1 }}
      >
        <View style={{ paddingHorizontal: 22, alignItems: 'center' }}>
          <View style={{ paddingVertical: 5, paddingHorizontal: 10, backgroundColor: '#1a1a1a', borderRadius: 999 }}>
            <Text style={{ fontFamily: fonts.mono, fontSize: 10, color: '#ffcae0', letterSpacing: 2 }}>{t('game_lost')}</Text>
          </View>
          <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 12, color: 'rgba(255,255,255,.85)', marginTop: 10 }}>{t('game_lost_sub')}</Text>
        </View>

        <View style={{ paddingHorizontal: 22, paddingTop: 22, alignItems: 'center' }}>
          <PlayerPortrait name={player.n} size={200} />
          <Text style={{ fontFamily: fonts.mono, fontSize: 10, color: 'rgba(255,255,255,.85)', letterSpacing: 3, marginTop: 16 }}>✦ {t('game_lost_answer')} ✦</Text>
          <Text style={{ fontFamily: fonts.display, fontSize: 26, color: '#fff', marginTop: 8, textAlign: 'center' }}>
            {firstName} <Text style={{ color: '#ffe66b' }}>{lastName}</Text>
          </Text>
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
            {flag && (
              <View style={{ paddingVertical: 4, paddingRight: 10, paddingLeft: 4, backgroundColor: '#1a1a1a', borderRadius: 999, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Image source={{ uri: flag }} style={{ width: 22, height: 16, borderRadius: 2 }} />
                <Text style={{ fontFamily: fonts.mono, fontSize: 10, color: '#fff' }}>{natLabel}</Text>
              </View>
            )}
            <View style={{ paddingVertical: 4, paddingHorizontal: 10, backgroundColor: '#fff', borderWidth: 2, borderColor: '#1a1a1a', borderRadius: 999 }}>
              <Text style={{ fontFamily: fonts.displayBold, fontSize: 10, color: '#1a1a1a' }}>{posLabel}</Text>
            </View>
            <View style={{ paddingVertical: 4, paddingHorizontal: 10, backgroundColor: '#fff', borderWidth: 2, borderColor: '#1a1a1a', borderRadius: 999 }}>
              <Text style={{ fontFamily: fonts.displayBold, fontSize: 10, color: '#1a1a1a' }}>{player.dob}</Text>
            </View>
          </View>
        </View>

        <View style={{ paddingHorizontal: 22, paddingTop: 12 }}>
          <Text style={{ fontFamily: fonts.mono, fontSize: 10, color: 'rgba(255,255,255,.7)', letterSpacing: 2, marginBottom: 6 }}>
            {t('game_career')} · {player.clubs.length} {t('game_clubs')}
          </Text>
          <View style={{ backgroundColor: '#fff', borderWidth: 2.5, borderColor: '#1a1a1a', borderRadius: 14, padding: 8, flexDirection: 'row', flexWrap: 'wrap', gap: 5, alignItems: 'center', justifyContent: 'center' }}>
            {player.clubs.map((c: string, i: number) => (
              <React.Fragment key={i}>
                {i > 0 && <Text style={{ color: 'rgba(0,0,0,.3)', fontFamily: fonts.mono, fontSize: 12 }}>→</Text>}
                <ClubShield name={c} size={36} />
              </React.Fragment>
            ))}
          </View>
        </View>

        <View style={{ paddingHorizontal: 22, paddingTop: 22 }}>
          <Pressable onPress={onRetry} style={{ padding: 14, backgroundColor: '#ffe66b', borderWidth: 2.5, borderColor: '#1a1a1a', borderRadius: 14, alignItems: 'center' }}>
            <Text style={{ fontFamily: fonts.display, fontSize: 13, color: '#1a1a1a', letterSpacing: 0.4, textTransform: 'uppercase' }}>{t('game_retry')}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
