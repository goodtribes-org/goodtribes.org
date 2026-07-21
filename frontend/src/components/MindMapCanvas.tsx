"use client";

import { useCallback, useState } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  addEdge,
  type Node,
  type Edge,
  type Connection,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { saveMindMap } from "@/lib/actions/mindmap";

interface Props {
  mindMapId: string;
  initialNodes: Node[];
  initialEdges: Edge[];
  canEdit: boolean;
  regenerateSource: { source: "room" | "idea"; sourceId: string };
}

let nextNodeId = 1;

function MindMapInner({ mindMapId, initialNodes, initialEdges, canEdit, regenerateSource }: Props) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const onConnect = useCallback(
    (connection: Connection) => setEdges((eds) => addEdge(connection, eds)),
    [setEdges]
  );

  function addNode() {
    const label = window.prompt("Namn på ny nod:");
    if (!label?.trim()) return;
    const id = `new-${Date.now()}-${nextNodeId++}`;
    setNodes((nds) => [...nds, { id, position: { x: 0, y: 0 }, data: { label: label.trim() } }]);
  }

  function renameNode(node: Node) {
    const label = window.prompt("Nytt namn:", (node.data as { label?: string })?.label ?? "");
    if (!label?.trim()) return;
    setNodes((nds) => nds.map((n) => (n.id === node.id ? { ...n, data: { ...n.data, label: label.trim() } } : n)));
  }

  async function handleSave() {
    setSaving(true);
    setStatus(null);
    const res = await saveMindMap(mindMapId, nodes, edges);
    setSaving(false);
    setStatus(res?.error ? res.error : "Sparat!");
  }

  async function handleRegenerate() {
    if (!window.confirm("Detta skriver över den nuvarande mindmappen. Fortsätt?")) return;
    setRegenerating(true);
    setStatus(null);
    try {
      const res = await fetch("/api/mindmap/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(regenerateSource),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus((data as { error?: string })?.error ?? "Något gick fel.");
      } else {
        setNodes(data.nodes);
        setEdges(data.edges);
      }
    } catch {
      setStatus("Något gick fel. Försök igen.");
    } finally {
      setRegenerating(false);
    }
  }

  return (
    <div className="space-y-3">
      {canEdit && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={addNode}
            className="text-xs font-medium text-seagrass border border-seagrass/40 hover:border-seagrass px-3 py-1.5 rounded-md transition-colors"
          >
            + Lägg till nod
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="text-xs font-medium text-white bg-coral hover:bg-watermelon px-3 py-1.5 rounded-md transition-colors disabled:opacity-50"
          >
            {saving ? "Sparar..." : "Spara"}
          </button>
          <button
            type="button"
            onClick={handleRegenerate}
            disabled={regenerating}
            className="text-xs font-medium text-dark-slate/60 border border-muted-teal/40 hover:border-dark-slate/40 px-3 py-1.5 rounded-md transition-colors disabled:opacity-50"
          >
            {regenerating ? "Genererar..." : "Generera om"}
          </button>
          <span className="text-xs text-dark-slate/40">Dubbelklicka en nod för att byta namn</span>
          {status && <span className="text-xs text-dark-slate/60">{status}</span>}
        </div>
      )}
      <div style={{ height: 480 }} className="border border-muted-teal/30 rounded-xl overflow-hidden">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={canEdit ? onNodesChange : undefined}
          onEdgesChange={canEdit ? onEdgesChange : undefined}
          onConnect={canEdit ? onConnect : undefined}
          onNodeDoubleClick={canEdit ? (_, node) => renameNode(node) : undefined}
          nodesDraggable={canEdit}
          nodesConnectable={canEdit}
          elementsSelectable={canEdit}
          fitView
        >
          <Background />
          <Controls showInteractive={canEdit} />
        </ReactFlow>
      </div>
    </div>
  );
}

export default function MindMapCanvas(props: Props) {
  return (
    <ReactFlowProvider>
      <MindMapInner {...props} />
    </ReactFlowProvider>
  );
}
