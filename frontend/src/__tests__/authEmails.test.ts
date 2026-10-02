import { emailLocaleFromMagicLink, emailLocaleFromPath, magicLinkEmail, welcomeEmail } from "@/lib/authEmails";
import { hasSignupConsentCookie } from "@/lib/signupConsent";

describe("emailLocaleFromPath", () => {
  it("reads the locale prefix of a path or a full URL", () => {
    expect(emailLocaleFromPath("/en")).toBe("en");
    expect(emailLocaleFromPath("/en/projects/new")).toBe("en");
    expect(emailLocaleFromPath("http://localhost:3010/en/projects/new")).toBe("en");
    expect(emailLocaleFromPath("/sv/projects/new")).toBe("sv");
  });

  it("falls back to Swedish", () => {
    expect(emailLocaleFromPath(undefined)).toBe("sv");
    expect(emailLocaleFromPath("/")).toBe("sv");
    expect(emailLocaleFromPath("/english-page")).toBe("sv");
  });
});

describe("emailLocaleFromMagicLink", () => {
  it("reads the callbackUrl parameter of the magic link", () => {
    const link = (cb: string) => `https://goodtribes.org/api/auth/callback/resend?callbackUrl=${encodeURIComponent(cb)}&token=x`;
    expect(emailLocaleFromMagicLink(link("/en/projects/new"))).toBe("en");
    expect(emailLocaleFromMagicLink(link("https://goodtribes.org/sv"))).toBe("sv");
    expect(emailLocaleFromMagicLink("not a url")).toBe("sv");
  });
});

describe("auth emails", () => {
  it("are written in the person's language", () => {
    expect(magicLinkEmail("sv", "https://x", "goodtribes.org").subject).toBe("Logga in på goodtribes.org");
    expect(magicLinkEmail("en", "https://x", "goodtribes.org").subject).toBe("Sign in to goodtribes.org");
    expect(welcomeEmail("sv", "https://goodtribes.org").html).toContain("https://goodtribes.org/sv/projects/new");
    expect(welcomeEmail("en", "https://goodtribes.org").html).toContain("https://goodtribes.org/en/projects/new");
  });
});

describe("hasSignupConsentCookie", () => {
  it("finds the cookie by exact name", () => {
    expect(hasSignupConsentCookie("a=1; gt_signup_consent=x%40y.se")).toBe(true);
    expect(hasSignupConsentCookie("gt_signup_consent_old=1; a=2")).toBe(false);
    expect(hasSignupConsentCookie("")).toBe(false);
  });
});
