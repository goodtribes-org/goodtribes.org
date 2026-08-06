"use client";

import "@excalidraw/excalidraw/index.css";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { autosaveCanvas, broadcastCanvasChange } from "./actions";
import type {
  ExcalidrawProps,
  ExcalidrawImperativeAPI,
  SocketId,
  Collaborator,
} from "@excalidraw/excalidraw/types";
import type { Prisma } from "@prisma/client";

const Excalidraw = dynamic(async () => (await import("@excalidraw/excalidraw")).Excalidraw, { ssr: false });

const AUTOSAVE_INTERVAL_MS = 15000;
const BROADCAST_THROTTLE_MS = 100;
const SYNCED_NOTICE_MS = 2000;
// Collaborators go stale (tab closed, connection dropped) without an
// explicit "goodbye" message — drop anyone we haven't heard a pointer
// update from recently, same idea as a presence timeout.
const COLLABORATOR_STALE_MS = 15000;

type OnChangeArgs = Parameters<NonNullable<ExcalidrawProps["onChange"]>>;
// Only ever share/persist `elements` — appState (zoom, scroll, selection,
// and critically the live `collaborators` Map) is inherently per-viewer.
// Persisting/broadcasting it wholesale breaks the next load: a Map
// serializes to `{}` over JSON, and Excalidraw's own internals then throw
// trying to call .forEach on that plain object.
type Scene = { elements: OnChangeArgs[0] };

type ElementsMessage = { kind: "elements"; clientId: string; elements: OnChangeArgs[0] };
type PointerMessage = { kind: "pointer"; clientId: string; userName: string; x: number; y: number };
type CanvasMessage = ElementsMessage | PointerMessage;

const CURSOR_COLORS = [
  { background: "#e07856", stroke: "#e07856" },
  { background: "#4f8a6d", stroke: "#4f8a6d" },
  { background: "#3f6fae", stroke: "#3f6fae" },
  { background: "#9b5de5", stroke: "#9b5de5" },
  { background: "#c9a13b", stroke: "#c9a13b" },
];
function colorForClientId(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return CURSOR_COLORS[hash % CURSOR_COLORS.length];
}

// Leading+trailing throttle — fires immediately on the first call, then at
// most once per `ms` after that, always flushing the latest args. Used for
// both outgoing broadcasts (so drawing/pointer-moving doesn't spam the
// server every animation frame) independently for elements vs. pointer.
function throttle<Args extends unknown[]>(fn: (...args: Args) => void, ms: number) {
  let last = 0;
  let pending: Args | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  function flush() {
    if (pending) {
      fn(...pending);
      pending = null;
      last = Date.now();
    }
    timer = null;
  }
  return (...args: Args) => {
    const now = Date.now();
    if (now - last >= ms) {
      fn(...args);
      last = now;
    } else {
      pending = args;
      if (!timer) timer = setTimeout(flush, ms - (now - last));
    }
  };
}

