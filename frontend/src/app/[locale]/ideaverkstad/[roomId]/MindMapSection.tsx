"use client";

import { useState } from "react";
import MindMapCanvas from "@/components/MindMapCanvas";
import type { Node, Edge } from "@xyflow/react";

interface Props {
  roomId: string;
  initialMindMap: { id: string; nodes: Node[]; edges: Edge[] } | null;
}

export default function MindMapSection({ roomId, initialMindMap }: Props) {
  const [mindMap, setMindMap] = useState(initialMindMap);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(!!initialMindMap);

  async function generate() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/mindmap/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: "room", sourceId: roomId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError((data as { error?: string })?.error ?? "Något gick fel.");
      } else {
        setMindMap({ id: data.id, nodes: data.nodes, edges: data.edges });
        setOpen(true);
      }
    } catch {
      setError("Något gick fel. Försök igen.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="border border-muted-teal/30 rounded-xl p-4 mb-6">
      <div className="flex items-center justify-between gap-3 mb-2">
        <h2 className="text-sm font-semibold text-dark-slate">Mindmap</h2>
        {mindMap && (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="text-xs text-dark-slate/50 hover:text-dark-slate"
          >
            {open ? "Dölj" : "Visa"}
          </button>
        )}
      </div>

      {!mindMap && (
        <div className="flex items-center gap-3">
          <p className="text-sm text-dark-slate/50">Låt AI strukturera tråden till en visuell mindmap.</p>
          <button
            type="button"
            onClick={generate}
            disabled={generating}
            className="text-xs font-medium text-white bg-coral hover:bg-watermelon px-3 py-1.5 rounded-md transition-colors disabled:opacity-50 flex-shrink-0"
          >
            {generating ? "Genererar..." : "Generera mindmap från tråden"}
          </button>
        </div>
      )}

      {error && <p className="text-xs text-red-500 mt-2">{error}</p>}

      {mindMap && open && (
        <MindMapCanvas
          mindMapId={mindMap.id}
          initialNodes={mindMap.nodes}
          initialEdges={mindMap.edges}
          canEdit
          regenerateSource={{ source: "room", sourceId: roomId }}
        />
      )}
    </div>
  );
}
