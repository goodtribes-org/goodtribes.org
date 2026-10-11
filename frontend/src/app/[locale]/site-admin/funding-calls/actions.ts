"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { FundingApplicantType, FundingCallAdapter, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/authz";
import { isFeatureEnabled } from "@/lib/featureFlags";
import { aiGateMessage } from "@/lib/aiMode";
import { importFundingCalls, type SourceResult } from "@/lib/fundingCalls/import";
import { APPLICANT_TYPES, suggestCallFields } from "@/lib/fundingCalls/analyze";
import { safeExternalUrl } from "@/lib/impactReports";
import { uniqueCallSlug } from "@/lib/fundingCalls/public";
import { enqueueCallPublishedMatch } from "@/lib/fundingCalls/matching";
import { toProxyUrl } from "@/lib/storageUrl";

// Utlysningar (#343), the site admin's side: which sources are fetched and
// how, "Hämta nu", hand-added calls (Arvsfonden), checking and correcting
// each call's fields, and publishing. Nothing is public until published.

const ADAPTERS: FundingCallAdapter[] = ["MANUAL", "VINNOVA", "GDP_FORMAS"];
const done = (id?: string) => {
  revalidatePath("/site-admin/funding-calls");
  if (id) revalidatePath(`/site-admin/funding-calls/${id}`);
  return {};
};

export async function setSourceAdapter(sourceId: string, adapter: string): Promise<{ error?: string }> {
  await requireAdminSession();
  if (!ADAPTERS.includes(adapter as FundingCallAdapter)) return { error: "Okänd källa" };
  await prisma.fundingSource.update({ where: { id: sourceId }, data: { adapter: adapter as FundingCallAdapter } });
  return done();
}

export async function runImportNow(sourceId?: string): Promise<{ error?: string; results?: SourceResult[]; closed?: number }> {
  await requireAdminSession();
  const { sources, closed } = await importFundingCalls({ sourceId });
  done();
  return { results: sources, closed };
}

export async function createManualCall(input: { sourceId: string; title: string }): Promise<{ error?: string }> {
  await requireAdminSession();
  const title = input.title.trim().slice(0, 300);
  if (!title) return { error: "Skriv en titel" };
  const source = await prisma.fundingSource.findUnique({ where: { id: input.sourceId }, select: { id: true } });
  if (!source) return { error: "Välj en finansiär" };
  const call = await prisma.fundingCall.create({ data: { fundingSourceId: source.id, title } });
  redirect(`/site-admin/funding-calls/${call.id}`);
}

export type CallFields = {
  title: string;
  imageUrl: string;
  url: string;
  applyUrl: string;
  deadline: string;
  rolling: boolean;
  summary: string;
  applicantTypes: string[];
  amountMinSek: string;
  amountMaxSek: string;
  totalBudgetSek: string;
  cofunding: string;
  projectStart: string;
  projectLengthMonths: string;
  sdgGoals: number[];
  tags: string;
  requirements: string;
  stateAidRule: string;
};

const int = (v: string) => {
  const n = Number(v.replace(/\s/g, ""));
  return v.trim() && Number.isInteger(n) && n >= 0 ? n : null;
};
const date = (v: string) => {
  const d = v ? new Date(v) : null;
  return d && !Number.isNaN(d.getTime()) ? d : null;
};
const text = (v: string, max: number) => v.trim().slice(0, max) || null;

