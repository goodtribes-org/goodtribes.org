import { ReactNode } from "react";

/**
 * CSS-only hover tooltip. Wraps its children and reveals `lines` above them on
 * hover (no client-side JS — uses Tailwind group-hover, consistent with the
 * rest of the project card UI). When `lines` is empty the children render
 * unchanged with no tooltip.
 */
export default function Tooltip({
  lines,
  children,
}: {
  lines: string[];
  children: ReactNode;
}) {
  const visible = lines.filter((line) => line && line.trim().length > 0);

  if (visible.length === 0) return <>{children}</>;

  return (
    <div className="relative group inline-flex">
      {children}
      <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-dark-slate px-2.5 py-1.5 text-center shadow-lg group-hover:block">
        {visible.map((line, i) => (
          <span
            key={i}
            className={
              i === 0
                ? "block text-[11px] font-semibold leading-tight text-white"
                : "block text-[10px] leading-tight text-white/70"
            }
          >
            {line}
          </span>
        ))}
        <span className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-dark-slate" />
      </div>
    </div>
  );
}
