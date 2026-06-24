import Link from "next/link";

export default function Pagination({
  page,
  total,
  perPage,
  searchParams,
  basePath,
}: {
  page: number;
  total: number;
  perPage: number;
  searchParams: Record<string, string | undefined>;
  basePath: string;
}) {
  const totalPages = Math.ceil(total / perPage);
  if (totalPages <= 1) return null;

  function href(p: number) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(searchParams)) {
      if (v && k !== "page") params.set(k, v);
    }
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return `${basePath}${qs ? "?" + qs : ""}`;
  }

  const pages: number[] = [];
  for (let i = 1; i <= totalPages; i++) pages.push(i);

  return (
    <div className="flex items-center justify-center gap-1 mt-8 pb-4">
      {page > 1 && (
        <Link
          href={href(page - 1)}
          className="px-3 py-1.5 text-sm rounded border border-muted-teal/40 text-dark-slate/60 hover:text-dark-slate hover:border-dark-slate/40 transition-colors"
        >
          ← Prev
        </Link>
      )}
      {pages.map((p) => (
        <Link
          key={p}
          href={href(p)}
          className={`px-3 py-1.5 text-sm rounded border transition-colors ${
            p === page
              ? "border-coral bg-coral text-white"
              : "border-muted-teal/40 text-dark-slate/60 hover:text-dark-slate hover:border-dark-slate/40"
          }`}
        >
          {p}
        </Link>
      ))}
      {page < totalPages && (
        <Link
          href={href(page + 1)}
          className="px-3 py-1.5 text-sm rounded border border-muted-teal/40 text-dark-slate/60 hover:text-dark-slate hover:border-dark-slate/40 transition-colors"
        >
          Next →
        </Link>
      )}
    </div>
  );
}
