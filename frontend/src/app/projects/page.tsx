import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Projekt — GoodTribes.org",
  description: "Projekt som byggs av GoodTribes.org",
};

const DUMMY_TEXT =
  "Detta är projekttexten som vi leker med test. Kollar om det skulle fungera med denna text. Vore snyggt om detta kunde fungera";

const projects = [
  {
    slug: "kickfix",
    name: "Kickfix",
    author: "Niklas Gunnas",
    location: "Sweden",
    description: DUMMY_TEXT,
    image: "https://picsum.photos/seed/kickfix/800/600",
    likes: 86,
    members: 17,
    tasks: 367,
    raised: 11300,
    stage: 3,
  },
  {
    slug: "asylguiden-se",
    name: "Asylguiden.se",
    author: "Niklas Gunnas",
    location: "Sweden",
    description: DUMMY_TEXT,
    image: "https://picsum.photos/seed/asylguiden/800/600",
    likes: 27,
    members: 17,
    tasks: 367,
    raised: 11300,
    stage: 3,
  },
  {
    slug: "squeakpoint",
    name: "SqueakPoint",
    author: "Niklas Gunnas",
    location: "Sweden",
    description: DUMMY_TEXT,
    image: "https://picsum.photos/seed/squeak/800/600",
    likes: 40,
    members: 17,
    tasks: 367,
    raised: 11300,
    stage: 3,
  },
  {
    slug: "shampoo-serum",
    name: "Shampoo Serum",
    author: "Niklas Gunnas",
    location: "Sweden",
    description: DUMMY_TEXT,
    image: "https://picsum.photos/seed/shampoo/800/600",
    likes: 27,
    members: 17,
    tasks: 367,
    raised: 11300,
    stage: 3,
  },
  {
    slug: "urbanart",
    name: "UrbanArt",
    author: "Niklas Gunnas",
    location: "Sweden",
    description: DUMMY_TEXT,
    image: "https://picsum.photos/seed/urbanart/800/600",
    likes: 52,
    members: 17,
    tasks: 367,
    raised: 11300,
    stage: 3,
  },
  {
    slug: "friz",
    name: "Friz",
    author: "Niklas Gunnas",
    location: "Sweden",
    description: DUMMY_TEXT,
    image: "https://picsum.photos/seed/friz/800/600",
    likes: 85,
    members: 17,
    tasks: 367,
    raised: 11300,
    stage: 3,
  },
  {
    slug: "voices",
    name: "The Voices Project",
    author: "Niklas Gunnas",
    location: "Sweden",
    description: DUMMY_TEXT,
    image: "https://picsum.photos/seed/voices/800/600",
    likes: 30,
    members: 17,
    tasks: 367,
    raised: 11300,
    stage: 3,
  },
  {
    slug: "portrait-studio",
    name: "Portrait Studio",
    author: "Niklas Gunnas",
    location: "Sweden",
    description: DUMMY_TEXT,
    image: "https://picsum.photos/seed/portrait/800/600",
    likes: 23,
    members: 17,
    tasks: 367,
    raised: 11300,
    stage: 3,
  },
  {
    slug: "robo-zero",
    name: "RoboZero",
    author: "Niklas Gunnas",
    location: "Sweden",
    description: DUMMY_TEXT,
    image: "https://picsum.photos/seed/robozero/800/600",
    likes: 60,
    members: 17,
    tasks: 367,
    raised: 11300,
    stage: 3,
  },
  {
    slug: "beyonde-zero",
    name: "Beyonde Zero",
    author: "Niklas Gunnas",
    location: "Sweden",
    description: DUMMY_TEXT,
    image: "https://picsum.photos/seed/beyonde/800/600",
    likes: 63,
    members: 17,
    tasks: 367,
    raised: 11300,
    stage: 3,
  },
  {
    slug: "kaffekultur",
    name: "Kaffekultur",
    author: "Niklas Gunnas",
    location: "Sweden",
    description: DUMMY_TEXT,
    image: "https://picsum.photos/seed/kaffe/800/600",
    likes: 81,
    members: 17,
    tasks: 367,
    raised: 11300,
    stage: 3,
  },
  {
    slug: "kevify",
    name: "Kevify",
    author: "Niklas Gunnas",
    location: "Sweden",
    description: DUMMY_TEXT,
    image: "https://picsum.photos/seed/kevify/800/600",
    likes: 104,
    members: 17,
    tasks: 367,
    raised: 11300,
    stage: 3,
  },
];

export default function ProjectsPage() {
  return (
    <div>
      {/* Header */}
      <h1 className="text-2xl font-bold text-dark-slate mb-4">
        Projects{" "}
        <span className="text-dark-slate/40 font-normal">
          ({projects.length} results)
        </span>
      </h1>

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
          Category: General
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
        {projects.map((project) => (
          <Link
            key={project.slug}
            href={`/projects/${project.slug}`}
            className="rounded-lg overflow-hidden border border-muted-teal/40 hover:shadow-md transition-shadow bg-white flex flex-col"
          >
            {/* Image */}
            <div className="relative aspect-[4/3] w-full">
              <Image
                src={project.image}
                alt={project.name}
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
                {project.likes}
              </span>
            </div>

            {/* Content */}
            <div className="p-3 flex flex-col flex-1">
              <p className="font-bold text-dark-slate text-sm leading-tight mb-0.5">
                {project.name}
              </p>
              <p className="text-xs text-dark-slate/50 mb-2">
                by{" "}
                <span className="text-coral hover:underline">
                  {project.author}
                </span>
                , {project.location}
              </p>
              <p className="text-xs text-dark-slate/70 leading-snug mb-3 line-clamp-3 flex-1">
                {project.description}
              </p>

              {/* Stats */}
              <div className="grid grid-cols-4 divide-x divide-muted-teal/30 text-center border-t border-muted-teal/20 pt-2 mt-auto">
                <div className="px-1">
                  <p className="text-xs font-semibold text-dark-slate">
                    {project.members}
                  </p>
                  <p className="text-[10px] text-dark-slate/50 leading-tight">
                    Members
                  </p>
                </div>
                <div className="px-1">
                  <p className="text-xs font-semibold text-dark-slate">
                    {project.tasks}
                  </p>
                  <p className="text-[10px] text-dark-slate/50 leading-tight">
                    Tasks
                  </p>
                </div>
                <div className="px-1">
                  <p className="text-xs font-semibold text-dark-slate">
                    {project.raised.toLocaleString("sv-SE")}
                  </p>
                  <p className="text-[10px] text-dark-slate/50 leading-tight">
                    Raised
                  </p>
                </div>
                <div className="px-1">
                  <p className="text-xs font-semibold text-dark-slate">
                    {project.stage}
                  </p>
                  <p className="text-[10px] text-dark-slate/50 leading-tight">
                    Stage
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
