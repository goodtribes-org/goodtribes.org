import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { isSiteAdmin } from "@/lib/authz";
import { getSitePage } from "@/lib/sitePages";
import { sanitizeHtml } from "@/lib/sanitizeHtml";
import EditableSitePage from "@/components/EditableSitePage";
import type { Locale } from "next-intl";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const page = await getSitePage(slug, locale);
  if (!page) return {};
  return { title: `${page.title} — GoodTribes.org` };
}

export default async function CustomSitePage({ params }: { params: Promise<{ locale: Locale; slug: string }> }) {
  const { locale, slug } = await params;
  const session = await auth();
  const canEdit = session?.user?.id ? await isSiteAdmin(session.user.id) : false;

  const page = await getSitePage(slug, locale);
  if (!page) notFound();

  return (
    <EditableSitePage
      slug={slug}
      locale={locale}
      canEdit={canEdit}
      title={page.title}
      body={sanitizeHtml(page.body)}
    />
  );
}
