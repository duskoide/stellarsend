// Minimal structured logger for Workers (stdout → Cloudflare logs / Sentry).

type Level = "debug" | "info" | "warn" | "error";

function log(level: Level, msg: string, meta?: Record<string, unknown>) {
  const line = { level, msg, ts: new Date().toISOString(), ...meta };
  const out = JSON.stringify(line);
  if (level === "error") console.error(out);
  else if (level === "warn") console.warn(out);
  else console.log(out);
}

export const logger = {
  debug: (msg: string, meta?: Record<string, unknown>) =>
    log("debug", msg, meta),
  info: (msg: string, meta?: Record<string, unknown>) => log("info", msg, meta),
  warn: (msg: string, meta?: Record<string, unknown>) => log("warn", msg, meta),
  error: (msg: string, meta?: Record<string, unknown>) =>
    log("error", msg, meta),
};
