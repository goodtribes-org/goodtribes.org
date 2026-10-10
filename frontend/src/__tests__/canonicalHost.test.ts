import { canonicalRedirect } from "../lib/canonicalHost";

describe("one address for the site (#308)", () => {
  it("sends www to goodtribes.org, keeping path and query", () => {
    expect(canonicalRedirect("www.goodtribes.org", "/sv/projects/infos", "?skapad=1")).toBe("https://goodtribes.org/sv/projects/infos?skapad=1");
    expect(canonicalRedirect("WWW.goodtribes.org:443", "/api/e/dec3", "")).toBe("https://goodtribes.org/api/e/dec3");
    expect(canonicalRedirect("www.goodtribes.org, proxy", "/api/auth/callback/resend", "?token=x")).toBe("https://goodtribes.org/api/auth/callback/resend?token=x");
  });
  it("leaves the canonical host and local development alone", () => {
    expect(canonicalRedirect("goodtribes.org", "/sv", "")).toBeNull();
    expect(canonicalRedirect("localhost:3020", "/sv", "")).toBeNull();
    expect(canonicalRedirect(null, "/", "")).toBeNull();
  });
});
