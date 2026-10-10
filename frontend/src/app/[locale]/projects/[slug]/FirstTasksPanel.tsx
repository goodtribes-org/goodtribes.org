"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { OpenFirstTask } from "@/lib/firstTasks";
import { offerFirstTask, takeFirstTask, withdrawOffer } from "./first-task-actions";

// "Bli en del av drömmen" (#277): the project's open first tasks for someone
// from outside, as step 2 between Följ and Gå med. Logged out, what they
// wrote is kept in localStorage while they log in, and the task opens again
// when they're back (?take=<card>), ready to send.

const draftKey = (cardId: string) => `gt:first-task:${cardId}`;

function Chip({ children, token }: { children: React.ReactNode; token?: boolean }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${token ? "bg-[#FFF1C2] text-[#8A5A00]" : "bg-dry-sage/25 text-dark-slate/70"}`}>
      {children}
    </span>
  );
}

function TaskChips({ task }: { task: OpenFirstTask }) {
  const t = useTranslations("FirstTasks");
  return (
    <div className="flex flex-wrap gap-1">
      <Chip token>{t("tokens", { count: task.tokens })}</Chip>
      {task.time && <Chip>⏱ {t(`time_${task.time}`)}</Chip>}
      <Chip>📍 {task.place ?? t("remote")}</Chip>
    </div>
  );
}

function TakeSheet({ task, slug, projectTitle, userId, onClose, onDone }: {
  task: OpenFirstTask; slug: string; projectTitle: string; userId: string | null; onClose: () => void; onDone: () => void;
}) {
  const t = useTranslations("FirstTasks");
  const [answer, setAnswer] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Back from the login page: what they wrote before.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(draftKey(task.id));
      if (raw) {
        const d = JSON.parse(raw) as { answer?: string; message?: string };
        setAnswer(d.answer ?? "");
        setMessage(d.message ?? "");
      }
    } catch {}
  }, [task.id]);

  function submit() {
    setError(null);
    if (!userId) {
      try { localStorage.setItem(draftKey(task.id), JSON.stringify({ answer, message })); } catch {}
      window.location.assign(`/login?callbackUrl=${encodeURIComponent(`/projects/${slug}?take=${task.id}`)}`);
      return;
    }
    startTransition(async () => {
      const res = task.choose ? await offerFirstTask(task.id, answer, message) : await takeFirstTask(task.id, message);
      if ("error" in res) return setError(t("error"));
      try { localStorage.removeItem(draftKey(task.id)); } catch {}
      setSent(true);
      onDone();
    });
  }

  return (
    <div className="fixed inset-0 z-[10000] flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-6 sm:rounded-3xl" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        {!sent ? (
          <div className="flex flex-col gap-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-coral">{t("sheetEyebrow", { project: projectTitle })}</p>
                <p className="mt-1 text-2xl font-bold leading-tight text-dark-slate">{task.title}</p>
              </div>
              <button type="button" onClick={onClose} className="text-2xl leading-none text-dark-slate/40" aria-label={t("close")}>×</button>
            </div>
            {task.why && <p className="text-sm text-dark-slate/70">{task.why}</p>}
            <TaskChips task={task} />
            <p className="rounded-2xl bg-seagrass/10 p-3 text-sm text-seagrass">
              {t("sheetInfo")} {task.choose && t("sheetInfoChoose")}
            </p>
            {task.choose && task.question && (
              <label className="flex flex-col gap-1.5 text-sm font-semibold text-dark-slate">
                {t("questionLabel", { question: task.question })}
                <textarea value={answer} onChange={(e) => setAnswer(e.target.value)} rows={2} placeholder={t("answerPlaceholder")} className="rounded-xl border border-muted-teal/40 p-3 text-sm font-normal" />
              </label>
            )}
            <label className="flex flex-col gap-1.5 text-sm font-semibold text-dark-slate">
              {t("messageLabel")}
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={2} placeholder={t("messagePlaceholder")} className="rounded-xl border border-muted-teal/40 p-3 text-sm font-normal" />
            </label>
            {error && <p className="text-sm text-watermelon">{error}</p>}
            <button type="button" onClick={submit} disabled={pending} className="rounded-full bg-coral px-4 py-3 font-bold text-white hover:bg-coral/90 disabled:opacity-60">
              {pending ? t("sending") : task.choose ? t("submitOffer") : t("submitTake")}
            </button>
            {!userId && <p className="text-center text-xs text-dark-slate/50">{t("loginNote")}</p>}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <span className="text-5xl" aria-hidden>🤝</span>
            <p className="text-2xl font-bold text-dark-slate">{task.choose ? t("doneOfferTitle") : t("doneTakeTitle")}</p>
            <p className="text-sm leading-relaxed text-dark-slate/70">{task.choose ? t("doneOfferBody") : t("doneTakeBody")}</p>
            <div className="mt-2 flex gap-2">
              {!task.choose && (
                <a href={`/projects/${slug}/tasks?card=${task.id}`} className="rounded-full bg-coral px-4 py-2 text-sm font-bold text-white">{t("openTask")}</a>
              )}
              <button type="button" onClick={onClose} className="rounded-full border border-muted-teal/40 px-4 py-2 text-sm font-bold text-dark-slate">{t("close")}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function FirstTasksPanel({ tasks, slug, projectTitle, userId }: { tasks: OpenFirstTask[]; slug: string; projectTitle: string; userId: string | null }) {
  const t = useTranslations("FirstTasks");
  const router = useRouter();
  const [open, setOpen] = useState<OpenFirstTask | null>(null);
  const [, startTransition] = useTransition();
  const resumed = useRef(false);

  // Back from the login page with ?take=<card>: open that task again.
  useEffect(() => {
    if (resumed.current) return;
    resumed.current = true;
    const url = new URL(window.location.href);
    const id = url.searchParams.get("take");
    if (!id) return;
    url.searchParams.delete("take");
    router.replace(url.pathname + url.search, { scroll: false });
    const task = tasks.find((x) => x.id === id);
    if (task && userId) setOpen(task);
  }, [tasks, userId, router]);

  if (tasks.length === 0) return null;
  return (
    <div id="forsta-uppgifter" className="scroll-mt-24">
      <p className="text-sm font-semibold text-dark-slate">
        {t("panelHeading")} <span className="text-[11px] font-normal text-dark-slate/50">· {t("panelStep")}</span>
      </p>
      <p className="mt-0.5 mb-2 text-xs text-dark-slate/60">{t("panelIntro")}</p>
      <ul className="flex flex-col gap-2">
        {tasks.map((task) => (
          <li key={task.id} className="rounded-lg border border-muted-teal/30 p-2.5">
            <p className="text-sm font-semibold leading-tight text-dark-slate">{task.title}</p>
            {task.why && <p className="mt-0.5 text-xs text-dark-slate/60 line-clamp-2">{task.why}</p>}
            <div className="mt-1.5 flex items-center justify-between gap-2">
              <TaskChips task={task} />
              {task.myOffer === "PENDING" ? (
                <span className="flex shrink-0 items-center gap-1.5 text-[11px] font-semibold text-seagrass">
                  ✓ {t("myOffer_PENDING")}
                  <button type="button" onClick={() => startTransition(async () => { await withdrawOffer(task.id); router.refresh(); })} className="font-normal text-dark-slate/50 underline">
                    {t("withdraw")}
                  </button>
                </span>
              ) : task.full ? (
                <span className="shrink-0 text-[11px] text-dark-slate/50">{t("full")}</span>
              ) : (
                <button type="button" onClick={() => setOpen(task)} className="shrink-0 rounded-full bg-coral px-3 py-1 text-xs font-bold text-white hover:bg-coral/90">
                  {task.choose ? t("signUp") : t("take")}
                </button>
              )}
            </div>
            {task.choose && task.myOffer !== "PENDING" && !task.full && <p className="mt-1 text-[10px] text-dark-slate/45">{t("chooseNote")}</p>}
          </li>
        ))}
      </ul>
      {open && (
        <TakeSheet task={open} slug={slug} projectTitle={projectTitle} userId={userId} onClose={() => setOpen(null)} onDone={() => router.refresh()} />
      )}
    </div>
  );
}
