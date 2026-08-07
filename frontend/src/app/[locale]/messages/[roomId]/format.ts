export function timeLabel(iso: string, justNowLabel: string, locale: string) {
  const d = new Date(iso);
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return justNowLabel;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return d.toLocaleDateString(locale === "en" ? "en-GB" : "sv-SE", { day: "numeric", month: "short" });
}

export function initialsOf(name: string | null) {
  return (name ?? "?").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}
