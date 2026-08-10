"use client";

import "@excalidraw/excalidraw/index.css";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { autosaveWhiteboardDraft } from "../actions";
import type { ExcalidrawProps, ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import type { Prisma } from "@prisma/client";

const Excalidraw = dynamic(() => import("./ExcalidrawCanvas"), { ssr: false });

const AUTOSAVE_INTERVAL_MS = 15000;
const SYNCED_NOTICE_MS = 2000;

type OnChangeArgs = Parameters<NonNullable<ExcalidrawProps["onChange"]>>;
// Only ever persist `elements` — appState (zoom, scroll, selection) is
// inherently per-viewer, same reasoning as SprintCanvas.tsx.
type Scene = { elements: OnChangeArgs[0] };

export default function WhiteboardDraftCanvas({
  draftId,
  initialDocumentState,
  initialVersion,
  canEdit,
}: {
  draftId: string;
  initialDocumentState: Prisma.JsonValue;
  initialVersion: number;
  canEdit: boolean;
}) {
  const t = useTranslations("WhiteboardDraftPage");
  const apiRef = useRef<ExcalidrawImperativeAPI | null>(null);
  const excalidrawModuleRef = useRef<typeof import("@excalidraw/excalidraw") | null>(null);
  const versionRef = useRef(initialVersion);
  const sceneRef = useRef<Scene | null>(null);
  const dirtyRef = useRef(false);
  const [syncedNotice, setSyncedNotice] = useState(false);

  const initial = (initialDocumentState ?? null) as unknown as Scene | null;

  useEffect(() => {
    import("@excalidraw/excalidraw").then((mod) => {
      excalidrawModuleRef.current = mod;
    });
  }, []);

  const save = useCallback(async () => {
    if (!dirtyRef.current || !sceneRef.current) return;
    dirtyRef.current = false;

    const result = await autosaveWhiteboardDraft(
      draftId,
      sceneRef.current as unknown as Prisma.InputJsonValue,
      versionRef.current
    );
    if (result.ok) {
      versionRef.current = result.version;
      return;
    }
    if (!result.conflict) return;

    // Same owner, another tab landed an autosave first — reconcile it in
    // rather than blocking, mirroring SprintCanvas.tsx's conflict handling.
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
  }, [draftId]);

  useEffect(() => {
    const interval = setInterval(save, AUTOSAVE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [save]);

  useEffect(() => () => { save(); }, [save]);

  function handleChange(...args: OnChangeArgs) {
    if (!canEdit) return;
    sceneRef.current = { elements: args[0] };
    dirtyRef.current = true;
  }

  return (
    <div>
      {syncedNotice && (
        <div className="mb-2 text-xs text-seagrass bg-seagrass/10 border border-seagrass/30 rounded-md px-3 py-1.5 inline-block">
          {t("synced")}
        </div>
      )}
      <div
        style={{ height: "calc(100vh - 260px)" }}
        className="border border-amber-400 rounded-xl min-h-[420px]"
      >
        <Excalidraw
          excalidrawAPI={(api) => { apiRef.current = api; }}
          initialData={{ elements: initial?.elements ?? [] }}
          viewModeEnabled={!canEdit}
          onChange={handleChange}
        />
      </div>
    </div>
  );
}
