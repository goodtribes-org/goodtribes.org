import Link from "next/link";
import Image from "next/image";

const DUMMY_TEXT =
  "Detta är projekttexten som vi leker med test. Kollar om det skulle fungera med denna text. Vore snyggt om detta kunde fungera med denna text.";

const SELECTED_PROJECTS = [
  { slug: "kickfix",       name: "Kicklix",          author: "Niklas Gunnas", location: "Sweden", description: DUMMY_TEXT, image: "https://picsum.photos/seed/kickfix/800/600",  likes: 86, members: 17, tasks: 367, raised: 11300, stage: 3 },
  { slug: "asylguiden-se", name: "Asylguiden.se",    author: "Niklas Gunnas", location: "Sweden", description: DUMMY_TEXT, image: "https://picsum.photos/seed/asylguiden/800/600", likes: 27, members: 17, tasks: 367, raised: 11300, stage: 3 },
  { slug: "squeakpoint",   name: "SqueakPoint",      author: "Niklas Gunnas", location: "Sweden", description: DUMMY_TEXT, image: "https://picsum.photos/seed/squeak/800/600",    likes: 40, members: 17, tasks: 367, raised: 11300, stage: 3 },
  { slug: "shampoo-serum", name: "Shampoo Serum",    author: "Niklas Gunnas", location: "Sweden", description: DUMMY_TEXT, image: "https://picsum.photos/seed/shampoo/800/600",   likes: 27, members: 17, tasks: 367, raised: 11300, stage: 3 },
];

const POPULAR_PROJECTS = [
  { slug: "urbanart",      name: "UrbanArt",          author: "Niklas Gunnas", location: "Sweden", description: DUMMY_TEXT, image: "https://picsum.photos/seed/urbanart/800/600", likes: 52, members: 17, tasks: 367, raised: 11300, stage: 3 },
  { slug: "friz",          name: "Friz",               author: "Niklas Gunnas", location: "Sweden", description: DUMMY_TEXT, image: "https://picsum.photos/seed/friz/800/600",     likes: 85, members: 17, tasks: 367, raised: 11300, stage: 3 },
  { slug: "voices",        name: "The Voices Project", author: "Niklas Gunnas", location: "Sweden", description: DUMMY_TEXT, image: "https://picsum.photos/seed/voices/800/600",   likes: 30, members: 17, tasks: 367, raised: 11300, stage: 3 },
  { slug: "portrait-studio", name: "Portrait Studio", author: "Niklas Gunnas", location: "Sweden", description: DUMMY_TEXT, image: "https://picsum.photos/seed/portrait/800/600", likes: 23, members: 17, tasks: 367, raised: 11300, stage: 3 },
];

const NEW_PROJECTS = [
  { slug: "robo-zero",     name: "RoboZero",           author: "Niklas Gunnas", location: "Sweden", description: DUMMY_TEXT, image: "https://picsum.photos/seed/robozero/800/600", likes: 60,  members: 17, tasks: 367, raised: 11300, stage: 3 },
  { slug: "beyonde-zero",  name: "Beyonde Zero",        author: "Niklas Gunnas", location: "Sweden", description: DUMMY_TEXT, image: "https://picsum.photos/seed/beyonde/800/600",  likes: 63,  members: 17, tasks: 367, raised: 11300, stage: 3 },
  { slug: "kaffekultur",   name: "Kaffekultur",          author: "Niklas Gunnas", location: "Sweden", description: DUMMY_TEXT, image: "https://picsum.photos/seed/kaffe/800/600",    likes: 81,  members: 17, tasks: 367, raised: 11300, stage: 3 },
  { slug: "kevify",        name: "Kevify",               author: "Niklas Gunnas", location: "Sweden", description: DUMMY_TEXT, image: "https://picsum.photos/seed/kevify/800/600",   likes: 104, members: 17, tasks: 367, raised: 11300, stage: 3 },
];

const FEATURE_CARDS = [
  {
    image: "/img/gemenskap.png",
    title: "Want a change?",
    description: "Do you want to see a change and to be a part of making a better world?",
  },
  {
    image: "/img/spetskompentens.png",
    title: "Do you have a dream?",
    description: "Do you have an idea or dream that will make the world a better place?",
  },
  {
    image: "/img/jobbar_ihop.png",
    title: "Want to be a winner?",
    description: "GoodTribes foundations overall goal is to make you and everybody else in the world a winner.",
  },
];

