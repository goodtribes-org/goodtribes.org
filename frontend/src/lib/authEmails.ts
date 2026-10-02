// The two emails NextAuth sends: the magic link and the welcome mail after
// the first sign-in. NextAuth gives no locale, so it's read from the address
// the person is headed back to — the login and signup pages always pass a
// locale-prefixed callbackUrl. Anything else falls back to Swedish.

type EmailLocale = "sv" | "en";

export function emailLocaleFromPath(path: string | null | undefined): EmailLocale {
  if (!path) return "sv";
  let pathname = path;
  try {
    pathname = new URL(path, "https://goodtribes.org").pathname;
  } catch {
    // keep the raw value
  }
  return /^\/en(\/|$)/.test(pathname) ? "en" : "sv";
}

// The magic link carries the callbackUrl as a query parameter.
export function emailLocaleFromMagicLink(url: string): EmailLocale {
  try {
    return emailLocaleFromPath(new URL(url).searchParams.get("callbackUrl"));
  } catch {
    return "sv";
  }
}

const COPY = {
  sv: {
    signInSubject: (host: string) => `Logga in på ${host}`,
    signInBody: "Klicka på knappen för att logga in på GoodTribes.",
    signInButton: "Logga in →",
    signInIgnore: "Om du inte bad om det här kan du strunta i mejlet.",
    welcomeSubject: "Välkommen till GoodTribes!",
    welcomeHeading: "Välkommen till GoodTribes 👋",
    welcomeBody:
      "Här förverkligar människor idéer som gör världen bättre, tillsammans. Berätta om din dröm så hjälper AI-guiden dig att göra den till ett projekt – eller hitta ett projekt som behöver just det du kan.",
    welcomeButton: "Starta ett projekt →",
    welcomeMore: (projects: string) => `Eller ${projects} och se vad andra gör.`,
    welcomeProjects: "titta bland projekten",
  },
  en: {
    signInSubject: (host: string) => `Sign in to ${host}`,
    signInBody: "Click the button below to sign in to GoodTribes.",
    signInButton: "Sign in →",
    signInIgnore: "If you didn't request this, you can safely ignore this email.",
    welcomeSubject: "Welcome to GoodTribes!",
    welcomeHeading: "Welcome to GoodTribes 👋",
    welcomeBody:
      "This is where people make ideas that improve the world real, together. Tell us about your dream and the AI guide helps you turn it into a project – or find a project that needs exactly what you can do.",
    welcomeButton: "Start a project →",
    welcomeMore: (projects: string) => `Or ${projects} and see what others are doing.`,
    welcomeProjects: "browse the projects",
  },
} as const;

export function magicLinkEmail(locale: EmailLocale, url: string, host: string) {
  const c = COPY[locale];
  return {
    subject: c.signInSubject(host),
    html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;color:#1a2e2a">
  <p style="color:#4a5e5a;line-height:1.6">${c.signInBody}</p>
  <a href="${url}" style="display:inline-block;margin-top:12px;padding:12px 24px;background:#e85d4a;color:#fff;border-radius:6px;text-decoration:none;font-weight:600">${c.signInButton}</a>
  <p style="margin-top:24px;font-size:13px;color:#8aa8a0">${c.signInIgnore}</p>
</div>`,
  };
}

export function welcomeEmail(locale: EmailLocale, appUrl: string) {
  const c = COPY[locale];
  const projects = `<a href="${appUrl}/${locale}/projects" style="color:#2d7a6e">${c.welcomeProjects}</a>`;
  return {
    subject: c.welcomeSubject,
    html: `
<div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1a2e2a">
  <h1 style="font-size:24px;margin-bottom:8px">${c.welcomeHeading}</h1>
  <p style="color:#4a5e5a;line-height:1.6">${c.welcomeBody}</p>
  <a href="${appUrl}/${locale}/projects/new"
     style="display:inline-block;margin-top:20px;padding:12px 24px;background:#e85d4a;color:#fff;border-radius:6px;text-decoration:none;font-weight:600">
    ${c.welcomeButton}
  </a>
  <p style="margin-top:32px;font-size:13px;color:#8aa8a0">${c.welcomeMore(projects)}</p>
</div>`,
  };
}
