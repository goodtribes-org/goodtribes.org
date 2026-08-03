import type { Metadata } from "next";
import { auth } from "@/auth";
import { isSiteAdmin } from "@/lib/authz";
import { getSitePage } from "@/lib/sitePages";
import { sanitizeHtml } from "@/lib/sanitizeHtml";
import { DEFAULT_SITE_PAGES } from "@/lib/defaultSitePages";
import EditableSitePage from "@/components/EditableSitePage";

export const metadata: Metadata = { title: "Terms of Service — GoodTribes.org" };

export default async function TermsPage() {
  const session = await auth();
  const canEdit = session?.user?.id ? await isSiteAdmin(session.user.id) : false;

  const page = (await getSitePage("terms")) ?? DEFAULT_SITE_PAGES.terms;

  return (
    <EditableSitePage
      slug="terms"
      canEdit={canEdit}
      title={page.title}
      body={sanitizeHtml(page.body)}
    />
  );
}
