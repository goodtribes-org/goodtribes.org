import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Organisationer — GoodTribes.org",
  description: "Organisationer som är anslutna till GoodTribes.org",
};

const DUMMY_TEXT =
  "Detta är organisationstexten som vi leker med test. Kollar om det skulle fungera med denna text. Vore snyggt om detta kunde fungera";

const orgs = [
  {
    slug: "vinnova",
    name: "VINNOVA",
    author: "Niklas Gunnas",
    location: "Sweden",
    description: DUMMY_TEXT,
    image: "https://picsum.photos/seed/vinnova/800/600",
    likes: 74,
    members: 32,
    projects: 8,
    tasks: 142,
    founded: 2001,
  },
  {
    slug: "formas",
    name: "FORMAS",
    author: "Niklas Gunnas",
    location: "Sweden",
    description: DUMMY_TEXT,
    image: "https://picsum.photos/seed/formas/800/600",
    likes: 41,
    members: 19,
    projects: 5,
    tasks: 87,
    founded: 2001,
  },
  {
    slug: "roda-korset",
    name: "Röda Korset",
    author: "Niklas Gunnas",
    location: "Sweden",
    description: DUMMY_TEXT,
    image: "https://picsum.photos/seed/rodakorset/800/600",
    likes: 112,
    members: 48,
    projects: 14,
    tasks: 310,
    founded: 1865,
  },
  {
    slug: "naturskyddsforeningen",
    name: "Naturskyddsföreningen",
    author: "Niklas Gunnas",
    location: "Sweden",
    description: DUMMY_TEXT,
    image: "https://picsum.photos/seed/natur/800/600",
    likes: 89,
    members: 27,
    projects: 9,
    tasks: 204,
    founded: 1909,
  },
  {
    slug: "tillvaxtverket",
    name: "Tillväxtverket",
    author: "Niklas Gunnas",
    location: "Sweden",
    description: DUMMY_TEXT,
    image: "https://picsum.photos/seed/tillvaxt/800/600",
    likes: 33,
    members: 14,
    projects: 4,
    tasks: 68,
    founded: 2009,
  },
  {
    slug: "migrationsverket",
    name: "Migrationsverket",
    author: "Niklas Gunnas",
    location: "Sweden",
    description: DUMMY_TEXT,
    image: "https://picsum.photos/seed/migra/800/600",
    likes: 57,
    members: 22,
    projects: 6,
    tasks: 119,
    founded: 1969,
  },
  {
    slug: "svid",
    name: "SVID",
    author: "Niklas Gunnas",
    location: "Sweden",
    description: DUMMY_TEXT,
    image: "https://picsum.photos/seed/svid/800/600",
    likes: 28,
    members: 11,
    projects: 3,
    tasks: 44,
    founded: 1989,
  },
  {
    slug: "ungdomsstyrelsen",
    name: "Ungdomsstyrelsen",
    author: "Niklas Gunnas",
    location: "Sweden",
    description: DUMMY_TEXT,
    image: "https://picsum.photos/seed/ungdom/800/600",
    likes: 65,
    members: 24,
    projects: 7,
    tasks: 155,
    founded: 1994,
  },
  {
    slug: "arvsfonden",
    name: "Arvsfonden",
    author: "Niklas Gunnas",
    location: "Sweden",
    description: DUMMY_TEXT,
    image: "https://picsum.photos/seed/arvs/800/600",
    likes: 49,
    members: 18,
    projects: 5,
    tasks: 92,
    founded: 1928,
  },
  {
    slug: "skl",
    name: "SKR",
    author: "Niklas Gunnas",
    location: "Sweden",
    description: DUMMY_TEXT,
    image: "https://picsum.photos/seed/skr/800/600",
    likes: 38,
    members: 16,
    projects: 4,
    tasks: 73,
    founded: 1908,
  },
  {
    slug: "digg",
    name: "DIGG",
    author: "Niklas Gunnas",
    location: "Sweden",
    description: DUMMY_TEXT,
    image: "https://picsum.photos/seed/digg/800/600",
    likes: 81,
    members: 29,
    projects: 10,
    tasks: 237,
    founded: 2018,
  },
  {
    slug: "iis",
    name: "Internetstiftelsen",
    author: "Niklas Gunnas",
    location: "Sweden",
    description: DUMMY_TEXT,
    image: "https://picsum.photos/seed/iis/800/600",
    likes: 96,
    members: 35,
    projects: 12,
    tasks: 278,
    founded: 1997,
  },
];

