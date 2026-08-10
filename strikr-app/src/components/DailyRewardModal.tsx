import React, { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useI18n } from '../i18n/i18n';
import { DailyRewardResult, useStats } from '../state/stats';
import { useAvatar } from '../state/avatar';
import HardShadowBox from './HardShadowBox';

const MILESTONE_DAYS = [10, 30, 50, 100];

// Mounted once at the app root (see App.tsx), same pattern as LevelUpModal —
// pops up automatically the first time Home mounts each day when there's an
// unclaimed reward, independent of which tab that happens to be.
export default function DailyRewardModal() {
  const { colors, accent, fonts } = useTheme();
  const { t } = useI18n();
  const { ready, canClaimDailyReward, nextDailyRewardDay, claimDailyReward } = useStats();
  const { grantFrame } = useAvatar();
  const [visible, setVisible] = useState(false);
  const [result, setResult] = useState<DailyRewardResult | null>(null);
  const shownRef = useRef(false);

  useEffect(() => {
    if (!ready || shownRef.current || !canClaimDailyReward) return;
    shownRef.current = true;
    setVisible(true);
  }, [ready, canClaimDailyReward]);

  const close = () => {
    setVisible(false);
    setResult(null);
  };

  const handleClaim = () => {
    const r = claimDailyReward();
    if (!r) return;
    if (r.milestone?.frameId) grantFrame(r.milestone.frameId);
    setResult(r);
  };

  const isMilestoneDay = MILESTONE_DAYS.includes(nextDailyRewardDay);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,.5)', alignItems: 'center', justifyContent: 'center', padding: 24 }} onPress={result ? close : undefined}>
        <Pressable onPress={(e) => e.stopPropagation()}>
          <HardShadowBox bg={isMilestoneDay ? accent.yellow : colors.card} shadowColor={colors.border} radius={20} offset={5}>
            <View style={{ padding: 26, alignItems: 'center', maxWidth: 300 }}>
              {!result ? (
                <>
                  <Text style={{ fontSize: 40 }}>{isMilestoneDay ? '🏆' : '🎁'}</Text>
                  <Text style={{ fontFamily: fonts.display, fontSize: 20, color: colors.ink, marginTop: 10, textAlign: 'center' }}>
                    {t('daily_reward_title')}
                  </Text>
                  <View style={{ marginTop: 10, paddingVertical: 5, paddingHorizontal: 12, backgroundColor: colors.track, borderRadius: 999 }}>
                    <Text style={{ fontFamily: fonts.mono, fontSize: 11, color: colors.muted, letterSpacing: 0.5 }}>
                      🔥 {t('daily_reward_day_prefix')} {nextDailyRewardDay}
                    </Text>
                  </View>
                  <Pressable
                    onPress={handleClaim}
                    style={{ marginTop: 18, paddingVertical: 13, paddingHorizontal: 30, backgroundColor: accent.coral, borderWidth: 2, borderColor: colors.border, borderRadius: 14 }}
                  >
                    <Text style={{ fontFamily: fonts.display, fontSize: 14, color: '#fff' }}>{t('daily_reward_claim')}</Text>
                  </Pressable>
                </>
              ) : (
                <>
                  <Text style={{ fontSize: 40 }}>{result.milestone ? '🏆' : '✅'}</Text>
                  <Text style={{ fontFamily: fonts.display, fontSize: 18, color: colors.ink, marginTop: 10, textAlign: 'center' }}>
                    {result.milestone ? t('daily_reward_milestone_title') : t('daily_reward_claimed_title')}
                  </Text>
                  <View style={{ marginTop: 14, gap: 8, alignItems: 'center' }}>
                    <View style={{ paddingVertical: 6, paddingHorizontal: 14, backgroundColor: '#1a1a1a', borderRadius: 999 }}>
                      <Text style={{ fontFamily: fonts.displayBold, fontSize: 14, color: accent.mint }}>+{result.diamonds} 💎</Text>
                    </View>
                    {result.xp > 0 && (
                      <View style={{ paddingVertical: 5, paddingHorizontal: 12, backgroundColor: colors.track, borderRadius: 999 }}>
                        <Text style={{ fontFamily: fonts.displayBold, fontSize: 12, color: colors.ink }}>+{result.xp} XP</Text>
                      </View>
                    )}
                    {result.freeHints > 0 && (
                      <View style={{ paddingVertical: 5, paddingHorizontal: 12, backgroundColor: colors.track, borderRadius: 999 }}>
                        <Text style={{ fontFamily: fonts.displayBold, fontSize: 12, color: colors.ink }}>
                          🔎 +{result.freeHints} {t('daily_reward_free_hints_suffix')}
                        </Text>
                      </View>
                    )}
                    {result.milestone?.frameId && (
                      <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 12, color: colors.muted, textAlign: 'center' }}>
                        {t('daily_reward_frame_unlocked')}
                      </Text>
                    )}
                    {result.milestone?.streakFreeze ? (
                      <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 12, color: colors.muted, textAlign: 'center' }}>
                        🧊 {t('daily_reward_streak_freeze_unlocked')}
                      </Text>
                    ) : null}
                  </View>
                  <Pressable
                    onPress={close}
                    style={{ marginTop: 20, paddingVertical: 11, paddingHorizontal: 28, backgroundColor: '#1a1a1a', borderRadius: 12 }}
                  >
                    <Text style={{ fontFamily: fonts.displayBold, fontSize: 13, color: '#fff' }}>{t('daily_reward_close')}</Text>
                  </Pressable>
                </>
              )}
            </View>
          </HardShadowBox>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
