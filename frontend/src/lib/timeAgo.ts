export function timeAgo(date: Date): string {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return "just nu";
  const minutes = Math.floor(diff / 60);
  if (minutes < 60) return `${minutes} minut${minutes === 1 ? "" : "er"} sedan`;
  const hours = Math.floor(diff / 3600);
  if (hours < 24) return `${hours} timm${hours === 1 ? "e" : "ar"} sedan`;
  const days = Math.floor(diff / 86400);
  if (days < 7) return `${days} dag${days === 1 ? "" : "ar"} sedan`;
  const weeks = Math.floor(days / 7);
  return `${weeks} veck${weeks === 1 ? "a" : "or"} sedan`;
}
