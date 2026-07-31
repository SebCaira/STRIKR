// "Mode inverse": a player is given, name as many of their clubs as
// possible before time runs out. Same shape as QuizListScreen.tsx (Mode
// Liste) minus the theme/difficulty step, since the player to guess is
// picked at random inside useClubsQuiz's startRound().
import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { useI18n } from '../i18n/i18n';
import { useClubsQuiz } from '../game/useClubsQuiz';
import RulesModal from '../components/RulesModal';
import { useRulesModal } from '../lib/useRulesModal';

const KEY_ROWS = ['AZERTYUIOP', 'QSDFGHJKLM', 'WXCVBN'];
const DURATIONS = [60, 90, 120, 180];

export default function ClubsQuizScreen({ onBack }: { onBack?: () => void }) {
  const { colors, accent, fonts } = useTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const rules = useRulesModal('clubs_quiz');
  const {
    player, clubs, status, timeLeft, foundIndexes, foundCount, totalCount,
    startRound, submitGuess, endRoundEarly, lastReward,
  } = useClubsQuiz();

  const [answer, setAnswer] = useState('');
  const [error, setError] = useState<string | null>(null);

  const updateAnswer = (next: string) => {
    setAnswer(next);
    setError(null);
  };

  const submit = () => {
    if (!answer.trim() || status !== 'playing') return;
    const { error: err } = submitGuess(answer.trim());
    if (err === 'not_found') {
      setError(t('quiz_error_not_found'));
      return;
    }
    setAnswer('');
    setError(null);
  };

  const restart = () => {
    setAnswer('');
    setError(null);
  };

  // Results screen.
  if (status === 'finished' && player) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top + 14 }}>
        <View style={{ paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {onBack && (
            <Pressable onPress={onBack} hitSlop={8}>
              <Text style={{ fontFamily: fonts.display, fontSize: 16, color: colors.muted }}>←</Text>
            </Pressable>
          )}
          <Text style={{ fontFamily: fonts.display, fontSize: 18, color: colors.ink, flex: 1 }}>{player.n}</Text>
        </View>
        <View style={{ alignItems: 'center', paddingVertical: 14, gap: 6 }}>
          <Text style={{ fontSize: 40 }}>🏁</Text>
          <Text style={{ fontFamily: fonts.display, fontSize: 22, color: colors.ink }}>
            {foundCount}/{totalCount} {t('quiz_found')}
          </Text>
          {lastReward > 0 && <Text style={{ fontFamily: fonts.mono, fontSize: 12, color: colors.muted }}>+{lastReward} 💎</Text>}
        </View>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20, gap: 6 }}>
          {clubs.map((c, i) => {
            const found = foundIndexes.includes(i);
            return (
              <View
                key={i}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 12,
                  backgroundColor: found ? accent.mint : colors.card, borderWidth: 2, borderColor: colors.border, borderRadius: 10,
                }}
              >
                <Text style={{ fontSize: 13 }}>{found ? '✓' : '✕'}</Text>
                <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 13, color: colors.ink }}>{c}</Text>
              </View>
            );
          })}
        </ScrollView>
        <View style={{ paddingHorizontal: 20, paddingBottom: Math.max(12, insets.bottom + 8) }}>
          <Pressable onPress={restart} style={{ paddingVertical: 12, backgroundColor: accent.coral, borderWidth: 2, borderColor: colors.border, borderRadius: 12, alignItems: 'center' }}>
            <Text style={{ fontFamily: fonts.display, fontSize: 13, color: '#fff' }}>{t('quiz_new_round')}</Text>
          </Pressable>
        </View>
        <RulesModal visible={rules.visible} onClose={rules.hide} title={t('rules_clubs_title')} body={t('rules_clubs_body')} />
      </View>
    );
  }

  // Playing screen.
  if (status === 'playing' && player) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top + 14 }}>
        <View style={{ paddingHorizontal: 20 }}>
          <Text style={{ fontFamily: fonts.display, fontSize: 16, color: colors.ink }} numberOfLines={2}>{player.n}</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
            <Text style={{ fontFamily: fonts.displayBold, fontSize: 13, color: colors.ink }}>
              {foundCount}/{totalCount} {t('quiz_found')}
            </Text>
            <View style={{ paddingVertical: 3, paddingHorizontal: 8, backgroundColor: timeLeft <= 10 ? accent.wrongRed : colors.track, borderRadius: 999 }}>
              <Text style={{ fontFamily: fonts.mono, fontSize: 11, color: timeLeft <= 10 ? '#fff' : colors.muted }}>⏱ {timeLeft}s</Text>
            </View>
          </View>
        </View>

        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignContent: 'flex-start' }} style={{ flex: 1 }}>
          {foundIndexes.map((i) => (
            <View key={i} style={{ paddingVertical: 5, paddingHorizontal: 10, backgroundColor: accent.mint, borderWidth: 1.5, borderColor: colors.border, borderRadius: 999 }}>
              <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 11, color: '#1a1a1a' }}>{clubs[i]}</Text>
            </View>
          ))}
        </ScrollView>

        <View style={{ paddingHorizontal: 20, paddingBottom: Math.max(12, insets.bottom + 8) }}>
          <View style={{ backgroundColor: colors.card, borderWidth: 2, borderColor: colors.border, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14 }}>
            <Text numberOfLines={1} style={{ fontFamily: fonts.displayBold, fontSize: 14, color: answer ? colors.ink : colors.muted }}>
              {answer || t('quiz_answer_placeholder')}
            </Text>
          </View>
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

          <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
            <Pressable onPress={endRoundEarly} style={{ paddingVertical: 12, paddingHorizontal: 16, backgroundColor: colors.card, borderWidth: 2, borderColor: colors.border, borderRadius: 12 }}>
              <Text style={{ fontFamily: fonts.display, fontSize: 12, color: colors.ink }}>{t('quiz_stop')}</Text>
            </Pressable>
            <Pressable onPress={submit} style={{ flex: 1, paddingVertical: 12, backgroundColor: accent.coral, borderRadius: 12, alignItems: 'center' }}>
              <Text style={{ fontFamily: fonts.display, fontSize: 13, color: '#fff' }}>{t('duel_validate')}</Text>
            </Pressable>
          </View>
        </View>
        <RulesModal visible={rules.visible} onClose={rules.hide} title={t('rules_clubs_title')} body={t('rules_clubs_body')} />
      </View>
    );
  }

  // Time picker (entry point) — no theme/difficulty step needed, the
  // player to guess is picked at random inside startRound().
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top + 14, paddingHorizontal: 20 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {onBack && (
            <Pressable onPress={onBack} hitSlop={8}>
              <Text style={{ fontFamily: fonts.display, fontSize: 16, color: colors.muted }}>←</Text>
            </Pressable>
          )}
          <Text style={{ fontFamily: fonts.display, fontSize: 22, color: colors.ink }}>{t('jeux_game_clubs_quiz')}</Text>
        </View>
        <Pressable onPress={rules.show} hitSlop={8} style={{ width: 22, height: 22, borderRadius: 999, backgroundColor: colors.card, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontFamily: fonts.displayBold, fontSize: 11, color: colors.ink }}>?</Text>
        </Pressable>
      </View>
      <Text style={{ fontFamily: fonts.body, fontSize: 12, color: colors.muted, marginTop: 6 }}>{t('quiz_choose_time')}</Text>
      <View style={{ marginTop: 20, gap: 10 }}>
        {DURATIONS.map((d) => (
          <Pressable
            key={d}
            onPress={() => startRound(d)}
            style={{ paddingVertical: 16, backgroundColor: colors.card, borderWidth: 2, borderColor: colors.border, borderRadius: 14, alignItems: 'center' }}
          >
            <Text style={{ fontFamily: fonts.display, fontSize: 16, color: colors.ink }}>{d}s</Text>
          </Pressable>
        ))}
      </View>
      <RulesModal visible={rules.visible} onClose={rules.hide} title={t('rules_clubs_title')} body={t('rules_clubs_body')} />
    </View>
  );
}
