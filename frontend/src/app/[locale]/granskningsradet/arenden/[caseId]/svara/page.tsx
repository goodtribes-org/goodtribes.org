import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { submitCaseResponse } from "../../../actions";

export const metadata: Metadata = {
  title: "Svara på anmälan — Granskningsrådet",
};

export default async function RespondToCasePage({
  params,
}: {
  params: Promise<{ caseId: string }>;
}) {
  const { caseId } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const exclusionCase = await prisma.exclusionCase.findUnique({ where: { id: caseId } });
  if (!exclusionCase) notFound();
  if (exclusionCase.reportedUserId !== session.user.id) notFound();

  async function submit(formData: FormData) {
    "use server";
    const result = await submitCaseResponse(caseId, formData);
    if (result && "success" in result) redirect(`/granskningsradet/arenden/${caseId}`);
  }

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-2xl font-bold text-dark-slate mb-1">Svara på anmälan</h1>
      <p className="text-sm text-dark-slate/50 mb-6">
        Du har blivit anmäld till Granskningsrådet. Här kan du ge din version innan rådet fattar ett beslut.
      </p>

      <div className="border border-muted-teal/40 rounded-lg p-4 mb-6 bg-white">
        <p className="text-xs font-semibold text-dark-slate/50 uppercase tracking-wide mb-1">Anmälan</p>
        <p className="text-sm text-dark-slate/80 whitespace-pre-wrap">{exclusionCase.reason}</p>
      </div>

      {exclusionCase.responseText ? (
        <p className="text-sm text-dark-slate/50">Du har redan svarat på anmälan.</p>
      ) : (
        <form action={submit} className="flex flex-col gap-4">
          <textarea
            name="responseText"
            rows={6}
            required
            placeholder="Din version av vad som hänt…"
            className="w-full border border-muted-teal rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral resize-none"
          />
          <button
            type="submit"
            className="self-start bg-coral text-white rounded-md px-6 py-2 text-sm font-medium hover:bg-watermelon transition-colors"
          >
            Skicka svar
          </button>
        </form>
      )}
    </div>
  );
}
