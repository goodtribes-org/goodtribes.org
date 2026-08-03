import type { Metadata } from "next";
import { auth } from "@/auth";
import { isSiteAdmin } from "@/lib/authz";
import { getSitePage } from "@/lib/sitePages";
import { sanitizeHtml } from "@/lib/sanitizeHtml";
import { DEFAULT_SITE_PAGES } from "@/lib/defaultSitePages";
import EditableSitePage from "@/components/EditableSitePage";

export const metadata: Metadata = { title: "Privacy Policy — GoodTribes.org" };

export default async function PrivacyPage() {
  const session = await auth();
  const canEdit = session?.user?.id ? await isSiteAdmin(session.user.id) : false;

  const page = (await getSitePage("privacy")) ?? DEFAULT_SITE_PAGES.privacy;

  return (
    <EditableSitePage
      slug="privacy"
      canEdit={canEdit}
      title={page.title}
      body={sanitizeHtml(page.body)}
    />
  );
}
