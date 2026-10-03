"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import FieldProvenanceBadge from "@/components/ai/FieldProvenanceBadge";
import AiSuggestionBox from "@/components/ai/AiSuggestionBox";
import BlockIterateMenu from "@/components/ai/BlockIterateMenu";
import ChangeImpactHint from "@/components/ai/ChangeImpactHint";
import { markAiSuggestionPartlyUsed } from "@/lib/actions/aiSuggestions";
import type { ProvenanceInfo } from "@/lib/fieldProvenance";
import { updateImpactModelBlock } from "./actions";
import type { ImpactModelField } from "./fields";
import { CANVAS_BLOCK_BORDER, CANVAS_BLOCK_SHADOW, canvasBlockStatus } from "@/lib/canvasBlockStatus";
import InlineBlockText from "@/components/canvas/InlineBlockText";

interface Props {
  projectSlug: string;
  field: ImpactModelField;
  label: string;
  hint: string;
  value: string | null;
  canEdit: boolean;
  // Text from the earlier Lean Canvas worth moving here (the Problem block → Issue).
  legacy?: { label: string; text: string };
  // Same AI props as LeanCanvasBlock: undefined provenance hides vet/antar.
  provenance?: ProvenanceInfo | null;
  suggestion?: { id: string; content: string };
}

// Same edit-in-place pattern as LeanCanvasBlock.
export default function ImpactModelBlock({ projectSlug, field, label, hint, value, canEdit, legacy, provenance, suggestion }: Props) {
  const t = useTranslations("LeanCanvasBlock");
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [draftFromSuggestion, setDraftFromSuggestion] = useState<string | null>(null);
  // Konsekvenskontroll: after a save that actually changed the text, hint
  // which other fields build on this one (lib/fieldDependencies.ts).
  const [changed, setChanged] = useState(false);

  function handleSave(formData: FormData) {
    startTransition(async () => {
      const changedText = String(formData.get("value") ?? "").trim() !== (value ?? "").trim();
      await updateImpactModelBlock(projectSlug, field, formData);
      setChanged(changedText);
      if (draftFromSuggestion !== null && suggestion) await markAiSuggestionPartlyUsed(suggestion.id);
      setDraftFromSuggestion(null);
      setEditing(false);
    });
  }

  // Border colour = the block's status, as on the Lean Canvas (empty / an
  // assumption / known), following the vet/antar badge as it changes.
  const [knowledge, setKnowledge] = useState(provenance?.status ?? null);
  useEffect(() => setKnowledge(provenance?.status ?? null), [provenance?.status]);
  const status = canvasBlockStatus(value, knowledge);

  return (
    <div className={`border-2 ${CANVAS_BLOCK_BORDER[status]} ${CANVAS_BLOCK_SHADOW} rounded-lg bg-white p-3 flex flex-col min-h-[150px] transition-colors`}>
      <div className="flex items-start justify-between gap-2 mb-1">
        <div>
          <h3 className="text-xs font-bold text-dark-slate uppercase tracking-wide">{label}</h3>
          <p className="text-[11px] text-dark-slate/65 leading-snug mt-0.5">{hint}</p>
          {provenance !== undefined && (
            <div className="mt-1">
              <FieldProvenanceBadge
                projectSlug={projectSlug}
                entity="impactModel"
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
        rows={5}
        emptyLabel={canEdit ? t("emptyEditable") : t("emptyReadOnly")}
        onStart={() => setEditing(true)}
        onCancel={() => {
          setDraftFromSuggestion(null);
          setEditing(false);
        }}
        onSave={handleSave}
      />
      {!editing && <BlockIterateMenu projectSlug={projectSlug} entity="impactModel" field={field} hasContent={!!value?.trim()} />}
      {changed && !editing && <ChangeImpactHint projectSlug={projectSlug} fieldKey={`impactModel.${field}`} onClose={() => setChanged(false)} />}
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
      {legacy && !value && !editing && (
        <div className="mt-2 border-t border-dashed border-dark-slate/15 pt-2">
          <p className="text-[10px] font-bold text-dark-slate/50 uppercase tracking-wide">{legacy.label}</p>
          <p className="text-xs text-dark-slate/60 whitespace-pre-wrap">{legacy.text}</p>
        </div>
      )}
    </div>
  );
}
