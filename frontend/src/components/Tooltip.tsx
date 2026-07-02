"use client";

import { useState } from "react";
import { createPortal } from "react-dom";

interface Props {
  lines: string[];
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export default function Tooltip({ lines, children, className, style }: Props) {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  if (!lines.length) return <>{children}</>;

  return (
    <>
      <div
        className={className}
        style={style}
        onMouseEnter={(e) => { setVisible(true); setPos({ x: e.clientX, y: e.clientY }); }}
        onMouseMove={(e) => setPos({ x: e.clientX, y: e.clientY })}
        onMouseLeave={() => setVisible(false)}
      >
        {children}
      </div>
      {visible && createPortal(
        <div
          className="fixed z-[9999] pointer-events-none bg-dark-slate text-white text-xs rounded-lg px-3 py-2 shadow-xl max-w-[220px] space-y-0.5"
          style={{
            left: pos.x + 14,
            top: pos.y - 10,
          }}
        >
          {lines.map((line, i) => (
            <p key={i} className={i === 0 ? "font-semibold" : "text-white/70"}>{line}</p>
          ))}
        </div>,
        document.body,
      )}
    </>
  );
}
