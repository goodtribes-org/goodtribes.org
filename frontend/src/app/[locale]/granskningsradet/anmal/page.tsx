import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createExclusionCase } from "../actions";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "ReportCasePage" });
  return { title: t("pageTitle") };
}

export default async function ReportUserPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ userId?: string; projectId?: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "ReportCasePage" });

  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { userId: reportedUserId, projectId } = await searchParams;
  if (!reportedUserId) notFound();
  if (reportedUserId === session.user.id) redirect(`/members/${session.user.id}`);

  const [reportedUser, project] = await Promise.all([
    prisma.user.findUnique({ where: { id: reportedUserId }, select: { id: true, name: true } }),
    projectId ? prisma.project.findUnique({ where: { id: projectId }, select: { title: true } }) : Promise.resolve(null),
  ]);
  if (!reportedUser) notFound();

  async function submit(formData: FormData) {
    "use server";
    const result = await createExclusionCase(formData);
    if (result && "success" in result) redirect(`/members/${reportedUserId}`);
  }

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-2xl font-bold text-dark-slate mb-1">
        {t("heading", { name: reportedUser.name ?? t("defaultUserName") })}
      </h1>
      <p className="text-sm text-dark-slate/50 mb-6">
        {t("description")}
        {project && (
          <>
            {" "}
            {t.rich("projectContext", {
              projectTitle: project.title,
              bold: (chunks) => <strong>{chunks}</strong>,
            })}
          </>
        )}
      </p>
      <form action={submit} className="flex flex-col gap-4">
        <input type="hidden" name="reportedUserId" value={reportedUser.id} />
        {projectId && <input type="hidden" name="projectId" value={projectId} />}
        <textarea
          name="reason"
          rows={6}
          required
          placeholder={t("reasonPlaceholder")}
          className="w-full border border-muted-teal rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral resize-none"
        />
        <div className="flex gap-3">
          <button
            type="submit"
            className="bg-coral text-white rounded-md px-6 py-2 text-sm font-medium hover:bg-watermelon transition-colors"
          >
            {t("submitButton")}
          </button>
          <a href={`/members/${reportedUserId}`} className="text-sm text-dark-slate/50 hover:text-dark-slate px-4 py-2">
            {t("cancelButton")}
          </a>
        </div>
      </form>
    </div>
  );
}
