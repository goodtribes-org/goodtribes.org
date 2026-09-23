import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { sanitizeHtml } from "@/lib/sanitizeHtml";
import FillPoller from "../ide/FillPoller";

// Shared pieces of the one-page phase overviews (Etablera, Skala, Impact;
// Idé/Uppstart/Lansering predate these and inline the same markup).

export function OverviewHeader({
  heading,
  intro,
  polling,
  stepByStep,
  notYet,
  progressLabel,
  steps,
  draftCta,
}: {
  heading: string;
  intro: string;
  polling: boolean;
  stepByStep: { href: string; label: string };
  notYet?: { text: string; href: string; linkLabel: string } | null;
  progressLabel: string;
  steps: { key: string; label: string; done: boolean; anchor: string }[];
  draftCta?: ReactNode;
}) {
  return (
    <>
      {polling && <FillPoller />}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-dark-slate">{heading}</h1>
          <p className="mt-1 text-sm text-dark-slate/60">{intro}</p>
        </div>
        <Link href={stepByStep.href} className="text-sm font-medium text-dark-slate/60 hover:text-coral">
          {stepByStep.label}
        </Link>
      </div>
      {notYet && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {notYet.text}{" "}
          <Link href={notYet.href} className="font-semibold underline underline-offset-2">
            {notYet.linkLabel}
          </Link>
        </p>
      )}
      <nav aria-label={progressLabel} className="flex flex-wrap gap-2">
        {steps.map((s) => (
          <a
            key={s.key}
            href={`#${s.anchor}`}
            className={`rounded-full border px-3 py-1 text-xs font-medium ${
              s.done ? "border-seagrass/40 bg-seagrass/10 text-seagrass" : "border-muted-teal/40 bg-white text-dark-slate/60 hover:border-coral/50"
            }`}
          >
            {s.done ? "✓ " : ""}
            {s.label}
          </a>
        ))}
      </nav>
      {draftCta}
    </>
  );
}

export function DraftCta({ text, children }: { text: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-seagrass/30 bg-seagrass/5 p-5">
      <p className="flex-1 text-sm text-dark-slate/75">{text}</p>
      {children}
    </div>
  );
}

export function FocusBox({ heading, items, note }: { heading: string; items: string[]; note?: string | null }) {
  if (!items.length && !note) return null;
  return (
    <section aria-labelledby="fokus-heading" className="rounded-2xl border border-muted-teal/30 bg-dry-sage/15 p-5">
      <h2 id="fokus-heading" className="text-sm font-semibold uppercase tracking-wide text-dark-slate/60">
        {heading}
      </h2>
      {items.length > 0 && (
        <ul className="mt-2 list-disc pl-5 text-sm text-dark-slate/80">
          {items.map((f, i) => (
            <li key={i}>{f}</li>
          ))}
        </ul>
      )}
      {note && <p className="mt-2 text-sm italic text-dark-slate/70">”{note}”</p>}
    </section>
  );
}

export function WikiHtml({ html }: { html: string }) {
  return (
    <div
      className="text-sm text-dark-slate/80 [&_h2]:mb-1 [&_h2]:mt-3 [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:text-dark-slate [&_h2:first-child]:mt-0 [&_ul]:list-disc [&_ul]:pl-5 [&_em]:text-dark-slate/50"
      dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }}
    />
  );
}

export function FieldGrid({ fields, empty }: { fields: { key: string; label: string; value: string | null | undefined }[]; empty: string }) {
  if (!fields.some((f) => f.value?.trim())) return <p className="text-sm text-dark-slate/50">{empty}</p>;
  return (
    <dl className="grid gap-4 md:grid-cols-2">
      {fields.map((f) => (
        <div key={f.key}>
          <dt className="text-xs font-semibold uppercase tracking-wide text-dark-slate/50">{f.label}</dt>
          <dd className="mt-1 whitespace-pre-line text-sm text-dark-slate/80">{f.value?.trim() || <span className="text-dark-slate/40">—</span>}</dd>
        </div>
      ))}
    </dl>
  );
}

export function TaskList({
  cards,
  total,
  aiDraftLabel,
  moreLabel,
  emptyLabel,
}: {
  cards: { id: string; title: string; createdByAi: boolean }[];
  total: number;
  aiDraftLabel: string;
  moreLabel: (count: number) => string;
  emptyLabel: string;
}) {
  if (!cards.length) return <p className="text-sm text-dark-slate/50">{emptyLabel}</p>;
  return (
    <>
      <ul className="flex flex-col divide-y divide-muted-teal/15">
        {cards.map((c) => (
          <li key={c.id} className="flex items-center justify-between gap-3 py-2 text-sm text-dark-slate/80">
            <span>{c.title}</span>
            {c.createdByAi && <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-seagrass">{aiDraftLabel}</span>}
          </li>
        ))}
      </ul>
      {total > cards.length && <p className="mt-2 text-xs text-dark-slate/50">{moreLabel(total - cards.length)}</p>}
    </>
  );
}

export function GateClosed({ text, href, linkLabel }: { text: string; href: string; linkLabel: string }) {
  return (
    <p className="rounded-2xl border border-seagrass/30 bg-seagrass/5 px-5 py-3 text-sm text-dark-slate/75">
      {text}{" "}
      <Link href={href} className="font-semibold text-seagrass hover:underline">
        {linkLabel}
      </Link>
    </p>
  );
}
