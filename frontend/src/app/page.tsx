import Link from "next/link";

const projects = [
  {
    name: "Kickfix",
    description: "Marknadsplats för svenska frilansuppdrag.",
    url: "https://kickfix.se",
  },
  {
    name: "Asylguiden.se",
    description: "Informationssajt för asylsökande och nyanlända i Sverige.",
    url: "https://asylguiden.se",
  },
];

export default function HomePage() {
  return (
    <div>
      <h1 className="text-4xl font-bold mb-4">Welcome to GoodTribes.org</h1>
      <p className="text-lg text-gray-600">
        Building good things together. More coming soon.
      </p>

      <section className="mt-12">
        <h2 className="text-2xl font-semibold mb-6">Våra projekt</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {projects.map((project) => (
            <a
              key={project.name}
              href={project.url}
              target="_blank"
              rel="noopener noreferrer"
              className="border border-gray-200 rounded-lg p-5 hover:border-gray-400 transition-colors"
            >
              <h3 className="font-semibold mb-1">{project.name}</h3>
              <p className="text-sm text-gray-600">{project.description}</p>
            </a>
          ))}
        </div>
        <Link
          href="/projects"
          className="text-sm font-medium text-gray-900 hover:text-gray-600 underline underline-offset-4"
        >
          Se alla projekt →
        </Link>
      </section>
    </div>
  );
}
