// Derives daily/weekly mission completion from real stats — shared by the
// Home summary card and the full Missions screen so the numbers always match.
import { StatsData } from './stats';

export interface MissionSummary {
  mission1Done: boolean;
  mission2Done: boolean;
  mission3Done: boolean;
  doneCount: number;
  xpAcquis: number;
  weeklyGoal: number;
  weeklyProgress: number;
  weeklyDone: boolean;
}

const MISSION_XP = { m1: 200, m2: 150, m3: 250 };
const WEEKLY_GOAL = 7;

export function deriveMissions(stats: StatsData): MissionSummary {
  const mission1Done = stats.gameWinsToday >= 1;
  const mission2Done = stats.fastestSolveMsToday !== null && stats.fastestSolveMsToday <= 30000;
  const mission3Done = stats.firstTryHardWinToday;

  const doneCount = [mission1Done, mission2Done, mission3Done].filter(Boolean).length;
  const xpAcquis =
    (mission1Done ? MISSION_XP.m1 : 0) + (mission2Done ? MISSION_XP.m2 : 0) + (mission3Done ? MISSION_XP.m3 : 0);

  const weeklyProgress = Math.min(100, Math.round((stats.currentStreak / WEEKLY_GOAL) * 100));
  const weeklyDone = stats.currentStreak >= WEEKLY_GOAL;

  return { mission1Done, mission2Done, mission3Done, doneCount, xpAcquis, weeklyGoal: WEEKLY_GOAL, weeklyProgress, weeklyDone };
}
