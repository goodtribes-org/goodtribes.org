"use client";

import "@excalidraw/excalidraw/index.css";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import type { ExcalidrawProps, ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import type { Prisma } from "@prisma/client";
import { autosaveMvpSketch, setMvpSketchImage } from "./actions";

const Excalidraw = dynamic(() => import("@/app/[locale]/whiteboard/[draftId]/ExcalidrawCanvas"), { ssr: false });

const AUTOSAVE_INTERVAL_MS = 10000;
const SYNCED_NOTICE_MS = 2000;

type OnChangeArgs = Parameters<NonNullable<ExcalidrawProps["onChange"]>>;
// Only `elements` are stored — appState is per viewer (see SprintCanvas.tsx).
type Scene = { elements: OnChangeArgs[0] };

// Skissen (#323): a whiteboard every member can draw on, and/or a photo of a
// sketch on paper. Both open on the step — nothing to unfold. The whiteboard
// saves itself (every few seconds, and when the tab is hidden), with the
// same conflict merge as the free-standing whiteboard.
export default function MvpSketch({
  slug,
  projectId,
  initialScene,
  initialVersion,
  imageUrl,
  isMember,
}: {
  slug: string;
  projectId: string;
  initialScene: Prisma.JsonValue;
  initialVersion: number;
  imageUrl: string | null;
  isMember: boolean;
}) {
  const t = useTranslations("UppstartOverview");
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h3 className="mb-1 text-sm font-semibold text-dark-slate">{t("sketchBoardHeading")}</h3>
        <p className="mb-2 text-xs text-dark-slate/60">{isMember ? t("sketchBoardHint") : t("sketchBoardReadOnly")}</p>
        <SketchBoard slug={slug} initialScene={initialScene} initialVersion={initialVersion} canEdit={isMember} />
      </div>
      {isMember && <SketchPhoto slug={slug} projectId={projectId} imageUrl={imageUrl} />}
    </div>
  );
}

function SketchBoard({ slug, initialScene, initialVersion, canEdit }: { slug: string; initialScene: Prisma.JsonValue; initialVersion: number; canEdit: boolean }) {
  const t = useTranslations("UppstartOverview");
  const apiRef = useRef<ExcalidrawImperativeAPI | null>(null);
  const moduleRef = useRef<typeof import("@excalidraw/excalidraw") | null>(null);
  const versionRef = useRef(initialVersion);
  const sceneRef = useRef<Scene | null>(null);
  const dirtyRef = useRef(false);
  const [notice, setNotice] = useState<string | null>(null);
  const initial = (initialScene ?? null) as unknown as Scene | null;

  useEffect(() => {
    import("@excalidraw/excalidraw").then((mod) => {
      moduleRef.current = mod;
    });
  }, []);

  const save = useCallback(async () => {
    if (!dirtyRef.current || !sceneRef.current) return;
    dirtyRef.current = false;
    const result = await autosaveMvpSketch(slug, sceneRef.current as unknown as Prisma.InputJsonValue, versionRef.current);
    if (result.ok) {
      versionRef.current = result.version;
      setNotice(t("sketchSaved"));
      setTimeout(() => setNotice(null), SYNCED_NOTICE_MS);
      return;
    }
    if (!result.conflict) return;
    // Someone else saved first: merge their elements in rather than block.
    const api = apiRef.current;
    const mod = moduleRef.current;
    const remote = (result.latest.documentState ?? null) as unknown as Scene | null;
    if (api && mod && remote?.elements) {
      const merged = mod.reconcileElements(api.getSceneElementsIncludingDeleted(), remote.elements as never, api.getAppState());
      api.updateScene({ elements: merged, captureUpdate: mod.CaptureUpdateAction.NEVER });
      sceneRef.current = { elements: merged as unknown as OnChangeArgs[0] };
      dirtyRef.current = true;
    }
    versionRef.current = result.latest.version;
    setNotice(t("sketchSynced"));
    setTimeout(() => setNotice(null), SYNCED_NOTICE_MS);
  }, [slug, t]);

  useEffect(() => {
    const interval = setInterval(save, AUTOSAVE_INTERVAL_MS);
    const onHide = () => document.visibilityState === "hidden" && save();
    document.addEventListener("visibilitychange", onHide);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onHide);
      save();
    };
  }, [save]);

  function handleChange(...args: OnChangeArgs) {
    if (!canEdit) return;
    sceneRef.current = { elements: args[0] };
    dirtyRef.current = true;
  }

  return (
    <div className="relative h-[28rem] overflow-hidden rounded-xl border border-muted-teal/30">
      {notice && (
        <div className="absolute right-2 top-2 z-10 rounded-md border border-seagrass/30 bg-seagrass/10 px-3 py-1 text-xs text-seagrass">{notice}</div>
      )}
      <Excalidraw
        excalidrawAPI={(api) => {
          apiRef.current = api;
        }}
        initialData={{ elements: initial?.elements ?? [], scrollToContent: true }}
        viewModeEnabled={!canEdit}
        onChange={handleChange}
      />
    </div>
  );
}

