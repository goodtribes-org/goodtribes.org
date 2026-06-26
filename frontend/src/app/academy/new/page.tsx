import type { Metadata } from "next";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { createGuide } from "../actions";

export const metadata: Metadata = {
  title: "Ny guide — GoodTribes Academy",
};

const CATEGORIES = ["Projektledning", "Crowdfunding", "Community", "Teknik", "Impact"];

export default async function NewGuidePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-dark-slate mb-1">Skapa ny guide</h1>
        <p className="text-sm text-dark-slate/60">
          Guiden sparas som utkast och publiceras efter granskning.
        </p>
      </div>

      <form action={createGuide} className="flex flex-col gap-5">
        {/* Title */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="title" className="text-sm font-medium text-dark-slate">
            Titel <span className="text-coral">*</span>
          </label>
          <input
            id="title"
            name="title"
            type="text"
            required
            placeholder="T.ex. Kom igång med crowdfunding"
            className="border border-muted-teal/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-seagrass/40"
          />
        </div>

        {/* Category */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="category" className="text-sm font-medium text-dark-slate">
            Kategori <span className="text-coral">*</span>
          </label>
          <select
            id="category"
            name="category"
            required
            className="border border-muted-teal/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-seagrass/40 bg-white"
          >
            <option value="">Välj kategori</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* Difficulty */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="difficulty" className="text-sm font-medium text-dark-slate">
            Svårighetsgrad
          </label>
          <select
            id="difficulty"
            name="difficulty"
            defaultValue="beginner"
            className="border border-muted-teal/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-seagrass/40 bg-white"
          >
            <option value="beginner">Nybörjare</option>
            <option value="avancerad">Avancerad</option>
          </select>
        </div>

        {/* Read time */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="readTimeMinutes" className="text-sm font-medium text-dark-slate">
            Lästid (minuter)
          </label>
          <input
            id="readTimeMinutes"
            name="readTimeMinutes"
            type="number"
            min={1}
            max={120}
            defaultValue={5}
            className="border border-muted-teal/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-seagrass/40 w-32"
          />
        </div>

        {/* Body markdown */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="bodyMarkdown" className="text-sm font-medium text-dark-slate">
            Innehåll (Markdown) <span className="text-coral">*</span>
          </label>
          <textarea
            id="bodyMarkdown"
            name="bodyMarkdown"
            required
            rows={16}
            placeholder="Skriv guidens innehåll här..."
            className="border border-muted-teal/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-seagrass/40 resize-y font-mono"
          />
          <p className="text-xs text-dark-slate/40">Markdown stöds.</p>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            className="px-5 py-2.5 bg-coral text-white font-medium rounded-lg hover:bg-watermelon transition-colors"
          >
            Skicka in guide
          </button>
          <a
            href="/academy"
            className="text-sm text-dark-slate/50 hover:text-dark-slate transition-colors"
          >
            Avbryt
          </a>
        </div>
      </form>
    </div>
  );
}
