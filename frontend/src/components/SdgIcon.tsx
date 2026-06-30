import Image from "next/image";
import { sdgIconPath, SDG_LABELS_EN } from "@/lib/sdg";

export function SdgIcon({ n, size = 28 }: { n: number; size?: number }) {
  const label = SDG_LABELS_EN[n] ?? `SDG ${n}`;
  return (
    <Image
      src={sdgIconPath(n)}
      alt={`SDG ${n}: ${label}`}
      width={size}
      height={size}
      className="flex-shrink-0"
      unoptimized
    />
  );
}
