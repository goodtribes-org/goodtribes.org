"use client";

import { useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { savePulse, snoozePulse } from "./actions";

const input = "rounded-lg border border-muted-teal/40 px-3 py-2 text-sm text-dark-slate focus:border-seagrass focus:outline-none";
const primary = "rounded-lg bg-seagrass px-5 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60";

type Metric = { id: string; label: string; unit: string };

// Impactpuls (#335): a sentence, a photo and/or a figure — 30 seconds.
// Everything is optional except that something is said.
export default function PulseForm({ slug, metrics, canSnooze }: { slug: string; metrics: Metric[]; canSnooze: boolean }) {
  const t = useTranslations("ImpactPulse");
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [note, setNote] = useState("");
  const [metricId, setMetricId] = useState(metrics[0]?.id ?? "");
  const [value, setValue] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<"saved" | "snoozed" | null>(null);
  const [pending, start] = useTransition();
  const unit = metrics.find((m) => m.id === metricId)?.unit ?? "";
  const hasSomething = !!note.trim() || !!imageUrl || (!!metricId && !!value.trim());

  async function pickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    if (file.size > 5 * 1024 * 1024) return setError(t("photoTooLarge"));
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("visibility", "public");
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const data = (await res.json().catch(() => ({}))) as { url?: string };
      if (!res.ok || !data.url) throw new Error();
      setImageUrl(data.url);
    } catch {
      setError(t("photoFailed"));
    } finally {
      setUploading(false);
    }
  }

  const act = (fn: () => Promise<{ error?: string }>, after: "saved" | "snoozed") =>
    start(async () => {
      setError(null);
      const res = await fn();
      if (res.error) return setError(res.error);
      setSaved(after);
      router.refresh();
    });

  if (saved) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-seagrass/30 bg-seagrass/5 px-5 py-6 text-center">
        <p className="text-base font-semibold text-dark-slate">{saved === "saved" ? `💚 ${t("thanks")}` : t("snoozed")}</p>
        {saved === "saved" && <p className="text-sm text-dark-slate/70">{t("thanksWhere")}</p>}
        <Link href={`/projects/${slug}`} className="text-sm font-semibold text-seagrass hover:underline">
          {t("backToProject")} →
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-muted-teal/30 bg-white px-5 py-5">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-semibold text-dark-slate">{t("noteLabel")}</span>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={500} placeholder={t("notePlaceholder")} className={input} />
      </label>

      {metrics.length > 0 ? (
        <div className="flex flex-col gap-1">
          <span className="text-sm font-semibold text-dark-slate">{t("numberLabel")}</span>
          <div className="flex flex-wrap items-center gap-2">
            {metrics.length > 1 ? (
              <select value={metricId} onChange={(e) => setMetricId(e.target.value)} className={input}>
                {metrics.map((m) => (
                  <option key={m.id} value={m.id}>{m.label}</option>
                ))}
              </select>
            ) : (
              <span className="text-sm text-dark-slate/80">{metrics[0].label}:</span>
            )}
            <input value={value} onChange={(e) => setValue(e.target.value)} inputMode="decimal" placeholder="0" className={`${input} w-28`} />
            <span className="text-sm text-dark-slate/60">{unit}</span>
          </div>
        </div>
      ) : (
        <p className="text-xs text-dark-slate/50">
          {t("noMetrics")}{" "}
          <Link href={`/projects/${slug}/impact`} className="font-semibold text-seagrass hover:underline">{t("addMetric")}</Link>
        </p>
      )}

      <div className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-dark-slate">{t("photoLabel")}</span>
        {imageUrl && (
          <img src={imageUrl} alt="" className="max-h-56 w-full max-w-sm rounded-lg border border-muted-teal/30 object-cover" />
        )}
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={pickPhoto} />
        <div className="flex gap-3">
          <button type="button" disabled={uploading} onClick={() => fileRef.current?.click()} className="self-start rounded-lg border border-muted-teal/40 px-3 py-1.5 text-sm text-dark-slate hover:border-seagrass disabled:opacity-60">
            📷 {uploading ? t("uploading") : imageUrl ? t("changePhoto") : t("addPhoto")}
          </button>
          {imageUrl && (
            <button type="button" onClick={() => setImageUrl("")} className="text-sm text-dark-slate/60 hover:text-dark-slate">{t("removePhoto")}</button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 border-t border-muted-teal/20 pt-4">
        <button type="button" disabled={pending || uploading || !hasSomething} onClick={() => act(() => savePulse(slug, { note, imageUrl, metricId, value }), "saved")} className={primary}>
          {pending ? t("saving") : t("save")}
        </button>
        {canSnooze && (
          <button type="button" disabled={pending} onClick={() => act(() => snoozePulse(slug), "snoozed")} className="text-sm text-dark-slate/60 hover:text-dark-slate">
            {t("snooze")}
          </button>
        )}
        {error && <span className="text-xs text-watermelon">{error}</span>}
      </div>
    </div>
  );
}
