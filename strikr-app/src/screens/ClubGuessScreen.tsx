// "Devine le club": 6 attempts, each compared on nationality/founding
// year/stadium capacity/direction+distance — same idea as Wordle-style
// geography guessing games, applied to football clubs.
import React, { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { useI18n } from '../i18n/i18n';
import { useClubGuess, ClubGuessRow, MAX_GUESSES } from '../game/useClubGuess';
import { CLUB_DATA } from '../data/clubData';
import { stripAcc, clubColor, clubInit } from '../game/engine';
import { flagEmoji } from '../lib/flags';
import { getClubLogo } from '../lib/wikiLookup';
import RulesModal from '../components/RulesModal';
import { useRulesModal } from '../lib/useRulesModal';

const KEY_ROWS = ['AZERTYUIOP', 'QSDFGHJKLM', 'WXCVBN'];
const CREST_SIZE = 132;

function Crest({ name, revealFraction }: { name: string; revealFraction: number }) {
  const { colors, fonts } = useTheme();
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setUrl(null);
    getClubLogo(name).then((u) => {
      if (!cancelled) setUrl(u);
    });
    return () => {
      cancelled = true;
    };
  }, [name]);

  if (!url) {
    return (
      <View style={{ width: CREST_SIZE, height: CREST_SIZE, borderRadius: 20, backgroundColor: clubColor(name), alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontFamily: fonts.display, fontSize: 40, color: '#fff' }}>{clubInit(name)}</Text>
      </View>
    );
  }

  const revealedWidth = Math.max(18, CREST_SIZE * revealFraction);
  return (
    <View style={{ width: CREST_SIZE, height: CREST_SIZE, borderRadius: 20, backgroundColor: colors.card, borderWidth: 2.5, borderColor: colors.border, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: revealedWidth, height: CREST_SIZE, overflow: 'hidden' }}>
        <Image
          source={{ uri: url }}
          style={{ width: CREST_SIZE, height: CREST_SIZE, transform: [{ scaleX: revealFraction >= 1 ? 1 : -1 }] }}
          resizeMode="contain"
        />
      </View>
    </View>
  );
}

function Chip({ icon, value, match, label }: { icon: string; value: string; match: boolean | null; label: string }) {
  const { colors, accent, fonts } = useTheme();
  const bg = match === true ? accent.mint : colors.card;
  return (
    <View style={{ alignItems: 'center', gap: 3, flex: 1 }}>
      <View style={{ width: 52, height: 52, borderRadius: 999, backgroundColor: bg, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 16 }}>{icon}</Text>
        <Text style={{ fontFamily: fonts.displayBold, fontSize: 9, color: colors.ink }} numberOfLines={1}>{value}</Text>
      </View>
      <Text style={{ fontFamily: fonts.mono, fontSize: 8, color: colors.muted, letterSpacing: 0.6 }}>{label}</Text>
    </View>
  );
}

function GuessRow({ row }: { row: ClubGuessRow }) {
  const { colors, fonts } = useTheme();
  const { t } = useI18n();
  const compareIcon = (c: 'match' | 'up' | 'down') => (c === 'match' ? '✓' : c === 'up' ? '↑' : '↓');
  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={{ fontFamily: fonts.displayBold, fontSize: 13, color: colors.ink, marginBottom: 6, textAlign: 'center' }}>{row.name}</Text>
      <View style={{ flexDirection: 'row', gap: 4 }}>
        <Chip icon={flagEmoji(row.nat)} value={row.nat} match={row.natMatch} label={t('club_chip_nat')} />
        <Chip icon={compareIcon(row.foundedCompare)} value={String(row.founded)} match={row.foundedCompare === 'match'} label={t('club_chip_est')} />
        <Chip icon={compareIcon(row.capacityCompare)} value={`${Math.round(row.capacity / 1000)}k`} match={row.capacityCompare === 'match'} label={t('club_chip_cap')} />
        <Chip icon={row.direction} value="" match={null} label={t('club_chip_dir')} />
        <Chip icon="📍" value={`${row.distanceKm}`} match={row.distanceKm === 0} label={t('club_chip_dist')} />
      </View>
    </View>
  );
}

