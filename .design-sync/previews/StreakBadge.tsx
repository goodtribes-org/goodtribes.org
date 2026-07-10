import { StreakBadge } from "goodtribes-frontend";

export function ActiveStreak() {
  return <StreakBadge currentWeeks={4} longestWeeks={4} />;
}

export function BelowPersonalBest() {
  return <StreakBadge currentWeeks={2} longestWeeks={9} />;
}

export function NoStreak() {
  return <StreakBadge currentWeeks={0} longestWeeks={6} />;
}
