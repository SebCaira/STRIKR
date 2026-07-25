// "Mode Liste": pick a difficulty, then a themed roster, then a time
// limit — then name as many of its players as possible before time runs out.
import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { useI18n } from '../i18n/i18n';
import { useQuizList } from '../game/useQuizList';
import { QUIZ_LISTS, QuizDifficulty, playerFull } from '../data/quizLists';
import RulesModal from '../components/RulesModal';
import { useRulesModal } from '../lib/useRulesModal';

const KEY_ROWS = ['AZERTYUIOP', 'QSDFGHJKLM', 'WXCVBN'];
const DURATIONS = [60, 90, 120, 180];

const DIFFICULTY_META: Record<QuizDifficulty, { icon: string; labelKey: string; color: 'mint' | 'yellow' | 'wrongRed' }> = {
  easy: { icon: '🟢', labelKey: 'quiz_difficulty_easy', color: 'mint' },
  medium: { icon: '🟡', labelKey: 'quiz_difficulty_medium', color: 'yellow' },
  hard: { icon: '🔴', labelKey: 'quiz_difficulty_hard', color: 'wrongRed' },
};

type Step = 'difficulty' | 'themes' | 'time' | 'playing';

export default function QuizListScreen({ onBack }: { onBack?: () => void }) {
  const { colors, accent, fonts } = useTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const rules = useRulesModal('liste');
  const {
    list, status, timeLeft, foundIndexes, foundCount, totalCount,
    startRound, submitGuess, endRoundEarly, rewardsExhausted, rewardedToday, rewardedLimit, lastReward,
  } = useQuizList();

  const [step, setStep] = useState<Step>('difficulty');
  const [difficulty, setDifficulty] = useState<QuizDifficulty | null>(null);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
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

  const backToHub = () => {
    setStep('difficulty');
    setDifficulty(null);
    setSelectedListId(null);
    onBack?.();
  };

  const restart = () => {
    setStep('difficulty');
    setDifficulty(null);
    setSelectedListId(null);
    setAnswer('');
    setError(null);
  };

  // Results screen.
  if (status === 'finished' && list) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top + 14 }}>
        <View style={{ paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {onBack && (
            <Pressable onPress={onBack} hitSlop={8}>
              <Text style={{ fontFamily: fonts.display, fontSize: 16, color: colors.muted }}>←</Text>
            </Pressable>
          )}
          <Text style={{ fontFamily: fonts.display, fontSize: 18, color: colors.ink, flex: 1 }}>{list.title}</Text>
        </View>
        <View style={{ alignItems: 'center', paddingVertical: 14, gap: 6 }}>
          <Text style={{ fontSize: 40 }}>🏁</Text>
          <Text style={{ fontFamily: fonts.display, fontSize: 22, color: colors.ink }}>
            {foundCount}/{totalCount} {t('quiz_found')}
          </Text>
          {lastReward > 0 && <Text style={{ fontFamily: fonts.mono, fontSize: 12, color: colors.muted }}>+{lastReward} 💎</Text>}
        </View>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20, gap: 6 }}>
          {list.players.map((p, i) => {
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
                <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 13, color: colors.ink }}>{playerFull(p)}</Text>
              </View>
            );
          })}
        </ScrollView>
        <View style={{ paddingHorizontal: 20, paddingBottom: Math.max(12, insets.bottom + 8) }}>
          <Pressable onPress={restart} style={{ paddingVertical: 12, backgroundColor: accent.coral, borderWidth: 2, borderColor: colors.border, borderRadius: 12, alignItems: 'center' }}>
            <Text style={{ fontFamily: fonts.display, fontSize: 13, color: '#fff' }}>{t('quiz_new_round')}</Text>
          </Pressable>
        </View>
        <RulesModal visible={rules.visible} onClose={rules.hide} title={t('rules_liste_title')} body={t('rules_liste_body')} />
      </View>
    );
  }

  // Playing screen.
  if (status === 'playing' && list) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top + 14 }}>
        <View style={{ paddingHorizontal: 20 }}>
          <Text style={{ fontFamily: fonts.display, fontSize: 16, color: colors.ink }} numberOfLines={2}>{list.title}</Text>
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
              <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 11, color: '#1a1a1a' }}>{playerFull(list.players[i])}</Text>
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
        <RulesModal visible={rules.visible} onClose={rules.hide} title={t('rules_liste_title')} body={t('rules_liste_body')} />
      </View>
    );
  }

  // Time picker.
  if (step === 'time' && selectedListId) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top + 14, paddingHorizontal: 20 }}>
        <Pressable onPress={() => setStep('themes')} hitSlop={8} style={{ marginBottom: 10 }}>
          <Text style={{ fontFamily: fonts.display, fontSize: 14, color: colors.muted }}>← {t('quiz_back')}</Text>
        </Pressable>
        <Text style={{ fontFamily: fonts.display, fontSize: 22, color: colors.ink }}>{t('quiz_choose_time')}</Text>
        <View style={{ marginTop: 20, gap: 10 }}>
          {DURATIONS.map((d) => (
            <Pressable
              key={d}
              onPress={() => startRound(selectedListId, d)}
              style={{ paddingVertical: 16, backgroundColor: colors.card, borderWidth: 2, borderColor: colors.border, borderRadius: 14, alignItems: 'center' }}
            >
              <Text style={{ fontFamily: fonts.display, fontSize: 16, color: colors.ink }}>{d}s</Text>
            </Pressable>
          ))}
        </View>
        <RulesModal visible={rules.visible} onClose={rules.hide} title={t('rules_liste_title')} body={t('rules_liste_body')} />
      </View>
    );
  }

  // Theme picker.
  if (step === 'themes' && difficulty) {
    const themes = QUIZ_LISTS.filter((l) => l.difficulty === difficulty);
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top + 14, paddingHorizontal: 20 }}>
        <Pressable onPress={() => setStep('difficulty')} hitSlop={8} style={{ marginBottom: 10 }}>
          <Text style={{ fontFamily: fonts.display, fontSize: 14, color: colors.muted }}>← {t('quiz_back')}</Text>
        </Pressable>
        <Text style={{ fontFamily: fonts.display, fontSize: 22, color: colors.ink }}>
          {DIFFICULTY_META[difficulty].icon} {t(DIFFICULTY_META[difficulty].labelKey)}
        </Text>
        <ScrollView contentContainerStyle={{ marginTop: 16, gap: 8, paddingBottom: 20 }}>
          {themes.map((th) => (
            <Pressable
              key={th.id}
              onPress={() => {
                setSelectedListId(th.id);
                setStep('time');
              }}
              style={{ padding: 14, backgroundColor: colors.card, borderWidth: 2, borderColor: colors.border, borderRadius: 12 }}
            >
              <Text style={{ fontFamily: fonts.displayBold, fontSize: 13, color: colors.ink }}>{th.title}</Text>
              <Text style={{ fontFamily: fonts.mono, fontSize: 9, color: colors.muted, marginTop: 2 }}>{th.players.length} {t('quiz_players_count')}</Text>
            </Pressable>
          ))}
        </ScrollView>
        <RulesModal visible={rules.visible} onClose={rules.hide} title={t('rules_liste_title')} body={t('rules_liste_body')} />
      </View>
    );
  }

  // Difficulty picker (entry point).
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top + 14, paddingHorizontal: 20 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {onBack && (
            <Pressable onPress={backToHub} hitSlop={8}>
              <Text style={{ fontFamily: fonts.display, fontSize: 16, color: colors.muted }}>←</Text>
            </Pressable>
          )}
          <Text style={{ fontFamily: fonts.display, fontSize: 22, color: colors.ink }}>{t('jeux_game_liste')}</Text>
        </View>
        <Pressable onPress={rules.show} hitSlop={8} style={{ width: 22, height: 22, borderRadius: 999, backgroundColor: colors.card, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontFamily: fonts.displayBold, fontSize: 11, color: colors.ink }}>?</Text>
        </Pressable>
      </View>
      <Text style={{ fontFamily: fonts.body, fontSize: 12, color: colors.muted, marginTop: 6 }}>{t('quiz_choose_difficulty')}</Text>
      <View style={{ marginTop: 20, gap: 12 }}>
        {(Object.keys(DIFFICULTY_META) as QuizDifficulty[]).map((d) => {
          const meta = DIFFICULTY_META[d];
          const count = QUIZ_LISTS.filter((l) => l.difficulty === d).length;
          return (
            <Pressable
              key={d}
              onPress={() => {
                setDifficulty(d);
                setStep('themes');
              }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18, backgroundColor: accent[meta.color], borderWidth: 2.5, borderColor: colors.border, borderRadius: 16 }}
            >
              <Text style={{ fontSize: 26 }}>{meta.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: fonts.display, fontSize: 16, color: '#1a1a1a' }}>{t(meta.labelKey)}</Text>
                <Text style={{ fontFamily: fonts.mono, fontSize: 10, color: '#1a1a1a', marginTop: 2 }}>{count} {t('quiz_themes_count')}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
      <RulesModal visible={rules.visible} onClose={rules.hide} title={t('rules_liste_title')} body={t('rules_liste_body')} />
    </View>
  );
}
