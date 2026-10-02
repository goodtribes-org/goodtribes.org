import DOMPurify from "isomorphic-dompurify";
import { addHeadingIds } from "@/lib/headingAnchors";

// Splits an editable SitePage body into blocks a designed page can lay out,
// so the text stays editable with the pencil (one rich-text field) while
// the page still gets cards and boxes:
//   text     — untitled text: before the first heading, or after a callout
//   section  — an h2 and what follows it (up to the next h2/h3)
//   card     — an h3 and what follows it (up to the next heading or a
//              blockquote), e.g. one phase
//   callout  — a blockquote, lifted out of any card and shown as a box
// All HTML is sanitized here; ids come from addHeadingIds.

export type SitePageBlock =
  | { kind: "text"; html: string }
  | { kind: "section"; id: string; title: string; html: string }
  | { kind: "card"; id: string; title: string; html: string }
  | { kind: "callout"; html: string };

export function sitePageBlocks(body: string, aliases: Record<string, string> = {}): SitePageBlock[] {
  const fragment = DOMPurify.sanitize(addHeadingIds(DOMPurify.sanitize(body), aliases), {
    RETURN_DOM_FRAGMENT: true,
  }) as DocumentFragment;

  const blocks: SitePageBlock[] = [];
  let open: { kind: "text" | "section" | "card"; id: string; title: string; parts: string[] } | null = null;
  const close = () => {
    if (!open) return;
    const html = open.parts.join("");
    if (open.kind === "text") {
      if (html.trim()) blocks.push({ kind: "text", html });
    } else {
      blocks.push({ kind: open.kind, id: open.id, title: open.title, html });
    }
    open = null;
  };

  for (const node of Array.from(fragment.childNodes)) {
    if (node.nodeType !== 1) {
      const text = node.textContent ?? "";
      if (text.trim()) (open ??= { kind: "text", id: "", title: "", parts: [] }).parts.push(text);
      continue;
    }
    const el = node as Element;
    const tag = el.tagName.toLowerCase();
    if (tag === "h2" || tag === "h3") {
      close();
      open = { kind: tag === "h2" ? "section" : "card", id: el.id, title: el.textContent?.trim() ?? "", parts: [] };
    } else if (tag === "blockquote") {
      close();
      blocks.push({ kind: "callout", html: el.innerHTML });
    } else {
      (open ??= { kind: "text", id: "", title: "", parts: [] }).parts.push(el.outerHTML);
    }
  }
  close();
  return blocks;
}

// "1. Idé" → "Idé": the designed page shows the number in a badge.
export function stripNumber(title: string): string {
  return title.replace(/^\s*\d+\s*[.)]\s*/, "");
}
