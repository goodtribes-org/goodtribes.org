"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { createWikiPage } from "./actions";

export interface WikiSidebarPage {
  id: string;
  slug: string;
  title: string;
  parentId: string | null;
}

interface TreeNode extends WikiSidebarPage {
  children: TreeNode[];
}

function buildTree(pages: WikiSidebarPage[]): TreeNode[] {
  const byId = new Map<string, TreeNode>(pages.map((p) => [p.id, { ...p, children: [] }]));
  const roots: TreeNode[] = [];
  for (const node of byId.values()) {
    if (node.parentId && byId.has(node.parentId)) {
      byId.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

export default function WikiSidebar({
  projectSlug,
  pages,
  currentSlug,
  canCreate,
}: {
  projectSlug: string;
  pages: WikiSidebarPage[];
  currentSlug: string;
  canCreate: boolean;
}) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const tree = useMemo(() => buildTree(pages), [pages]);

  function toggle(id: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function renderNode(node: TreeNode, depth: number) {
    const hasChildren = node.children.length > 0;
    const isCollapsed = collapsed.has(node.id);
    return (
      <li key={node.id}>
        <div className="flex items-center" style={{ paddingLeft: depth * 12 }}>
          {hasChildren ? (
            <button
              type="button"
              onClick={() => toggle(node.id)}
              aria-label={isCollapsed ? "Expandera" : "Fäll ihop"}
              className="w-4 h-4 shrink-0 flex items-center justify-center text-dark-slate/40 hover:text-dark-slate"
            >
              <span className={`inline-block transition-transform text-[9px] ${isCollapsed ? "" : "rotate-90"}`}>▶</span>
            </button>
          ) : (
            <span className="w-4 shrink-0" />
          )}
          <Link
            href={`/projects/${projectSlug}/wiki/${node.slug}`}
            className={`flex-1 min-w-0 block text-sm px-1.5 py-1 rounded transition-colors truncate ${
              node.slug === currentSlug
                ? "bg-coral/10 text-coral font-medium"
                : "text-dark-slate/70 hover:text-dark-slate hover:bg-gray-50"
            }`}
          >
            {node.title}
          </Link>
        </div>
        {hasChildren && !isCollapsed && (
          <ul>{node.children.map((child) => renderNode(child, depth + 1))}</ul>
        )}
      </li>
    );
  }

  return (
    <>
      <ul className="space-y-0.5">{tree.map((node) => renderNode(node, 0))}</ul>

      {canCreate && (
        <form action={createWikiPage.bind(null, projectSlug)} className="mt-4 space-y-1.5">
          <input
            name="title"
            type="text"
            required
            maxLength={200}
            placeholder="New page…"
            className="w-full text-xs border border-muted-teal/40 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-coral placeholder-dark-slate/30"
          />
          <select
            name="parentId"
            defaultValue=""
            className="w-full text-xs border border-muted-teal/40 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-coral text-dark-slate/60 bg-white"
          >
            <option value="">Ingen överordnad sida</option>
            {pages.map((p) => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </select>
          <input type="hidden" name="content" value="" />
        </form>
      )}
    </>
  );
}