function SketchPhoto({ slug, projectId, imageUrl }: { slug: string; projectId: string; imageUrl: string | null }) {
  const t = useTranslations("UppstartOverview");
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function upload(file: File) {
    setError(null);
    start(async () => {
      const form = new FormData();
      form.append("file", file);
      form.append("visibility", "private");
      form.append("projectId", projectId);
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const data = (await res.json().catch(() => ({}))) as { key?: string; error?: string };
      if (!res.ok || !data.key) {
        setError(data.error ?? t("sketchUploadFailed"));
        return;
      }
      const saved = await setMvpSketchImage(slug, data.key);
      if (saved.error) setError(saved.error);
      else router.refresh();
    });
  }

  function remove() {
    start(async () => {
      const res = await setMvpSketchImage(slug, null);
      if (res.error) setError(res.error);
      else router.refresh();
    });
  }

  return (
    <div>
      <h3 className="mb-1 text-sm font-semibold text-dark-slate">{t("sketchPhotoHeading")}</h3>
      <p className="mb-2 text-xs text-dark-slate/60">{t("sketchPhotoHint")}</p>
      {imageUrl && (
        <img src={imageUrl} alt={t("sketchPhotoAlt")} className="mb-3 max-h-96 rounded-xl border border-muted-teal/30" />
      )}
      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) upload(f);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={pending}
          className="rounded-full border border-seagrass px-4 py-1.5 text-sm font-semibold text-seagrass hover:bg-seagrass/10 disabled:opacity-60"
        >
          📷 {pending ? t("saving") : imageUrl ? t("sketchPhotoReplace") : t("sketchPhotoUpload")}
        </button>
        {imageUrl && (
          <button type="button" onClick={remove} disabled={pending} className="text-xs text-dark-slate/50 hover:text-watermelon">
            {t("delete")}
          </button>
        )}
        {error && <span className="text-xs text-watermelon">{error}</span>}
      </div>
    </div>
  );
}

// The sketch again in "Låt dem prova" (#323), read-only, so it's at hand
// when showing it to the people trying it.
export function MvpSketchView({ initialScene, imageUrl }: { initialScene: Prisma.JsonValue; imageUrl: string | null }) {
  const t = useTranslations("UppstartOverview");
  const scene = (initialScene ?? null) as unknown as Scene | null;
  const hasBoard = !!scene?.elements?.some((e) => !(e as { isDeleted?: boolean }).isDeleted);
  if (!hasBoard && !imageUrl) return null;
  return (
    <div className="mt-6 border-t border-muted-teal/20 pt-4">
      <h3 className="mb-2 text-sm font-semibold text-dark-slate">{t("sketchShowHeading")}</h3>
      <div className="flex flex-col gap-3">
        {imageUrl && <img src={imageUrl} alt={t("sketchPhotoAlt")} className="max-h-80 self-start rounded-xl border border-muted-teal/30" />}
        {hasBoard && (
          <div className="h-72 overflow-hidden rounded-xl border border-muted-teal/30">
            <Excalidraw initialData={{ elements: scene!.elements, scrollToContent: true }} viewModeEnabled />
          </div>
        )}
      </div>
    </div>
  );
}
