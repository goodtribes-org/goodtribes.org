import { auth } from "@/auth";
import { notFound } from "next/navigation";
import { isSiteAdmin } from "@/lib/authz";
import { getAdminQueueCounts } from "@/lib/siteAdminCounts";
import AdminNav from "./AdminNav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id || !(await isSiteAdmin(session.user.id))) {
    notFound();
  }

  const counts = await getAdminQueueCounts();

  // Full-bleed like the project pages' layout, so the menu runs from the
  // header's line down to the footer's, the same rail as there.
  return (
    <div className="flex flex-1 flex-col lg:-mb-12 lg:-mt-8 lg:flex-row" style={{ marginLeft: "calc(50% - 50vw)", width: "100vw" }}>
      <AdminNav counts={counts} />
      {/* The pages keep their own max-width; this only places them next to
          the menu. */}
      <div className="min-w-0 flex-1 px-6 py-6 lg:pb-12 lg:pt-8 [&>*]:!mx-0 [&>*]:!px-0 [&>*]:!pt-0">{children}</div>
    </div>
  );
}