export default function ClubGuessScreen({ onBack }: { onBack?: () => void }) {
  const { colors, accent, fonts } = useTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const { mysteryName, guesses, status, attempt, submitGuess, newRound, rewardsExhausted, rewardedToday, rewardedLimit, lastReward } = useClubGuess();
  const rules = useRulesModal('club');

  const [answer, setAnswer] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showBadge, setShowBadge] = useState(true);

  const updateAnswer = (next: string) => {
    setAnswer(next);
    setError(null);
  };

  const submit = () => {
    if (!answer.trim() || status !== 'playing') return;
    const { error: err } = submitGuess(answer.trim());
    if (err) {
      setError(err === 'already_guessed' ? t('club_error_used') : t('club_error_unknown'));
      return;
    }
    setAnswer('');
    setError(null);
  };

  const clubNames = Object.keys(CLUB_DATA);
  const suggestions =
    answer.trim().length >= 2
      ? clubNames.filter((n) => stripAcc(n.toLowerCase()).includes(stripAcc(answer.trim().toLowerCase()))).slice(0, 5)
      : [];

  const revealFraction = status === 'playing' ? 0.15 + 0.85 * ((attempt - 1) / MAX_GUESSES) : 1;

  if (status === 'won' || status === 'lost') {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top + 14, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        {onBack && (
          <Pressable onPress={onBack} hitSlop={8} style={{ position: 'absolute', top: insets.top + 14, left: 16, width: 30, height: 30, borderRadius: 999, backgroundColor: colors.card, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontFamily: fonts.display, fontSize: 14, color: colors.ink }}>←</Text>
          </Pressable>
        )}
        <Crest name={mysteryName} revealFraction={1} />
        <Text style={{ fontSize: 40 }}>{status === 'won' ? '🏆' : '😔'}</Text>
        <Text style={{ fontFamily: fonts.display, fontSize: 22, color: colors.ink, textAlign: 'center' }}>{mysteryName}</Text>
        {status === 'won' && lastReward > 0 && (
          <Text style={{ fontFamily: fonts.mono, fontSize: 12, color: colors.muted }}>+{lastReward} 💎</Text>
        )}
        <Pressable onPress={newRound} style={{ paddingVertical: 12, paddingHorizontal: 24, backgroundColor: accent.coral, borderWidth: 2, borderColor: colors.border, borderRadius: 12 }}>
          <Text style={{ fontFamily: fonts.display, fontSize: 13, color: '#fff' }}>{t('club_new_round')}</Text>
        </Pressable>
        <RulesModal visible={rules.visible} onClose={rules.hide} title={t('rules_club_title')} body={t('rules_club_body')} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top + 14 }}>
      <View style={{ paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {onBack && (
            <Pressable onPress={onBack} hitSlop={8}>
              <Text style={{ fontFamily: fonts.display, fontSize: 16, color: colors.muted }}>←</Text>
            </Pressable>
          )}
          <View>
            <Text style={{ fontFamily: fonts.display, fontSize: 14, color: colors.ink }}>
              {t('club_attempt')} {attempt}/{MAX_GUESSES}
            </Text>
            <Text style={{ fontFamily: fonts.mono, fontSize: 9, color: colors.muted, marginTop: 2 }}>
              {rewardsExhausted ? t('club_rewards_done') : `💎 ${rewardedToday}/${rewardedLimit} ${t('club_rewards_left')}`}
            </Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Pressable onPress={() => setShowBadge((v) => !v)} style={{ paddingVertical: 6, paddingHorizontal: 10, backgroundColor: colors.card, borderWidth: 2, borderColor: colors.border, borderRadius: 999 }}>
            <Text style={{ fontFamily: fonts.mono, fontSize: 9, color: colors.ink }}>{showBadge ? t('club_hide_badge') : t('club_show_badge')}</Text>
          </Pressable>
          <Pressable onPress={rules.show} hitSlop={8} style={{ width: 22, height: 22, borderRadius: 999, backgroundColor: colors.card, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontFamily: fonts.displayBold, fontSize: 11, color: colors.ink }}>?</Text>
          </Pressable>
        </View>
      </View>

      <View style={{ alignItems: 'center', paddingVertical: 14 }}>
        {showBadge ? <Crest name={mysteryName} revealFraction={revealFraction} /> : (
          <View style={{ width: CREST_SIZE, height: CREST_SIZE, borderRadius: 20, backgroundColor: colors.card, borderWidth: 2.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 44, color: colors.muted }}>?</Text>
          </View>
        )}
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 8 }}>
        {guesses.map((g) => (
          <GuessRow key={g.name} row={g} />
        ))}
      </ScrollView>

      <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: Math.max(12, insets.bottom + 8) }}>
        <View style={{ backgroundColor: colors.card, borderWidth: 2, borderColor: colors.border, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14 }}>
          <Text numberOfLines={1} style={{ fontFamily: fonts.displayBold, fontSize: 14, color: answer ? colors.ink : colors.muted }}>
            {answer || t('club_answer_placeholder')}
          </Text>
        </View>
        {suggestions.length > 0 && (
          <View style={{ marginTop: 6, backgroundColor: colors.card, borderWidth: 2, borderColor: colors.border, borderRadius: 12, overflow: 'hidden' }}>
            {suggestions.map((s) => (
              <Pressable key={s} onPress={() => updateAnswer(s)} style={{ paddingVertical: 9, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,.06)' }}>
                <Text style={{ fontFamily: fonts.displayBold, fontSize: 13, color: colors.ink }}>{s}</Text>
              </Pressable>
            ))}
          </View>
        )}
        {error && <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 11, color: accent.coral, marginTop: 8 }}>{error}</Text>}

        <View style={{ marginTop: 10, gap: 4 }}>
          {KEY_ROWS.map((row, ri) => (
            <View key={ri} style={{ flexDirection: 'row', gap: 4 }}>
              {ri === 2 && <View style={{ flex: 0.5 }} />}
              {row.split('').map((l) => (
                <Pressable
                  key={l}
                  onPress={() => updateAnswer(answer + l)}
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
              onPress={() => updateAnswer(answer.slice(0, -1))}
              style={{ flex: 1.4, height: 38, borderRadius: 6, backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ fontFamily: fonts.displayBold, fontSize: 11, color: colors.ink }}>{t('game_backspace')}</Text>
            </Pressable>
            <Pressable
              onPress={() => updateAnswer(answer + ' ')}
              style={{ flex: 3, height: 38, borderRadius: 6, backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ fontFamily: fonts.displayBold, fontSize: 11, color: colors.ink }}>{t('game_space')}</Text>
            </Pressable>
          </View>
        </View>

        <Pressable onPress={submit} style={{ marginTop: 12, paddingVertical: 12, backgroundColor: accent.coral, borderRadius: 12, alignItems: 'center' }}>
          <Text style={{ fontFamily: fonts.display, fontSize: 13, color: '#fff' }}>{t('duel_validate')}</Text>
        </Pressable>
      </View>
      <RulesModal visible={rules.visible} onClose={rules.hide} title={t('rules_club_title')} body={t('rules_club_body')} />
    </View>
  );
}
