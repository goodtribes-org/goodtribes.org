import React from "react";

// Wrap emoji characters in text nodes so CSS can size them independently.
function wrapEmojis(html: string): string {
  return html.replace(/>([^<]+)</g, (_, text) => {
    const wrapped = text.replace(
      /(\p{Emoji_Presentation}|\p{Extended_Pictographic})/gu,
      '<span class="emoji-char">$1</span>'
    );
    return `>${wrapped}<`;
  });
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
  // Plain text: still wrap emojis via a tiny helper
  const parts = body.split(/(\p{Emoji_Presentation}|\p{Extended_Pictographic})/gu);
  return (
    <p className="text-sm text-dark-slate/80 whitespace-pre-wrap break-words leading-relaxed">
      {parts.map((part, i) =>
        /(\p{Emoji_Presentation}|\p{Extended_Pictographic})/u.test(part)
          ? <span key={i} className="emoji-char">{part}</span>
          : part
      )}
    </p>
  );
}
