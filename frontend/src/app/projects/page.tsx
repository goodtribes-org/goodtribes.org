import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Projekt — GoodTribes.org",
  description: "Projekt som byggs av GoodTribes.org",
};

const projects = [
  {
    slug: "kickfix",
    name: "Kickfix",
    description:
      "Marknadsplats för svenska frilansuppdrag. Publicera och ta emot uppdrag med inbyggd kommunikation och betalningsuppföljning.",
    stack: ["React", "Express", "MongoDB"],
    url: "https://kickfix.se",
  },
  {
    slug: "asylguiden-se",
    name: "Asylguiden.se",
    description:
      "Informationssajt för asylsökande och nyanlända i Sverige. Flerspråkigt innehåll med automatiska datainsamlare från myndigheter.",
    stack: ["Next.js", "Strapi", "PostgreSQL"],
    url: "https://asylguiden.se",
  },
];

export default function ProjectsPage() {
  return (
    <div>
      <h1 className="text-4xl font-bold mb-4">Våra projekt</h1>
      <p className="text-lg text-dark-slate/70 mb-10">
        Vi bygger verktyg och plattformar som gör nytta.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {projects.map((project) => (
          <Link
            key={project.slug}
            href={`/projects/${project.slug}`}
            className="border border-muted-teal rounded-lg p-6 flex flex-col gap-4 hover:border-seagrass transition-colors"
          >
            <div>
              <h2 className="text-2xl font-semibold mb-2">{project.name}</h2>
              <p className="text-dark-slate/70">{project.description}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {project.stack.map((tech) => (
                <span
                  key={tech}
                  className="text-xs bg-dry-sage text-dark-slate px-2 py-1 rounded"
                >
                  {tech}
                </span>
              ))}
            </div>
            <span className="mt-auto text-sm font-medium text-coral hover:text-seagrass underline underline-offset-4">
              Läs mer om {project.name} →
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
