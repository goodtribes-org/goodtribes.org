import { auth } from "@/auth";
import { isSiteAdmin } from "@/lib/authz";
import { getSitePage } from "@/lib/sitePages";
import { sanitizeHtml } from "@/lib/sanitizeHtml";
import { DEFAULT_SITE_PAGES } from "@/lib/defaultSitePages";
import EditableSitePage from "@/components/EditableSitePage";
import type { Locale } from "next-intl";

export default async function AboutPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const session = await auth();
  const canEdit = session?.user?.id ? await isSiteAdmin(session.user.id) : false;

  const page = (await getSitePage("about", locale)) ?? DEFAULT_SITE_PAGES.about[locale];

  return (
    <EditableSitePage
      slug="about"
      locale={locale}
      canEdit={canEdit}
      title={page.title}
      body={sanitizeHtml(page.body)}
      titleClassName="text-4xl"
    />
  );
}
