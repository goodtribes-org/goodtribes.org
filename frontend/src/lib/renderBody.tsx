import React from "react";

// Explicit Unicode ranges covering the vast majority of emoji characters.
// Using character classes instead of \p{} property escapes for maximum
// bundler compatibility.
const EMOJI_RE =
  /[\u{1F300}-\u{1F9FF}\u{1FA00}-\u{1FFFF}\u{2600}-\u{27FF}\u{2300}-\u{23FF}\u{2B00}-\u{2BFF}\u{FE00}-\u{FEFF}]/gu;

function wrapEmojis(html: string): string {
  // Only replace inside text nodes (between > and <), never inside tags.
  return html.replace(/>([^<]+)</g, (_, text) => {
    const wrapped = text.replace(
      EMOJI_RE,
      (ch: string) => `<span class="emoji-char">${ch}</span>`
    );
    return `>${wrapped}<`;
  });
}

// Escapes raw plain text before it's wrapped in HTML tags for storage as a
// Message.body — renderBody() renders anything starting with "<" via
// dangerouslySetInnerHTML, so untrusted plain text (a user's free-text
// post, an LLM's raw response) must never be inserted unescaped.
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function htmlToPreviewText(body: string): string {
  if (!body.trimStart().startsWith("<")) return body;
  return body
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function renderBody(body: string): React.ReactNode {
  if (body.trimStart().startsWith("<")) {
    return (
      <div
        className="prose prose-sm max-w-none prose-img:rounded-xl prose-img:max-w-full text-dark-slate/80 leading-relaxed"
        dangerouslySetInnerHTML={{ __html: wrapEmojis(body) }}
      />
    );
  }

  // Plain text fallback: split and wrap emoji characters inline.
  const emojiTest = new RegExp(EMOJI_RE.source, "u");
  const parts = body.split(new RegExp(`(${EMOJI_RE.source})`, "gu"));
  return (
    <p className="text-sm text-dark-slate/80 whitespace-pre-wrap break-words leading-relaxed">
      {parts.map((part, i) =>
        emojiTest.test(part)
          ? <span key={i} className="emoji-char">{part}</span>
          : part
      )}
    </p>
  );
}
