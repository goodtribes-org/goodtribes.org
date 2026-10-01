import Link from "next/link";

// Small building blocks shared by the Mitt GoodTribes tabs.

export function Panel({ title, link, children }: { title: string; link?: { href: string; label: string }; children: React.ReactNode }) {
  return (
    <section className="flex min-w-0 flex-col gap-3 rounded-[24px] border border-[#E4E4DF] bg-white p-5 sm:p-6">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="m-0 text-lg font-bold text-dark-slate">{title}</h2>
        {link && (
          <Link href={link.href} className="shrink-0 text-xs font-semibold text-[#C2410C] hover:underline">{link.label}</Link>
        )}
      </div>
      {children}
    </section>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="m-0 text-sm text-dark-slate/60">{children}</p>;
}

export function Row({ href, title, meta, dot = "#2F7D3A" }: { href: string; title: string; meta?: React.ReactNode; dot?: string }) {
  return (
    <li>
      <Link href={href} className="group flex items-start gap-2.5 rounded-xl px-2 py-1.5 hover:bg-[#F6F6F3]">
        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: dot }} aria-hidden="true" />
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-dark-slate group-hover:underline">{title}</span>
          {meta && <span className="block text-xs text-dark-slate/60">{meta}</span>}
        </span>
      </Link>
    </li>
  );
}
