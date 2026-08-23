type Level = "debug" | "info" | "warn" | "error"

const LEVEL_WEIGHT: Record<Level, number> = { debug: 0, info: 1, warn: 2, error: 3 }
const threshold = LEVEL_WEIGHT[(process.env.LOG_LEVEL as Level) ?? "info"] ?? LEVEL_WEIGHT.info

// Plain JSON-lines output, no dependency — good enough for any log
// aggregator (Loki/CloudWatch/etc.) to parse level/message/fields, without
// pulling in pino for what today is a single-pod-tier amount of log volume.
function emit(level: Level, message: string, fields?: Record<string, unknown>) {
  if (LEVEL_WEIGHT[level] < threshold) return
  const line = JSON.stringify({ level, message, time: new Date().toISOString(), ...fields })
  if (level === "error") console.error(line)
  else if (level === "warn") console.warn(line)
  else console.log(line)
}

export const logger = {
  debug: (message: string, fields?: Record<string, unknown>) => emit("debug", message, fields),
  info: (message: string, fields?: Record<string, unknown>) => emit("info", message, fields),
  warn: (message: string, fields?: Record<string, unknown>) => emit("warn", message, fields),
  error: (message: string, fields?: Record<string, unknown>) => emit("error", message, fields),
}
