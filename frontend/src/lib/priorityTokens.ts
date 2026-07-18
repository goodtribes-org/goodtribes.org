export const PRIORITY_TOKEN_VALUES: Record<string, number> = {
  low: 10,
  normal: 20,
  high: 30,
  urgent: 40,
};

export function getPriorityTokenValue(priority: string): number {
  return PRIORITY_TOKEN_VALUES[priority] ?? PRIORITY_TOKEN_VALUES.normal;
}
