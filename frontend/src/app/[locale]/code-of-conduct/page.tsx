import type { Metadata } from "next";
import { auth } from "@/auth";
import { isSiteAdmin } from "@/lib/authz";
import { getSitePage } from "@/lib/sitePages";
import { sanitizeHtml } from "@/lib/sanitizeHtml";
import { htmlToPreviewText } from "@/lib/renderBody";
import { DEFAULT_SITE_PAGES } from "@/lib/defaultSitePages";
import EditableSitePage from "@/components/EditableSitePage";
import { buildMetadata } from "@/lib/metadata";
import type { Locale } from "next-intl";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  const page = (await getSitePage("code-of-conduct", locale)) ?? DEFAULT_SITE_PAGES["code-of-conduct"][locale];
  return buildMetadata({
    locale,
    path: "/code-of-conduct",
    title: page.title,
    description: htmlToPreviewText(page.body).slice(0, 160),
  });
}

export default async function CodeOfConductPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const session = await auth();
  const canEdit = session?.user?.id ? await isSiteAdmin(session.user.id) : false;

  const page = (await getSitePage("code-of-conduct", locale)) ?? DEFAULT_SITE_PAGES["code-of-conduct"][locale];

  return (
    <EditableSitePage
      slug="code-of-conduct"
      locale={locale}
      canEdit={canEdit}
      title={page.title}
      body={sanitizeHtml(page.body)}
    />
  );
}