export default function OrgListPage() {
  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-dark-slate">
          Organisationer{" "}
          <span className="text-dark-slate/40 font-normal">
            ({orgs.length} results)
          </span>
        </h1>
        <Link
          href="/org/new"
          className="flex-shrink-0 bg-coral text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-watermelon transition-colors"
        >
          + Ny organisation
        </Link>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        <button className="flex items-center gap-2 border border-muted-teal rounded px-3 py-1.5 text-sm text-dark-slate hover:border-seagrass transition-colors">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z"
            />
          </svg>
          Filters (1)
        </button>

        <button className="flex items-center gap-1.5 border border-muted-teal rounded px-3 py-1.5 text-sm text-dark-slate hover:border-seagrass transition-colors">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 6h16M4 12h16M4 18h7"
            />
          </svg>
          Sort: Default
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-3 h-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <span className="flex items-center gap-1.5 bg-dry-sage/40 border border-dry-sage rounded-full px-3 py-1 text-sm text-dark-slate">
          Category: Nonprofit
          <button className="text-dark-slate/50 hover:text-dark-slate leading-none">
            ×
          </button>
        </span>

        <div className="ml-auto flex items-center gap-1">
          <button className="p-1.5 rounded border border-muted-teal text-dark-slate/60 hover:border-seagrass hover:text-dark-slate transition-colors">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-4 h-4"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </button>
          <button className="p-1.5 rounded border border-muted-teal text-dark-slate/60 hover:border-seagrass hover:text-dark-slate transition-colors">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 6h16M4 10h16M4 14h16M4 18h16"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-10">
        {orgs.map((org) => (
          <Link
            key={org.slug}
            href={`/org/${org.slug}`}
            className="rounded-lg overflow-hidden border border-muted-teal/40 hover:shadow-md transition-shadow bg-white flex flex-col"
          >
            {/* Image */}
            <div className="relative aspect-[4/3] w-full">
              <Image
                src={org.image}
                alt={org.name}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              />
              <span className="absolute top-2 left-2 bg-white/90 rounded px-1.5 py-0.5 text-xs font-semibold text-dark-slate flex items-center gap-1">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-3 h-3 text-coral"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
                    clipRule="evenodd"
                  />
                </svg>
                {org.likes}
              </span>
            </div>

            {/* Content */}
            <div className="p-3 flex flex-col flex-1">
              <p className="font-bold text-dark-slate text-sm leading-tight mb-0.5">
                {org.name}
              </p>
              <p className="text-xs text-dark-slate/50 mb-2">
                by{" "}
                <span className="text-coral hover:underline">
                  {org.author}
                </span>
                , {org.location}
              </p>
              <p className="text-xs text-dark-slate/70 leading-snug mb-3 line-clamp-3 flex-1">
                {org.description}
              </p>

              {/* Stats */}
              <div className="grid grid-cols-4 divide-x divide-muted-teal/30 text-center border-t border-muted-teal/20 pt-2 mt-auto">
                <div className="px-1">
                  <p className="text-xs font-semibold text-dark-slate">
                    {org.members}
                  </p>
                  <p className="text-[10px] text-dark-slate/50 leading-tight">
                    Members
                  </p>
                </div>
                <div className="px-1">
                  <p className="text-xs font-semibold text-dark-slate">
                    {org.projects}
                  </p>
                  <p className="text-[10px] text-dark-slate/50 leading-tight">
                    Projects
                  </p>
                </div>
                <div className="px-1">
                  <p className="text-xs font-semibold text-dark-slate">
                    {org.tasks}
                  </p>
                  <p className="text-[10px] text-dark-slate/50 leading-tight">
                    Tasks
                  </p>
                </div>
                <div className="px-1">
                  <p className="text-xs font-semibold text-dark-slate">
                    {org.founded}
                  </p>
                  <p className="text-[10px] text-dark-slate/50 leading-tight">
                    Founded
                  </p>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Load more */}
      <div className="flex justify-center">
        <button className="px-10 py-2.5 border border-dark-slate text-dark-slate text-sm font-medium uppercase tracking-widest hover:bg-dark-slate hover:text-white transition-colors rounded-sm">
          Load more
        </button>
      </div>
    </div>
  );
}
