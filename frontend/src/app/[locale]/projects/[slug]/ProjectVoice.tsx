// "Varför jag gör det här" and "Det här har vi lärt oss" on the project page
// (#275): the founder's own words from Drömguiden, and what the interviews
// taught them (the latest interview synthesis). Renders nothing when neither
// exists, so a project never shows empty headings.
export default function ProjectVoice({
  why,
  founderName,
  learnings,
  accent,
  labels,
}: {
  why: string | null;
  founderName: string | null;
  learnings: string[];
  accent: string;
  labels: { why: string; whyBy: string; learned: string; learnedSource: string };
}) {
  if (!why && learnings.length === 0) return null;
  return (
    <div className={`grid gap-4 ${why && learnings.length ? "sm:grid-cols-2" : ""}`}>
      {why && (
        <section className="bg-white border border-muted-teal/30 rounded-xl p-5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-coral">{labels.why}</h2>
          <blockquote className="mt-2 border-l-4 pl-3 italic text-dark-slate leading-relaxed" style={{ borderColor: accent }}>
            ”{why}”
          </blockquote>
          {founderName && <p className="mt-1 pl-4 text-xs text-dark-slate/60">{labels.whyBy}</p>}
        </section>
      )}
      {learnings.length > 0 && (
        <section className="bg-white border border-muted-teal/30 rounded-xl p-5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-coral">{labels.learned}</h2>
          <ul className="mt-2 list-disc pl-4 space-y-1 text-sm text-dark-slate">
            {learnings.map((l) => <li key={l}>{l}</li>)}
          </ul>
          <p className="mt-2 text-xs text-dark-slate/50">{labels.learnedSource}</p>
        </section>
      )}
    </div>
  );
}
