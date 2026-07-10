import { ImpactStatsWidget } from "goodtribes-frontend";

export function Default() {
  return <ImpactStatsWidget totalRaised={128500} totalHours={942} completedTasks={317} />;
}

export function EarlyStage() {
  return <ImpactStatsWidget totalRaised={3200} totalHours={18} completedTasks={4} />;
}
