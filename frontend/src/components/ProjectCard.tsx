import Link from "next/link";
import Image from "next/image";
import { SdgIcon } from "@/components/SdgIcon";

export type ProjectCardData = {
  slug: string;
  title: string;
  summary: string | null;
  description: string | null;
  status: string;
  imageUrl: string | null;
  sdgGoals: number[];
  owner: { name: string | null };
  members: { id: string }[];
  _count: { kanbanCards: number };
};

export default function ProjectCard({ project }: { project: ProjectCardData }) {
  return (
    <Link
      href={`/projects/${project.slug}`}
      className="rounded-lg overflow-hidden border border-muted-teal/40 hover:shadow-md transition-shadow bg-white flex flex-col"
    >
      <div className="relative aspect-[4/3] w-full">
        {project.imageUrl ? (
          <Image
            src={project.imageUrl}
            alt={project.title}
            fill
            unoptimized
            className="object-cover"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-dry-sage to-muted-teal/40 flex items-center justify-center p-4">
            <p className="text-xs font-semibold text-dark-slate/70 text-center leading-tight line-clamp-3">{project.title}</p>
          </div>
        )}
        <span className="absolute top-2 left-2 bg-white/90 rounded px-1.5 py-0.5 text-xs font-semibold text-dark-slate capitalize">
          {project.status}
        </span>
      </div>
      <div className="p-3 flex flex-col flex-1">
        <p className="font-bold text-dark-slate text-sm leading-tight mb-0.5">{project.title}</p>
        <p className="text-xs text-dark-slate/50 mb-2">
          by <span className="text-coral">{project.owner.name ?? "Unknown"}</span>
        </p>
        <p className="text-xs text-dark-slate/70 leading-snug mb-2 line-clamp-3 flex-1">
          {project.summary ?? project.description ?? "Ingen beskrivning ännu."}
        </p>
        {project.sdgGoals.length > 0 && (
          <div className="flex flex-wrap items-center gap-1 mb-2">
            <span className="text-[11px] font-bold text-dark-slate/40 mr-0.5">Agenda 2030:</span>
            {project.sdgGoals.slice(0, 7).map((n) => (
              <SdgIcon key={n} n={n} size={20} />
            ))}
          </div>
        )}
        <div className="grid grid-cols-3 divide-x divide-muted-teal/30 text-center border-t border-muted-teal/20 pt-2 mt-auto">
          <div className="px-1">
            <p className="text-xs font-semibold text-dark-slate">{project.members.length}</p>
            <p className="text-[10px] text-dark-slate/50 leading-tight">Members</p>
          </div>
          <div className="px-1">
            <p className="text-xs font-semibold text-dark-slate">
              {project._count.kanbanCards}
            </p>
            <p className="text-[10px] text-dark-slate/50 leading-tight">Tasks</p>
          </div>
          <div className="px-1">
            <p className="text-xs font-semibold text-dark-slate capitalize">{project.status}</p>
            <p className="text-[10px] text-dark-slate/50 leading-tight">Stage</p>
          </div>
        </div>
      </div>
    </Link>
  );
}
