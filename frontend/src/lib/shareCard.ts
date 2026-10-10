import { APP_URL } from "@/lib/metadata";
import { toProxyUrl } from "@/lib/storageUrl";

// What a shared project link shows (#273): a short text for og:description
// and the images on the generated share card.

const MAX_DESCRIPTION = 200;

// HTML to plain text, keeping a space where a block ended, so that
// "<p>…dog.</p><p>Idén…" doesn't run together as "…dog.Idén…".
export function plainText(html: string): string {
  return html
    .replace(/<\/(p|div|h[1-6]|li|blockquote)>|<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function clip(text: string, max = MAX_DESCRIPTION): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max / 2 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

function firstSentence(text: string): string {
  const match = text.match(/^.+?[.!?](?=\s|$)/);
  return match ? match[0] : text;
}

// The summary if there is one, else the founder's dream in their own words,
// else the description's first sentence. A Drömguiden description starts
// with an <h3> heading, which is never a useful first sentence — skip it.
export function shareDescription(p: { summary?: string | null; dream?: string | null; description?: string | null }): string | null {
  const summary = p.summary?.trim();
  if (summary) return clip(summary);
  const dream = p.dream?.trim();
  if (dream) return clip(dream);
  if (!p.description) return null;
  const body = plainText(p.description.replace(/<h[1-6][^>]*>[\s\S]*?<\/h[1-6]>/gi, " "));
  return body ? clip(firstSentence(body)) : null;
}

const CARD_IMAGE_TYPES = new Set(["image/png", "image/jpeg"]);
const MAX_CARD_IMAGE_BYTES = 4 * 1024 * 1024;

// An uploaded image as a data URL the share card can draw, or null. The card
// renderer only handles PNG and JPEG, and a broken image must never break the
// card, so anything else (WebP, a slow or missing file) is simply left out.
export async function cardImageDataUrl(imageUrl: string | null | undefined): Promise<string | null> {
  if (!imageUrl) return null;
  try {
    const proxied = toProxyUrl(imageUrl);
    const url = proxied.startsWith("/") ? `${APP_URL}${proxied}` : proxied;
    const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return null;
    const type = (res.headers.get("content-type") ?? "").split(";")[0].trim();
    if (!CARD_IMAGE_TYPES.has(type)) return null;
    const bytes = Buffer.from(await res.arrayBuffer());
    if (bytes.length > MAX_CARD_IMAGE_BYTES) return null;
    return `data:${type};base64,${bytes.toString("base64")}`;
  } catch {
    return null;
  }
}