export async function saveCall(id: string, f: CallFields): Promise<{ error?: string }> {
  await requireAdminSession();
  if (!f.title.trim()) return { error: "Titeln får inte vara tom" };
  const url = f.url.trim() ? safeExternalUrl(f.url.trim()) : null;
  const applyUrl = f.applyUrl.trim() ? safeExternalUrl(f.applyUrl.trim()) : null;
  if ((f.url.trim() && !url) || (f.applyUrl.trim() && !applyUrl)) return { error: "Länkarna måste vara giltiga webbadresser (http:// eller https://)" };
  // Only our own storage becomes the card's picture.
  const imageUrl = f.imageUrl ? toProxyUrl(f.imageUrl) : null;
  if (imageUrl && !imageUrl.startsWith("/storage/")) return { error: "Bilden kunde inte sparas" };
  await prisma.fundingCall.update({
    where: { id },
    data: {
      title: f.title.trim().slice(0, 300),
      imageUrl,
      url,
      applyUrl,
      deadline: f.rolling ? null : date(f.deadline),
      rolling: f.rolling,
      summary: text(f.summary, 3000),
      applicantTypes: f.applicantTypes.filter((t): t is FundingApplicantType => APPLICANT_TYPES.includes(t as FundingApplicantType)),
      amountMinSek: int(f.amountMinSek),
      amountMaxSek: int(f.amountMaxSek),
      totalBudgetSek: int(f.totalBudgetSek),
      cofunding: text(f.cofunding, 500),
      projectStart: date(f.projectStart),
      projectLengthMonths: int(f.projectLengthMonths),
      sdgGoals: [...new Set(f.sdgGoals.filter((g) => Number.isInteger(g) && g >= 1 && g <= 17))].sort((a, b) => a - b),
      tags: f.tags.split(",").map((t) => t.trim()).filter(Boolean).slice(0, 20),
      requirements: f.requirements.split("\n").map((r) => r.trim()).filter(Boolean).slice(0, 30),
      stateAidRule: text(f.stateAidRule, 300),
    } satisfies Prisma.FundingCallUpdateInput,
  });
  return done(id);
}

// What a call needs before anyone sees it.
export async function publishCall(id: string): Promise<{ error?: string }> {
  const userId = await requireAdminSession();
  const call = await prisma.fundingCall.findUnique({ where: { id }, select: { title: true, slug: true, summary: true, url: true, deadline: true, rolling: true } });
  if (!call) return { error: "Utlysningen hittades inte" };
  const missing = [!call.summary?.trim() && "sammanfattning", !call.url && "länk till finansiären", !call.deadline && !call.rolling && "deadline"].filter(Boolean);
  if (missing.length) return { error: `Saknas: ${missing.join(", ")}` };
  if (call.deadline && call.deadline.getTime() < Date.now()) return { error: "Deadline har redan passerat" };
  // The public address is set once and kept, so shared links don't break.
  const slug = call.slug ?? (await uniqueCallSlug(call.title));
  await prisma.fundingCall.update({ where: { id }, data: { status: "PUBLISHED", slug, publishedAt: new Date(), publishedById: userId, changedAt: null } });
  revalidatePath("/utlysningar");
  revalidatePath(`/utlysningar/${slug}`);
  // Projects it fits hear about it (#345).
  await enqueueCallPublishedMatch(id);
  return done(id);
}

export async function setCallStatus(id: string, status: "DRAFT" | "CLOSED"): Promise<{ error?: string }> {
  await requireAdminSession();
  await prisma.fundingCall.update({ where: { id }, data: { status } });
  return done(id);
}

// "Ändringen är granskad": the admin has looked at what the source changed.
export async function acknowledgeChange(id: string): Promise<{ error?: string }> {
  await requireAdminSession();
  await prisma.fundingCall.update({ where: { id }, data: { changedAt: null } });
  return done(id);
}

export async function suggestWithAi(id: string): Promise<{ error?: string; filled?: number }> {
  const userId = await requireAdminSession();
  if (!(await isFeatureEnabled("funding-calls-ai", userId))) return { error: "AI-förslag är avstängda (funktionsflaggan funding-calls-ai)" };
  const res = await suggestCallFields(id, userId);
  if (!res.ok) return { error: res.reason === "empty" ? "Utlysningen har ingen text att läsa" : res.reason === "not_found" ? "Utlysningen hittades inte" : aiGateMessage(res.reason) };
  done(id);
  return { filled: res.filled };
}