function ProjectCard({ project }: { project: typeof SELECTED_PROJECTS[number] }) {
  return (
    <Link
      href={`/projects/${project.slug}`}
      className="rounded-lg overflow-hidden border border-muted-teal/40 hover:shadow-md transition-shadow bg-white flex flex-col"
    >
      <div className="relative aspect-[4/3] w-full">
        <Image
          src={project.image}
          alt={project.name}
          fill
          className="object-cover"
          sizes="(max-width: 640px) 50vw, 25vw"
        />
        <span className="absolute top-2 left-2 bg-white/90 rounded px-1.5 py-0.5 text-xs font-semibold text-dark-slate flex items-center gap-1">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 text-coral" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
          </svg>
          {project.likes}
        </span>
      </div>
      <div className="p-3 flex flex-col flex-1">
        <p className="font-bold text-dark-slate text-sm leading-tight mb-0.5">{project.name}</p>
        <p className="text-xs text-dark-slate/50 mb-2">
          by <span className="text-coral">{project.author}</span>, {project.location}
        </p>
        <p className="text-xs text-dark-slate/70 leading-snug mb-3 line-clamp-3 flex-1">{project.description}</p>
        <div className="grid grid-cols-4 divide-x divide-muted-teal/30 text-center border-t border-muted-teal/20 pt-2 mt-auto">
          <div className="px-1">
            <p className="text-xs font-semibold text-dark-slate">{project.members}</p>
            <p className="text-[10px] text-dark-slate/50 leading-tight">Members</p>
          </div>
          <div className="px-1">
            <p className="text-xs font-semibold text-dark-slate">{project.tasks}</p>
            <p className="text-[10px] text-dark-slate/50 leading-tight">Följ</p>
          </div>
          <div className="px-1">
            <p className="text-xs font-semibold text-dark-slate">{project.raised.toLocaleString("sv-SE")}</p>
            <p className="text-[10px] text-dark-slate/50 leading-tight">Insamlat</p>
          </div>
          <div className="px-1">
            <p className="text-xs font-semibold text-dark-slate">{project.stage}</p>
            <p className="text-[10px] text-dark-slate/50 leading-tight">Steps</p>
          </div>
        </div>
      </div>
    </Link>
  );
}

function ProjectSection({ title, projects }: { title: string; projects: typeof SELECTED_PROJECTS }) {
  return (
    <section>
      <h2 className="text-sm font-semibold text-dark-slate/60 uppercase tracking-wide mb-4">{title}</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {projects.map((p) => (
          <ProjectCard key={p.slug} project={p} />
        ))}
      </div>
    </section>
  );
}

export default function HomePage() {
  return (
    <div className="space-y-12">

      {/* Page headline */}
      <h1 className="text-4xl font-bold text-center text-dark-slate/30">How Goodtribes work</h1>

      {/* What is GoodTribes? */}
      <section className="border border-muted-teal/40 rounded-lg overflow-hidden">
        <div className="grid md:grid-cols-2">
          <div className="relative min-h-56 md:min-h-0">
            <Image
              src="/img/hero.png"
              alt="GoodTribes community illustration"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
              priority
            />
          </div>
          <div className="p-8 flex flex-col justify-center">
            <h2 className="text-xl font-bold text-coral mb-4">What is GoodTribes?</h2>
            <p className="text-sm text-dark-slate/70 mb-3">
              The GoodTribes is a nonprofit foundation that give people the tools they need to make the world a better place.
            </p>
            <p className="text-sm text-dark-slate/70 mb-3">
              GoodTribes help people to make their ideas and dreams about a better world come true. It is simple, every big
              change starts with a small step. At Goodtribes, no effort is too small and no dream is too big. It is when we
              share and help each other that the magic begins.
            </p>
            <p className="text-sm text-dark-slate/70 mb-4">
              The world is not changed by a single person, it changes when we work together to make good ideas come true.
            </p>
            <Link href="/about" className="text-coral text-sm font-medium hover:underline">
              Read more
            </Link>
          </div>
        </div>
      </section>

      {/* Feature cards */}
      <section className="grid md:grid-cols-3 gap-6">
        {FEATURE_CARDS.map((card) => (
          <div key={card.title}>
            <div className="relative aspect-[4/3] w-full rounded-lg overflow-hidden mb-4">
              <Image
                src={card.image}
                alt={card.title}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 33vw"
              />
            </div>
            <h3 className="font-bold text-coral mb-2">{card.title}</h3>
            <p className="text-sm text-dark-slate/70 mb-2">{card.description}</p>
            <Link href="/about" className="text-coral text-sm font-medium hover:underline">
              Read more
            </Link>
          </div>
        ))}
      </section>

      <ProjectSection title="Selected projects" projects={SELECTED_PROJECTS} />
      <ProjectSection title="Popular projects" projects={POPULAR_PROJECTS} />
      <ProjectSection title="New projects" projects={NEW_PROJECTS} />

    </div>
  );
}