export default function SprintCanvas({
  projectSlug,
  sprintPhaseId,
  initialDocumentState,
  initialVersion,
  canEdit,
  userName,
}: {
  projectSlug: string;
  sprintPhaseId: string;
  initialDocumentState: Prisma.JsonValue;
  initialVersion: number;
  canEdit: boolean;
  userName: string;
}) {
  const clientId = useRef(Math.random().toString(36).slice(2)).current;
  const apiRef = useRef<ExcalidrawImperativeAPI | null>(null);
  const excalidrawModuleRef = useRef<typeof import("@excalidraw/excalidraw") | null>(null);
  const versionRef = useRef(initialVersion);
  const sceneRef = useRef<Scene | null>(null);
  const dirtyRef = useRef(false);
  const collaboratorsRef = useRef<Map<SocketId, Collaborator & { lastSeen: number }>>(new Map());
  const [syncedNotice, setSyncedNotice] = useState(false);

  const initial = (initialDocumentState ?? null) as unknown as Scene | null;

  useEffect(() => {
    import("@excalidraw/excalidraw").then((mod) => {
      excalidrawModuleRef.current = mod;
    });
  }, []);

  const applyCollaborators = useCallback(() => {
    const api = apiRef.current;
    const mod = excalidrawModuleRef.current;
    if (!api || !mod) return;
    const now = Date.now();
    for (const [id, c] of collaboratorsRef.current) {
      if (now - c.lastSeen > COLLABORATOR_STALE_MS) collaboratorsRef.current.delete(id);
    }
    api.updateScene({
      appState: { collaborators: new Map(collaboratorsRef.current) },
      captureUpdate: mod.CaptureUpdateAction.NEVER,
    });
  }, []);

  // ---- Persisted autosave (unchanged cadence, softened conflict handling) ----
  const save = useCallback(async () => {
    if (!dirtyRef.current || !sceneRef.current) return;
    dirtyRef.current = false;

    const result = await autosaveCanvas(
      projectSlug,
      sprintPhaseId,
      sceneRef.current as unknown as Prisma.InputJsonValue,
      versionRef.current
    );
    if (result.ok) {
      versionRef.current = result.version;
      return;
    }
    if (!result.conflict) return;

    // Someone else's autosave landed first — reconcile their persisted
    // snapshot into our live scene instead of blocking/reloading, then
    // adopt their version so the next periodic save can proceed.
    const api = apiRef.current;
    const mod = excalidrawModuleRef.current;
    const remote = (result.latest.documentState ?? null) as unknown as Scene | null;
    if (api && mod && remote?.elements) {
      const merged = mod.reconcileElements(
        api.getSceneElementsIncludingDeleted(),
        remote.elements as never,
        api.getAppState()
      );
      api.updateScene({ elements: merged, captureUpdate: mod.CaptureUpdateAction.NEVER });
    }
    versionRef.current = result.latest.version;
    setSyncedNotice(true);
    setTimeout(() => setSyncedNotice(false), SYNCED_NOTICE_MS);
  }, [projectSlug, sprintPhaseId]);

  useEffect(() => {
    const interval = setInterval(save, AUTOSAVE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [save]);

  useEffect(() => () => { save(); }, [save]);

  // ---- Live broadcast (DB-free) ----
  const broadcastElements = useRef(
    throttle((elements: OnChangeArgs[0]) => {
      const msg: ElementsMessage = { kind: "elements", clientId, elements };
      broadcastCanvasChange(sprintPhaseId, msg);
    }, BROADCAST_THROTTLE_MS)
  ).current;

  const broadcastPointer = useRef(
    throttle((x: number, y: number) => {
      const msg: PointerMessage = { kind: "pointer", clientId, userName, x, y };
      broadcastCanvasChange(sprintPhaseId, msg);
    }, BROADCAST_THROTTLE_MS)
  ).current;

  // ---- Live receive ----
  useEffect(() => {
    const es = new EventSource(`/api/sprints/phases/${sprintPhaseId}/canvas-sse`);
    es.addEventListener("canvas-change", (e) => {
      let msg: CanvasMessage;
      try {
        msg = JSON.parse((e as MessageEvent).data);
      } catch {
        return;
      }
      if (msg.clientId === clientId) return; // ignore our own echo

      if (msg.kind === "elements") {
        const api = apiRef.current;
        const mod = excalidrawModuleRef.current;
        if (!api || !mod) return;
        const merged = mod.reconcileElements(
          api.getSceneElementsIncludingDeleted(),
          msg.elements as never,
          api.getAppState()
        );
        api.updateScene({ elements: merged, captureUpdate: mod.CaptureUpdateAction.NEVER });
      } else {
        collaboratorsRef.current.set(msg.clientId as SocketId, {
          id: msg.clientId,
          username: msg.userName,
          pointer: { x: msg.x, y: msg.y, tool: "pointer" },
          color: colorForClientId(msg.clientId),
          lastSeen: Date.now(),
        });
        applyCollaborators();
      }
    });
    return () => es.close();
  }, [sprintPhaseId, clientId, applyCollaborators]);

  function handleChange(...args: OnChangeArgs) {
    if (!canEdit) return;
    sceneRef.current = { elements: args[0] };
    dirtyRef.current = true;
    broadcastElements(args[0]);
  }

  const handlePointerUpdate: NonNullable<ExcalidrawProps["onPointerUpdate"]> = (payload) => {
    if (!canEdit) return;
    broadcastPointer(payload.pointer.x, payload.pointer.y);
  };

  return (
    <div>
      {syncedNotice && (
        <div className="mb-2 text-xs text-seagrass bg-seagrass/10 border border-seagrass/30 rounded-md px-3 py-1.5 inline-block">
          Synkroniserat med en annan deltagares ändringar.
        </div>
      )}
      <div style={{ height: "480px" }} className="border border-muted-teal/30 rounded-xl overflow-hidden">
        <Excalidraw
          excalidrawAPI={(api) => { apiRef.current = api; }}
          initialData={{ elements: initial?.elements ?? [] }}
          viewModeEnabled={!canEdit}
          onChange={handleChange}
          onPointerUpdate={handlePointerUpdate}
        />
      </div>
    </div>
  );
}
