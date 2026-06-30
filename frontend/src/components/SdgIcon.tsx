import Image from "next/image";
import { sdgIconPath, sdgIconPathDark, SDG_LABELS_EN } from "@/lib/sdg";

export function SdgIcon({ n, size = 28, dark = false }: { n: number; size?: number; dark?: boolean }) {
  const label = SDG_LABELS_EN[n] ?? `SDG ${n}`;
  return (
    <Image
      src={dark ? sdgIconPathDark(n) : sdgIconPath(n)}
      alt={`SDG ${n}: ${label}`}
      width={size}
      height={size}
      className="flex-shrink-0"
      unoptimized
    />
  );
}
