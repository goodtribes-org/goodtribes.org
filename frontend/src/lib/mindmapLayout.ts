import type { Node, Edge } from "@xyflow/react";

export interface RawMindMapNode {
  id: string;
  label: string;
  parentId?: string | null;
}

export interface RawMindMapEdge {
  source: string;
  target: string;
  label?: string;
}

const RING_SPACING = 220;

// AI is notoriously bad at spatial layout, so it only proposes a tree shape
// (root + parentId per node) — this places them deterministically: the root
// (no parentId) at the center, each depth level in its own ring around it,
// siblings spread evenly around their ring. No layout-engine dependency
// (dagre/elkjs) needed for this — plain trigonometry.
export function computeRadialLayout(rawNodes: RawMindMapNode[]): Node[] {
  const byParent = new Map<string | null, RawMindMapNode[]>();
  for (const node of rawNodes) {
    const key = node.parentId ?? null;
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key)!.push(node);
  }

  const root = rawNodes.find((n) => !n.parentId) ?? rawNodes[0];
  const positioned = new Map<string, { x: number; y: number }>();

  function place(nodeId: string, depth: number, angleStart: number, angleEnd: number) {
    const children = byParent.get(nodeId) ?? [];
    if (children.length === 0) return;

    const angleStep = (angleEnd - angleStart) / children.length;
    children.forEach((child, i) => {
      const angle = angleStart + angleStep * (i + 0.5);
      const radius = RING_SPACING * depth;
      positioned.set(child.id, {
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
      });
      place(child.id, depth + 1, angleStart + angleStep * i, angleStart + angleStep * (i + 1));
    });
  }

  if (root) {
    positioned.set(root.id, { x: 0, y: 0 });
    place(root.id, 1, 0, Math.PI * 2);
  }

  return rawNodes.map((node) => ({
    id: node.id,
    position: positioned.get(node.id) ?? { x: 0, y: 0 },
    data: { label: node.label },
  }));
}

export function toReactFlowEdges(rawEdges: RawMindMapEdge[]): Edge[] {
  return rawEdges.map((e, i) => ({
    id: `e-${e.source}-${e.target}-${i}`,
    source: e.source,
    target: e.target,
    label: e.label,
  }));
}
