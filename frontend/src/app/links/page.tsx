import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Länkar — GoodTribes.org",
  description: "Intressanta länkar samlade av GoodTribes.org",
};

const links: { title: string; url: string; description: string }[] = [];

export default function LinksPage() {
  return (
    <div>
      <h1 className="text-4xl font-bold mb-4">Länkar</h1>
      <p className="text-lg text-gray-600 mb-10">
        Intressanta sidor och resurser som vi vill dela med oss av.
      </p>
      {links.length === 0 ? (
        <p className="text-gray-400 italic">Inga länkar ännu — kom tillbaka snart.</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {links.map((link) => (
            <li key={link.url} className="border border-gray-200 rounded-lg p-5">
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xl font-semibold text-gray-900 hover:text-gray-600 underline underline-offset-4"
              >
                {link.title} →
              </a>
              <p className="text-gray-600 mt-1">{link.description}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
