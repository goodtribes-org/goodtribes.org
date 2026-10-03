"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import FieldProvenanceBadge from "@/components/ai/FieldProvenanceBadge";
import AiSuggestionBox from "@/components/ai/AiSuggestionBox";
import BlockIterateMenu from "@/components/ai/BlockIterateMenu";
import ChangeImpactHint from "@/components/ai/ChangeImpactHint";
import { markAiSuggestionPartlyUsed } from "@/lib/actions/aiSuggestions";
import type { ProvenanceInfo } from "@/lib/fieldProvenance";
import { updateValuePropositionBlock } from "./actions";
import type { ValuePropositionField } from "./fields";
import { CANVAS_BLOCK_BORDER, CANVAS_BLOCK_SHADOW, canvasBlockStatus } from "@/lib/canvasBlockStatus";
import InlineBlockText from "@/components/canvas/InlineBlockText";

interface Props {
  projectSlug: string;
  field: ValuePropositionField;
  side: "value" | "customer";
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

export default function ValuePropositionBlock({ projectSlug, field, side, label, hint, value, canEdit, provenance, suggestion }: Props) {
  const t = useTranslations("LeanCanvasBlock");
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  // "Använd delar": the editor opens with the suggestion to adapt; saving
  // then closes the suggestion and marks the field as an edited AI draft.
  const [draftFromSuggestion, setDraftFromSuggestion] = useState<string | null>(null);
  // Konsekvenskontroll: after a save that actually changed the text, hint
  // which other fields build on this one (lib/fieldDependencies.ts).
  const [changed, setChanged] = useState(false);

  function handleSave(formData: FormData) {
    startTransition(async () => {
      const changedText = String(formData.get("value") ?? "").trim() !== (value ?? "").trim();
      await updateValuePropositionBlock(projectSlug, field, formData);
      setChanged(changedText);
      if (draftFromSuggestion !== null && suggestion) await markAiSuggestionPartlyUsed(suggestion.id);
      setDraftFromSuggestion(null);
      setEditing(false);
    });
  }

  const labelColor = side === "value" ? "text-coral" : "text-seagrass";
  const ringColor = side === "value" ? "focus:ring-coral" : "focus:ring-seagrass";

  // Border colour = the block's status, as on the Lean Canvas (empty / an
  // assumption / known), following the vet/antar badge as it changes.
  const [knowledge, setKnowledge] = useState(provenance?.status ?? null);
  useEffect(() => setKnowledge(provenance?.status ?? null), [provenance?.status]);
  const status = canvasBlockStatus(value, knowledge);

  return (
    <div className={`border-2 ${CANVAS_BLOCK_BORDER[status]} ${CANVAS_BLOCK_SHADOW} rounded-lg bg-white p-3 flex flex-col min-h-[130px] transition-colors`}>
      <div className="flex items-start justify-between gap-2 mb-1">
        <div>
          <h3 className={`text-xs font-bold uppercase tracking-wide ${labelColor}`}>{label}</h3>
          <p className="text-[11px] text-dark-slate/65 leading-snug mt-0.5">{hint}</p>
          {provenance !== undefined && (
            <div className="mt-1">
              <FieldProvenanceBadge
                projectSlug={projectSlug}
                entity="valueProposition"
                field={field}
                info={provenance ?? undefined}
                hasContent={!!value?.trim()}
                canEdit={canEdit}
                onStatusChange={setKnowledge}
              />
            </div>
          )}
        </div>
      </div>

      <InlineBlockText
        value={value}
        draft={draftFromSuggestion}
        hint={hint}
        canEdit={canEdit}
        editing={editing}
        pending={pending}
        rows={4}
        ringClass={ringColor}
        emptyLabel={canEdit ? t("emptyEditable") : t("emptyReadOnly")}
        onStart={() => setEditing(true)}
        onCancel={() => {
          setDraftFromSuggestion(null);
          setEditing(false);
        }}
        onSave={handleSave}
      />
      {!editing && <BlockIterateMenu projectSlug={projectSlug} entity="valueProposition" field={field} hasContent={!!value?.trim()} />}
      {changed && !editing && <ChangeImpactHint projectSlug={projectSlug} fieldKey={`valueProposition.${field}`} onClose={() => setChanged(false)} />}
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
