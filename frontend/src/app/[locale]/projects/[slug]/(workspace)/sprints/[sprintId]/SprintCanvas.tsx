"use client";

import "@excalidraw/excalidraw/index.css";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { autosaveCanvas } from "./actions";
import type { ExcalidrawProps } from "@excalidraw/excalidraw/types";
import type { Prisma } from "@prisma/client";

const Excalidraw = dynamic(async () => (await import("@excalidraw/excalidraw")).Excalidraw, { ssr: false });

const AUTOSAVE_INTERVAL_MS = 15000;

type OnChangeArgs = Parameters<NonNullable<ExcalidrawProps["onChange"]>>;
type Scene = { elements: OnChangeArgs[0]; appState: Partial<OnChangeArgs[1]> };

export default function SprintCanvas({
  projectSlug,
  sprintPhaseId,
  initialDocumentState,
  initialVersion,
  canEdit,
}: {
  projectSlug: string;
  sprintPhaseId: string;
  initialDocumentState: Prisma.JsonValue;
  initialVersion: number;
  canEdit: boolean;
}) {
  const versionRef = useRef(initialVersion);
  const sceneRef = useRef<Scene | null>(null);
  const dirtyRef = useRef(false);
  const [conflictNotice, setConflictNotice] = useState(false);

  const initial = (initialDocumentState ?? null) as unknown as Scene | null;

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
    } else if (result.conflict) {
      versionRef.current = result.latest.version;
      setConflictNotice(true);
    }
  }, [projectSlug, sprintPhaseId]);

  useEffect(() => {
    const interval = setInterval(save, AUTOSAVE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [save]);

  // Also flush on unmount/tab switch so a quick visit isn't lost to the
  // 15s interval — never overwrite without checking version first, same
  // as the interval path.
  useEffect(() => () => { save(); }, [save]);

  function handleChange(...args: OnChangeArgs) {
    if (!canEdit) return;
    sceneRef.current = { elements: args[0], appState: args[1] };
    dirtyRef.current = true;
  }

  return (
    <div>
      {conflictNotice && (
        <div className="mb-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 flex items-center justify-between gap-3">
          <span>Någon annan uppdaterade den här ritytan — den senaste versionen har laddats i bakgrunden.</span>
          <button type="button" onClick={() => window.location.reload()} className="underline font-medium flex-shrink-0">
            Uppdatera vyn
          </button>
        </div>
      )}
      <div style={{ height: "480px" }} className="border border-muted-teal/30 rounded-xl overflow-hidden">
        <Excalidraw
          initialData={{ elements: initial?.elements ?? [], appState: initial?.appState ?? {} }}
          viewModeEnabled={!canEdit}
          onChange={handleChange}
        />
      </div>
    </div>
  );
}
