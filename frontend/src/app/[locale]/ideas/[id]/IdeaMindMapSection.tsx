"use client";

import { useState } from "react";
import MindMapCanvas from "@/components/MindMapCanvas";
import type { Node, Edge } from "@xyflow/react";

interface Props {
  ideaId: string;
  isAuthor: boolean;
  initialMindMap: { id: string; nodes: Node[]; edges: Edge[] } | null;
}

export default function IdeaMindMapSection({ ideaId, isAuthor, initialMindMap }: Props) {
  const [mindMap, setMindMap] = useState(initialMindMap);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!mindMap && !isAuthor) return null;

  async function generate() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/mindmap/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: "idea", sourceId: ideaId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError((data as { error?: string })?.error ?? "Something went wrong.");
      } else {
        setMindMap({ id: data.id, nodes: data.nodes, edges: data.edges });
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <section className="mb-6">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h2 className="text-sm font-semibold text-dark-slate uppercase tracking-wider">Mindmap</h2>
        {!mindMap && isAuthor && (
          <button
            type="button"
            onClick={generate}
            disabled={generating}
            className="text-xs font-medium text-white bg-coral hover:bg-watermelon px-3 py-1.5 rounded-md transition-colors disabled:opacity-50"
          >
            {generating ? "Generating..." : "Generate mindmap"}
          </button>
        )}
      </div>
      {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
      {mindMap && (
        <MindMapCanvas
          mindMapId={mindMap.id}
          initialNodes={mindMap.nodes}
          initialEdges={mindMap.edges}
          canEdit={isAuthor}
          regenerateSource={{ source: "idea", sourceId: ideaId }}
        />
      )}
    </section>
  );
}
