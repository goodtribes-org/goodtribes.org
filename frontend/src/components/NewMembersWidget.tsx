import Link from "next/link";
import { toProxyUrl } from "@/lib/storageUrl";

type NewMember = {
  id: string;
  name: string;
  image: string | null;
};

export default function NewMembersWidget({ members }: { members: NewMember[] }) {
  return (
    <section className="border border-muted-teal/30 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-dark-slate">Nya medlemmar</h2>
        <Link href="/members" className="text-xs text-seagrass hover:underline">
          Alla medlemmar →
        </Link>
      </div>

      {members.length === 0 ? (
        <p className="text-dark-slate/40 text-xs text-center py-4">Inga medlemmar ännu.</p>
      ) : (
        <div className="flex flex-wrap gap-3">
          {members.map((member) => {
            const initials = member.name
              .split(" ")
              .map((w) => w[0])
              .join("")
              .slice(0, 2)
              .toUpperCase();

            return (
              <Link key={member.id} href={`/members/${member.id}`} className="flex flex-col items-center gap-1 w-14 group">
                <div className="w-10 h-10 rounded-full bg-dry-sage flex items-center justify-center text-xs font-semibold text-dark-slate overflow-hidden group-hover:ring-2 group-hover:ring-seagrass transition-all">
                  {member.image ? (
                    <img src={toProxyUrl(member.image)} alt={member.name} className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    initials
                  )}
                </div>
                <span className="text-[10px] text-dark-slate/60 truncate w-full text-center">
                  {member.name.split(" ")[0]}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
