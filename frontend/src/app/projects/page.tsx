import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Projekt — GoodTribes.org",
  description: "Projekt som byggs av GoodTribes.org",
};

const projects = [
  {
    name: "Kickfix",
    description:
      "Marknadsplats för svenska frilansuppdrag. Publicera och ta emot uppdrag med inbyggd kommunikation och betalningsuppföljning.",
    stack: ["React", "Express", "MongoDB"],
    url: "https://kickfix.se",
  },
  {
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
      <p className="text-lg text-gray-600 mb-10">
        Vi bygger verktyg och plattformar som gör nytta.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {projects.map((project) => (
          <div
            key={project.name}
            className="border border-gray-200 rounded-lg p-6 flex flex-col gap-4"
          >
            <div>
              <h2 className="text-2xl font-semibold mb-2">{project.name}</h2>
              <p className="text-gray-600">{project.description}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {project.stack.map((tech) => (
                <span
                  key={tech}
                  className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded"
                >
                  {tech}
                </span>
              ))}
            </div>
            <a
              href={project.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-auto text-sm font-medium text-gray-900 hover:text-gray-600 underline underline-offset-4"
            >
              Besök {project.name} →
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
