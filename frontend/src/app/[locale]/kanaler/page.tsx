import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { getProjectChannelGroups, getOrgChannelGroups } from "@/lib/rooms";
import { KanalerDirectory } from "./KanalerDirectory";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Kanaler — GoodTribes.org",
  description: "Alla dina projekt- och organisationskanaler, samlade på ett ställe.",
};

export default async function KanalerPage() {
  const session = await auth();
  const userId = session?.user?.id;

  const [projectGroups, orgGroups] = userId
    ? await Promise.all([getProjectChannelGroups(userId), getOrgChannelGroups(userId)])
    : [[], []];

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Kanaler</h1>
        <p className="text-lg text-dark-slate/70">Alla dina projekt- och organisationskanaler, samlade på ett ställe.</p>
      </div>

      {!userId ? (
        <p className="text-dark-slate/50 text-center py-12">
          <Link href="/login" className="text-coral hover:underline font-medium">
            Logga in
          </Link>{" "}
          för att se dina kanaler.
        </p>
      ) : (
        <KanalerDirectory projectGroups={projectGroups} orgGroups={orgGroups} />
      )}
    </div>
  );
}
