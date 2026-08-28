import { sanitizeHtml } from "../lib/sanitizeHtml";

// sanitizeHtml wraps isomorphic-dompurify's DOMPurify.sanitize() with its
// default config (no custom ALLOWED_TAGS/ALLOWED_ATTR) — this is the central
// XSS-prevention sanitizer for SitePage/HeroSlide/wiki content per
// CLAUDE.md, run both on save and again at render time. These tests exercise
// the real DOMPurify implementation (no mocking) against its actual default
// behavior, not an assumed one.
describe("sanitizeHtml", () => {
  it("strips <script> tags entirely, including their content", () => {
    expect(sanitizeHtml("<script>alert('xss')</script>")).toBe("");
    expect(sanitizeHtml("<p>before</p><script>alert(1)</script><p>after</p>")).toBe(
      "<p>before</p><p>after</p>"
    );
  });

  it("strips on* event handler attributes but keeps the element", () => {
    expect(sanitizeHtml('<b onclick="alert(1)">hi</b>')).toBe("<b>hi</b>");
    expect(sanitizeHtml('<img src="x" onerror="alert(1)">')).toBe('<img src="x">');
    expect(sanitizeHtml('<svg onload="alert(1)"><circle></circle></svg>')).toBe(
      "<svg><circle></circle></svg>"
    );
  });

  it("strips javascript: URLs from href but keeps the element", () => {
    expect(sanitizeHtml('<a href="javascript:alert(1)">x</a>')).toBe("<a>x</a>");
  });

  it("preserves legitimate safe HTML unchanged", () => {
    expect(sanitizeHtml("<b>bold</b> <i>italic</i> <strong>s</strong> <em>e</em>")).toBe(
      "<b>bold</b> <i>italic</i> <strong>s</strong> <em>e</em>"
    );
    expect(sanitizeHtml('<a href="https://example.com" rel="noopener">link</a>')).toBe(
      '<a href="https://example.com" rel="noopener">link</a>'
    );
    expect(
      sanitizeHtml('<img src="https://example.com/a.png" alt="pic" width="10">')
    ).toBe('<img src="https://example.com/a.png" alt="pic" width="10">');
    expect(sanitizeHtml("<ul><li>one</li><li>two</li></ul>")).toBe(
      "<ul><li>one</li><li>two</li></ul>"
    );
    expect(sanitizeHtml("<h1>Title</h1><p>Para<br>break</p>")).toBe(
      "<h1>Title</h1><p>Para<br>break</p>"
    );
    expect(sanitizeHtml("just plain text, no tags")).toBe("just plain text, no tags");
  });

  it("strips disallowed tags like <iframe> entirely", () => {
    expect(sanitizeHtml('<iframe src="https://evil.com"></iframe>')).toBe("");
  });

  it("handles empty and non-string-ish input gracefully without throwing", () => {
    expect(sanitizeHtml("")).toBe("");
    expect(sanitizeHtml("   ")).toBe("   ");
    expect(() => sanitizeHtml(null as unknown as string)).not.toThrow();
    expect(sanitizeHtml(null as unknown as string)).toBe("");
    expect(() => sanitizeHtml(undefined as unknown as string)).not.toThrow();
    expect(sanitizeHtml(undefined as unknown as string)).toBe("");
  });

  // Documented current behavior, not a fix: DOMPurify's default ALLOWED_ATTR
  // does not include `target`, so a `target="_blank"` on a link is silently
  // dropped even though the link itself and its safe attributes survive.
  // Worth knowing about for any editor UI that lets admins add "open in new
  // tab" links via raw HTML — the attribute won't survive sanitization.
  it("drops the target attribute (not in DOMPurify's default allow-list) while keeping other safe attributes", () => {
    expect(
      sanitizeHtml('<a href="https://example.com" target="_blank" rel="noopener">link</a>')
    ).toBe('<a href="https://example.com" rel="noopener">link</a>');
  });

  // Documented current behavior, not a fix: DOMPurify's default config does
  // NOT sanitize the `style` attribute's CSS content, so a javascript: URL
  // inside an inline style's url() survives untouched. This is a largely
  // inert vector in modern browsers (CSS url() doesn't execute script
  // handlers the way old IE's `expression()`/javascript: URLs in CSS did),
  // but it means `sanitizeHtml` alone is not a complete defense against
  // attacker-controlled `style` attribute content.
  it("does not strip javascript: URLs embedded inside a style attribute's CSS", () => {
    expect(
      sanitizeHtml('<div style="background:url(javascript:alert(1))">x</div>')
    ).toBe('<div style="background:url(javascript:alert(1))">x</div>');
  });

  it("handles malformed/unclosed HTML without throwing", () => {
    expect(() => sanitizeHtml("<p>unclosed")).not.toThrow();
    expect(sanitizeHtml("<p>unclosed")).toBe("<p>unclosed</p>");
    expect(() => sanitizeHtml("<div><span>nested unclosed")).not.toThrow();
  });
});
