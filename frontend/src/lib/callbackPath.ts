// Turns a callbackUrl (Auth.js hands newUser an absolute URL, our own links
// a path) into a same-site path that's safe to redirect to, or null.
// Anything pointing at another host, or a protocol-relative "//evil", is
// dropped, so a crafted link can't bounce someone off the site.
export function safeCallbackPath(raw: string | null | undefined, origin: string): string | null {
  if (!raw) return null;
  try {
    const url = new URL(raw, origin);
    if (url.origin !== new URL(origin).origin) return null;
    const path = `${url.pathname}${url.search}`;
    return path.startsWith("/") && !path.startsWith("//") ? path : null;
  } catch {
    return null;
  }
}

// The start page ("/", "/sv", "/en") isn't a destination worth returning
// to — it's where a visitor lands when nothing else was asked for.
export function isStartPage(path: string): boolean {
  return /^\/(sv|en)?\/?$/.test(path.split("?")[0]);
}
