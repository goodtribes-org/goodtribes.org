import Link from "next/link";

// For members only, at the top of the project page (#275): the 1–3 things
// waiting for them. Visitors see the same page without this block.
export type NextStepItem = { key: string; label: string; href: string; cta: string };

export default function MemberNextSteps({ heading, items }: { heading: string; items: NextStepItem[] }) {
  if (items.length === 0) return null;
  return (
    <section className="rounded-xl border-2 border-coral/30 bg-coral/5 p-5">
      <h2 className="text-base font-semibold text-dark-slate">{heading}</h2>
      <ul className="mt-3 space-y-2">
        {items.map((item) => (
          <li key={item.key} className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2.5">
            <span className="text-sm text-dark-slate">{item.label}</span>
            <Link href={item.href} className="shrink-0 text-sm font-semibold text-coral hover:text-watermelon">
              {item.cta} →
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
