// Anchors for headings in editable HTML (SitePage bodies). The rich-text
// editor drops id attributes on save, so ids are added at render time
// instead: a heading whose text matches an alias gets that fixed anchor
// (so links like /how-it-works#idea keep working whatever language or
// numbering the heading has), any other heading an anchor from its text.

function plainText(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/^\s*\d+\s*[.)]\s*/, "")
    .trim();
}

function slug(text: string): string {
  return text.replace(/[^a-z0-9\s-]/g, "").trim().replace(/[\s-]+/g, "-");
}

export function addHeadingIds(html: string, aliases: Record<string, string> = {}): string {
  const used = new Set<string>();
  return html.replace(/<(h[23])(\s[^>]*)?>([\s\S]*?)<\/\1>/gi, (whole, tag: string, attrs: string | undefined, inner: string) => {
    if (attrs && /\sid\s*=/.test(attrs)) return whole;
    const text = plainText(inner);
    let id = aliases[text] ?? slug(text);
    if (!id) return whole;
    for (let n = 2; used.has(id); n++) id = `${aliases[text] ?? slug(text)}-${n}`;
    used.add(id);
    return `<${tag} id="${id}"${attrs ?? ""}>${inner}</${tag}>`;
  });
}
