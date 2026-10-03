"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import FieldProvenanceBadge from "@/components/ai/FieldProvenanceBadge";
import AiSuggestionBox from "@/components/ai/AiSuggestionBox";
import BlockIterateMenu from "@/components/ai/BlockIterateMenu";
import ChangeImpactHint from "@/components/ai/ChangeImpactHint";
import { markAiSuggestionPartlyUsed } from "@/lib/actions/aiSuggestions";
import type { ProvenanceInfo } from "@/lib/fieldProvenance";
import { CANVAS_BLOCK_BORDER, CANVAS_BLOCK_SHADOW, canvasBlockStatus } from "@/lib/canvasBlockStatus";
import { updateLeanCanvasBlock } from "./actions";
import type { LeanCanvasField } from "./fields";
import InlineBlockText from "@/components/canvas/InlineBlockText";

interface Props {
  projectSlug: string;
  field: LeanCanvasField;
  area: string;
  label: string;
  hint: string;
  value: string | null;
  canEdit: boolean;
  // Present only when provenance marking is enabled (ai-project-start flag);
  // undefined hides the vet/antar badge entirely. null = no row for this field.
  provenance?: ProvenanceInfo | null;
  // A pending AI suggestion for this field (shown next to it, never written).
  suggestion?: { id: string; content: string };
}

export default function LeanCanvasBlock({ projectSlug, field, area, label, hint, value, canEdit, provenance, suggestion }: Props) {
  const t = useTranslations("LeanCanvasBlock");
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  // "Använd delar": the editor opens with the suggestion to adapt; saving
  // then closes the suggestion and marks the field as an edited AI draft.
  const [draftFromSuggestion, setDraftFromSuggestion] = useState<string | null>(null);
  // Mirrors the Vet/Antar badge so the border colour follows a toggle at
  // once, not only after the server round-trip.
  const [knowledge, setKnowledge] = useState(provenance?.status ?? null);
  useEffect(() => setKnowledge(provenance?.status ?? null), [provenance?.status]);
  const status = canvasBlockStatus(value, knowledge);
  // Konsekvenskontroll: after a save that actually changed the text, hint
  // which other fields build on this one (lib/fieldDependencies.ts).
  const [changed, setChanged] = useState(false);

  function handleSave(formData: FormData) {
    startTransition(async () => {
      const changedText = String(formData.get("value") ?? "").trim() !== (value ?? "").trim();
      await updateLeanCanvasBlock(projectSlug, field, formData);
      setChanged(changedText);
      if (draftFromSuggestion !== null && suggestion) await markAiSuggestionPartlyUsed(suggestion.id);
      setDraftFromSuggestion(null);
      setEditing(false);
    });
  }

  return (
    <div
      data-area={area}
      data-status={status}
      className={`border-2 ${CANVAS_BLOCK_BORDER[status]} ${CANVAS_BLOCK_SHADOW} rounded-lg bg-white p-3 flex flex-col min-h-[150px] transition-colors`}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="min-w-0">
          {/* Vet/Antar right after the heading; who wrote it (AI-utkast)
              isn't shown on the canvas — the border colour and the badge
              already say what matters here: known, assumed or empty. */}
          <div className="flex flex-wrap items-center gap-1.5">
            <h3 className="text-xs font-bold text-dark-slate uppercase tracking-wide">{label}</h3>
            {provenance !== undefined && (
              <FieldProvenanceBadge
                projectSlug={projectSlug}
                entity="leanCanvas"
                field={field}
                info={provenance ?? undefined}
                hasContent={!!value?.trim()}
                canEdit={canEdit}
                onStatusChange={setKnowledge}
              />
            )}
          </div>
          <p className="text-[11px] text-dark-slate/65 leading-snug mt-0.5">{hint}</p>
        </div>
      </div>

      <InlineBlockText
        value={value}
        draft={draftFromSuggestion}
        hint={hint}
        canEdit={canEdit}
        editing={editing}
        pending={pending}
        rows={5}
        emptyLabel={canEdit ? t("emptyEditable") : t("emptyReadOnly")}
        onStart={() => setEditing(true)}
        onCancel={() => {
          setDraftFromSuggestion(null);
          setEditing(false);
        }}
        onSave={handleSave}
      />
      {!editing && <BlockIterateMenu projectSlug={projectSlug} entity="leanCanvas" field={field} hasContent={!!value?.trim()} />}
      {changed && !editing && <ChangeImpactHint projectSlug={projectSlug} fieldKey={`leanCanvas.${field}`} onClose={() => setChanged(false)} />}
      {suggestion && !editing && (
        <AiSuggestionBox
          suggestion={suggestion}
          canEdit={canEdit}
          onUseParts={() => {
            setDraftFromSuggestion(value ? `${value}\n\n${suggestion.content}` : suggestion.content);
            setEditing(true);
          }}
        />
      )}
    </div>
  );
}
