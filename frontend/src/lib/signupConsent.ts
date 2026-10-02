// Carries the signup form's agreement checkboxes across the magic link: the
// form sets this cookie (value: the email it accepted for), and
// `acceptAgreementsFromSignup` records the acceptance on the first
// authenticated page load. See agreements-actions.ts.
export const SIGNUP_CONSENT_COOKIE = "gt_signup_consent";

// One day: long enough to find the email, short enough not to linger.
export const SIGNUP_CONSENT_MAX_AGE = 60 * 60 * 24;

export function hasSignupConsentCookie(cookie: string): boolean {
  return cookie.split(";").some((c) => c.trim().startsWith(`${SIGNUP_CONSENT_COOKIE}=`));
}
