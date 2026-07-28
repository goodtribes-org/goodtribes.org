"use client";

import { useState, useTransition } from "react";
import FileUpload from "@/components/FileUpload";
import { toProxyUrl } from "@/lib/storageUrl";
import { HERO_TINT_COLORS, HERO_TINT_OPACITIES, HERO_TINT_LABELS, heroTintClass, type HeroTintColorName, type HeroTintOpacity } from "@/lib/heroTint";
import type { HeroSlideData } from "@/lib/heroSlides";
import {
  createHeroSlide,
  updateHeroSlide,
  deleteHeroSlide,
  reorderHeroSlides,
  type ObstacleInput,
  type PointInput,
} from "@/app/[locale]/home-hero-actions";

const EMPTY_FORM = {
  imageUrl: "",
  alt: "",
  heading: "",
  body: "",
  bodyLine2: "",
  body2: "",
  obstacles: [] as ObstacleInput[],
  outro: "",
  points: [] as PointInput[],
  menuLabel: "",
  tintColor: "CORAL" as HeroTintColorName,
  tintOpacity: 10 as HeroTintOpacity,
};

export default function HeroCarouselEditor({ initialSlides }: { initialSlides: HeroSlideData[] }) {
  const [slides, setSlides] = useState(initialSlides);
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function startEdit(slide: HeroSlideData) {
    setEditingId(slide.id);
    setForm({
      imageUrl: slide.imageUrl,
      alt: slide.alt,
      heading: slide.heading,
      body: slide.body,
      bodyLine2: slide.bodyLine2,
      body2: slide.body2,
      obstacles: slide.obstacles,
      outro: slide.outro,
      points: slide.points,
      menuLabel: slide.menuLabel,
      tintColor: slide.tintColor as HeroTintColorName,
      tintOpacity: slide.tintOpacity as HeroTintOpacity,
    });
    setError(null);
  }

  function startNew() {
    setEditingId("new");
    setForm(EMPTY_FORM);
    setError(null);
  }

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const result = editingId === "new" ? await createHeroSlide(form) : await updateHeroSlide(editingId as string, form);

      if ("error" in result) {
        setError(result.error);
        return;
      }

      const saved: HeroSlideData = {
        id: result.slide.id,
        imageUrl: result.slide.imageUrl,
        alt: result.slide.alt,
        heading: result.slide.heading,
        body: result.slide.body,
        bodyLine2: result.slide.bodyLine2 ?? "",
        body2: result.slide.body2 ?? "",
        obstacles: (result.slide.obstacles as unknown as ObstacleInput[] | null) ?? [],
        outro: result.slide.outro ?? "",
        points: (result.slide.points as unknown as PointInput[] | null) ?? [],
        menuLabel: result.slide.menuLabel,
        tintColor: result.slide.tintColor,
        tintOpacity: result.slide.tintOpacity,
      };

      setSlides((prev) => (editingId === "new" ? [...prev, saved] : prev.map((s) => (s.id === saved.id ? saved : s))));
      setEditingId(null);
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Ta bort den här sliden?")) return;
    startTransition(async () => {
      const result = await deleteHeroSlide(id);
      if ("error" in result) return;
      setSlides((prev) => prev.filter((s) => s.id !== id));
      if (editingId === id) setEditingId(null);
    });
  }

  function move(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= slides.length) return;
    const next = [...slides];
    [next[index], next[target]] = [next[target], next[index]];
    setSlides(next);
    startTransition(async () => {
      await reorderHeroSlides(next.map((s) => s.id));
    });
  }

  function updateObstacle(i: number, key: "lead" | "text", value: string) {
    setForm((f) => ({ ...f, obstacles: f.obstacles.map((o, idx) => (idx === i ? { ...o, [key]: value } : o)) }));
  }

  function updatePoint(i: number, key: "pct" | "text", value: string) {
    setForm((f) => ({ ...f, points: f.points.map((p, idx) => (idx === i ? { ...p, [key]: value } : p)) }));
  }

  return (
    <div>
      <ul className="space-y-2 mb-6">
        {slides.map((s, i) => (
          <li key={s.id} className="flex items-center gap-3 border border-dark-slate/10 rounded-lg px-3 py-2">
            <img src={toProxyUrl(s.imageUrl)} alt="" className="w-16 h-10 object-cover rounded-md flex-shrink-0" />
            <span className={`w-3 h-3 rounded-full flex-shrink-0 ${heroTintClass(s.tintColor, s.tintOpacity)}`} />
            <span className="flex-1 truncate text-sm text-dark-slate/80">{s.heading}</span>
            <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="text-dark-slate/40 hover:text-dark-slate disabled:opacity-30">
              ↑
            </button>
            <button type="button" onClick={() => move(i, 1)} disabled={i === slides.length - 1} className="text-dark-slate/40 hover:text-dark-slate disabled:opacity-30">
              ↓
            </button>
            <button type="button" onClick={() => startEdit(s)} className="text-xs text-seagrass hover:underline">
              Redigera
            </button>
            <button type="button" onClick={() => handleDelete(s.id)} disabled={isPending} className="text-xs text-coral hover:underline disabled:opacity-40">
              Ta bort
            </button>
          </li>
        ))}
      </ul>

      {editingId === null ? (
        <button type="button" onClick={startNew} className="text-sm text-seagrass hover:underline">
          + Lägg till slide
        </button>
      ) : (
        <div className="space-y-4 border-t border-dark-slate/10 pt-4">
          <FileUpload
            visibility="public"
            currentImageUrl={form.imageUrl ? toProxyUrl(form.imageUrl) : undefined}
            previewClassName="w-40 aspect-[16/10] rounded-lg"
            onUpload={(url) => setForm((f) => ({ ...f, imageUrl: url }))}
          />
          <input
            value={form.alt}
            onChange={(e) => setForm((f) => ({ ...f, alt: e.target.value }))}
            placeholder="Alt-text (beskrivning av bilden)"
            className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-seagrass"
          />
          <input
            value={form.heading}
            onChange={(e) => setForm((f) => ({ ...f, heading: e.target.value }))}
            placeholder="Rubrik"
            className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-seagrass"
          />
          <textarea
            value={form.body}
            onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
            placeholder="Text"
            rows={3}
            className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-seagrass"
          />
          <input
            value={form.bodyLine2}
            onChange={(e) => setForm((f) => ({ ...f, bodyLine2: e.target.value }))}
            placeholder="Extra textrad efter texten (valfritt)"
            className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-seagrass"
          />
          <textarea
            value={form.body2}
            onChange={(e) => setForm((f) => ({ ...f, body2: e.target.value }))}
            placeholder="Andra stycket (valfritt)"
            rows={3}
            className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-seagrass"
          />

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-dark-slate/60">Punktlista (valfritt)</span>
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, obstacles: [...f.obstacles, { lead: "", text: "" }] }))}
                className="text-xs text-seagrass hover:underline"
              >
                + Lägg till punkt
              </button>
            </div>
            {form.obstacles.map((o, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input
                  value={o.lead}
                  onChange={(e) => updateObstacle(i, "lead", e.target.value)}
                  placeholder="Rubrik"
                  className="w-1/3 border border-gray-200 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:border-seagrass"
                />
                <input
                  value={o.text}
                  onChange={(e) => updateObstacle(i, "text", e.target.value)}
                  placeholder="Text"
                  className="flex-1 border border-gray-200 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:border-seagrass"
                />
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, obstacles: f.obstacles.filter((_, idx) => idx !== i) }))}
                  className="text-coral text-xs hover:underline"
                >
                  Ta bort
                </button>
              </div>
            ))}
          </div>

          <input
            value={form.outro}
            onChange={(e) => setForm((f) => ({ ...f, outro: e.target.value }))}
            placeholder="Text efter punktlistan (valfritt)"
            className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-seagrass"
          />

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-dark-slate/60">Procentlista (valfritt)</span>
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, points: [...f.points, { pct: "", text: "" }] }))}
                className="text-xs text-seagrass hover:underline"
              >
                + Lägg till rad
              </button>
            </div>
            {form.points.map((p, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input
                  value={p.pct}
                  onChange={(e) => updatePoint(i, "pct", e.target.value)}
                  placeholder="10 %"
                  className="w-20 border border-gray-200 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:border-seagrass"
                />
                <input
                  value={p.text}
                  onChange={(e) => updatePoint(i, "text", e.target.value)}
                  placeholder="Text"
                  className="flex-1 border border-gray-200 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:border-seagrass"
                />
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, points: f.points.filter((_, idx) => idx !== i) }))}
                  className="text-coral text-xs hover:underline"
                >
                  Ta bort
                </button>
              </div>
            ))}
          </div>

          <input
            value={form.menuLabel}
            onChange={(e) => setForm((f) => ({ ...f, menuLabel: e.target.value }))}
            placeholder="Menyetikett"
            className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-seagrass"
          />

          <div>
            <span className="text-xs font-medium text-dark-slate/60 block mb-2">Färgton</span>
            <div className="flex gap-2">
              {HERO_TINT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, tintColor: c }))}
                  className={`w-8 h-8 rounded-full ${heroTintClass(c, form.tintOpacity)} ${form.tintColor === c ? "ring-2 ring-dark-slate" : "ring-1 ring-dark-slate/10"}`}
                  title={HERO_TINT_LABELS[c]}
                />
              ))}
            </div>
          </div>

          <div>
            <span className="text-xs font-medium text-dark-slate/60 block mb-2">Intensitet</span>
            <div className="flex gap-2">
              {HERO_TINT_OPACITIES.map((o) => (
                <button
                  key={o}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, tintOpacity: o }))}
                  className={`text-xs px-3 py-1.5 rounded-md border ${
                    form.tintOpacity === o ? "border-dark-slate text-dark-slate" : "border-dark-slate/20 text-dark-slate/50"
                  }`}
                >
                  {o}%
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-xs text-coral">{error}</p>}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button type="button" onClick={() => setEditingId(null)} className="text-sm text-dark-slate/50 hover:text-dark-slate transition-colors">
              Avbryt
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isPending}
              className="text-sm font-medium px-4 py-2 rounded-lg bg-seagrass text-white hover:bg-seagrass/90 transition-colors disabled:opacity-50"
            >
              Spara
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
