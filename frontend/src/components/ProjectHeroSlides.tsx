"use client";

import { useState, useTransition } from "react";
import { addHeroSlide, updateHeroSlide, deleteHeroSlide } from "@/app/[locale]/projects/[slug]/hero-slide-actions";
import { handwritingFont } from "@/lib/fonts";

export type HeroSlide = {
  id: string;
  heading: string;
  body: string;
  body2: string | null;
  order: number;
};

export default function ProjectHeroSlides({
  projectId,
  slug,
  initialSlides,
  isLead,
}: {
  projectId: string;
  slug: string;
  initialSlides: HeroSlide[];
  isLead: boolean;
}) {
  const [slides, setSlides] = useState(initialSlides);
  const [active, setActive] = useState(0);
  const [managing, setManaging] = useState(false);

  if (slides.length === 0 && !isLead) return null;

  const current = slides[active];

  return (
    <div className="mb-8">
      {slides.length > 0 ? (
        <div className="relative bg-coral/10 rounded-2xl p-6 max-w-3xl mx-auto">
          {isLead && (
            <button
              type="button"
              onClick={() => setManaging(true)}
              className="absolute top-3 right-3 text-xs font-medium text-dark-slate/50 hover:text-coral transition-colors bg-white/70 rounded-md px-2 py-1"
            >
              ✎ Redigera
            </button>
          )}
          <h2 className={`${handwritingFont.className} text-dark-slate mb-1 pr-16`} style={{ fontSize: 26 }}>{current.heading}</h2>
          <p className="text-dark-slate whitespace-pre-line" style={{ fontSize: 14, lineHeight: 1.5 }}>{current.body}</p>
          {current.body2 && (
            <p className="text-dark-slate whitespace-pre-line mt-2" style={{ fontSize: 14, lineHeight: 1.5 }}>{current.body2}</p>
          )}

          {slides.length > 1 && (
            <div className="flex items-center justify-center gap-3 mt-4">
              <button
                type="button"
                onClick={() => setActive((i) => (i - 1 + slides.length) % slides.length)}
                className="text-dark-slate/40 hover:text-dark-slate transition-colors"
                aria-label="Föregående"
              >
                ‹
              </button>
              <div className="flex gap-1.5">
                {slides.map((s, i) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setActive(i)}
                    className={`w-1.5 h-1.5 rounded-full transition-colors ${i === active ? "bg-coral" : "bg-dark-slate/20"}`}
                    aria-label={`Visa sektion ${i + 1}`}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={() => setActive((i) => (i + 1) % slides.length)}
                className="text-dark-slate/40 hover:text-dark-slate transition-colors"
                aria-label="Nästa"
              >
                ›
              </button>
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setManaging(true)}
          className="block w-full max-w-3xl mx-auto border-2 border-dashed border-dark-slate/15 rounded-2xl p-6 text-sm text-dark-slate/40 hover:text-dark-slate/60 hover:border-dark-slate/25 transition-colors"
        >
          + Lägg till presentationstext för projektet
        </button>
      )}

      {managing && (
        <ManageHeroSlidesDialog
          projectId={projectId}
          slug={slug}
          slides={slides}
          onSlidesChange={(next) => {
            setSlides(next);
            setActive((i) => Math.min(i, Math.max(next.length - 1, 0)));
          }}
          onClose={() => setManaging(false)}
        />
      )}
    </div>
  );
}

function ManageHeroSlidesDialog({
  projectId,
  slug,
  slides,
  onSlidesChange,
  onClose,
}: {
  projectId: string;
  slug: string;
  slides: HeroSlide[];
  onSlidesChange: (slides: HeroSlide[]) => void;
  onClose: () => void;
}) {
  const [editingId, setEditingId] = useState<string | "new" | null>(slides.length === 0 ? "new" : null);
  const [heading, setHeading] = useState("");
  const [body, setBody] = useState("");
  const [body2, setBody2] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function startEdit(slide: HeroSlide) {
    setEditingId(slide.id);
    setHeading(slide.heading);
    setBody(slide.body);
    setBody2(slide.body2 ?? "");
    setError(null);
  }

  function startNew() {
    setEditingId("new");
    setHeading("");
    setBody("");
    setBody2("");
    setError(null);
  }

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const result =
        editingId === "new"
          ? await addHeroSlide(projectId, slug, heading, body, body2)
          : await updateHeroSlide(editingId as string, slug, heading, body, body2);

      if ("error" in result) {
        setError(result.error === "Heading and body are required" ? "Rubrik och text krävs." : "Något gick fel.");
        return;
      }

      const updatedSlide = result.slide;
      const next =
        editingId === "new"
          ? [...slides, updatedSlide]
          : slides.map((s) => (s.id === updatedSlide.id ? updatedSlide : s));
      onSlidesChange(next);
      setEditingId(null);
    });
  }

  function handleDelete(slideId: string) {
    startTransition(async () => {
      const result = await deleteHeroSlide(slideId, slug);
      if ("error" in result) return;
      onSlidesChange(slides.filter((s) => s.id !== slideId));
      if (editingId === slideId) setEditingId(null);
    });
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl max-w-lg w-full p-5 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-dark-slate mb-1">Presentationstext</h2>
        <p className="text-sm text-dark-slate/50 mb-4">
          Texten som visas överst på projektsidan. Bara grundare och admins för det här projektet kan ändra den.
        </p>

        <ul className="space-y-2 mb-4">
          {slides.map((s) => (
            <li key={s.id} className="flex items-center gap-2 text-sm border border-dark-slate/10 rounded-lg px-3 py-2">
              <span className="flex-1 truncate text-dark-slate/80">{s.heading}</span>
              <button type="button" onClick={() => startEdit(s)} className="text-xs text-seagrass hover:underline">
                Redigera
              </button>
              <button
                type="button"
                onClick={() => handleDelete(s.id)}
                disabled={isPending}
                className="text-xs text-coral hover:underline disabled:opacity-40"
              >
                Ta bort
              </button>
            </li>
          ))}
        </ul>

        {editingId === null ? (
          <button type="button" onClick={startNew} className="text-sm text-seagrass hover:underline mb-4">
            + Lägg till ny sektion
          </button>
        ) : (
          <div className="space-y-3 mb-4 border-t border-dark-slate/10 pt-4">
            <input
              value={heading}
              onChange={(e) => setHeading(e.target.value)}
              placeholder="Rubrik"
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-seagrass"
            />
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Text"
              rows={4}
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-seagrass"
            />
            <textarea
              value={body2}
              onChange={(e) => setBody2(e.target.value)}
              placeholder="Ytterligare text (valfritt)"
              rows={3}
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-seagrass"
            />
            {error && <p className="text-xs text-coral">{error}</p>}
            <div className="flex items-center justify-end gap-3">
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

        <div className="flex items-center justify-end border-t border-dark-slate/10 pt-3">
          <button type="button" onClick={onClose} className="text-sm text-dark-slate/50 hover:text-dark-slate transition-colors">
            Stäng
          </button>
        </div>
      </div>
    </div>
  );
}
