import { auth } from "@/auth";
import { isSiteAdmin } from "@/lib/authz";
import { getSitePage } from "@/lib/sitePages";
import { sanitizeHtml } from "@/lib/sanitizeHtml";
import { DEFAULT_SITE_PAGES } from "@/lib/defaultSitePages";
import EditableSitePage from "@/components/EditableSitePage";

export default async function AboutPage() {
  const session = await auth();
  const canEdit = session?.user?.id ? await isSiteAdmin(session.user.id) : false;

  const page = (await getSitePage("about")) ?? DEFAULT_SITE_PAGES.about;

  return (
    <EditableSitePage
      slug="about"
      canEdit={canEdit}
      title={page.title}
      body={sanitizeHtml(page.body)}
      titleClassName="text-4xl"
    />
  );
}
