import ReactMarkdown from "react-markdown";
import { getStrapiPage } from "@/lib/strapi";

export default async function AboutPage() {
  const strapiPage = await getStrapiPage("about");

  if (strapiPage) {
    return (
      <div className="max-w-2xl">
        <h1 className="text-4xl font-bold mb-6">{strapiPage.title}</h1>
        <article className="prose max-w-none text-dark-slate leading-relaxed
          prose-headings:text-dark-slate
          prose-a:text-seagrass prose-a:no-underline hover:prose-a:underline
          prose-strong:text-dark-slate prose-img:rounded-xl">
          <ReactMarkdown>{strapiPage.body}</ReactMarkdown>
        </article>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-4xl font-bold mb-6">Who are GoodTribes?</h1>

      <p className="text-lg text-dark-slate mb-6">
        GoodTribes is run as a foundation with one overarching goal: to make the
        world better for those of us living in it today, and for the generations
        after us. We do not believe in waiting for someone else to solve the
        problems. We believe in organising from the bottom up.
      </p>

      <p className="text-dark-slate mb-8">
        When a person has a good idea, it often takes a whole team to carry it
        out. By lowering the barriers and making it easy to collaborate, we
        create a people's movement of practical sustainability. No one is left
        alone with their vision.
      </p>

      <h2 className="text-2xl font-semibold mb-4">What we do</h2>
      <ul className="space-y-3 text-dark-slate mb-8">
        <li className="flex gap-3">
          <span className="text-muted-teal mt-1">—</span>
          <span>
            <strong>Projects</strong> — We build and run open digital tools for
            non-profit organisations and socially engaged initiatives.
          </span>
        </li>
        <li className="flex gap-3">
          <span className="text-muted-teal mt-1">—</span>
          <span>
            <strong>Community</strong> — We bring together people with the will
            and skills to contribute to something bigger than themselves.
          </span>
        </li>
        <li className="flex gap-3">
          <span className="text-muted-teal mt-1">—</span>
          <span>
            <strong>Transparency</strong> — Everything we do is open. Code,
            decisions and direction are shared openly.
          </span>
        </li>
      </ul>

      <h2 className="text-2xl font-semibold mb-3">Contact</h2>
      <p className="text-dark-slate">
        Want to know more or become part of GoodTribes?{" "}
        <a
          href="mailto:hej@goodtribes.org"
          className="text-coral underline underline-offset-4 hover:text-seagrass"
        >
          hej@goodtribes.org
        </a>
      </p>
    </div>
  );
}
