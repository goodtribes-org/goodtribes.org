"use client";

import { useEffect, useRef, useState } from "react";

// "Om projektet", shortened (#275): the first lines with a fade, and
// "Läs hela berättelsen" to open the rest. A long description used to take a
// whole screen before anything else on the page showed. A short one is shown
// as is, without the fade or the button.
export default function CollapsibleStory({ children, more, less }: { children: React.ReactNode; more: string; less: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [overflows, setOverflows] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (el) setOverflows(el.scrollHeight > el.clientHeight + 4);
  }, []);

  const clamped = !open && overflows;
  return (
    <div>
      <div ref={ref} className={open ? "" : "relative max-h-56 overflow-hidden"}>
        {children}
        {clamped && <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white to-transparent" />}
      </div>
      {overflows && (
        <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="mt-3 text-sm font-semibold text-seagrass hover:underline">
          {open ? less : `${more} ↓`}
        </button>
      )}
    </div>
  );
}
