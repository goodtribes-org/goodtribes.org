import { toProxyUrl } from "@/lib/storageUrl";

// A member's picture, or their initial when they have none.
export default function Avatar({ name, image, size = 32 }: { name: string | null; image: string | null; size?: number }) {
  return image ? (
    <img src={toProxyUrl(image)} alt="" width={size} height={size} className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />
  ) : (
    <span
      aria-hidden
      className="flex shrink-0 items-center justify-center rounded-full bg-dry-sage/40 text-xs font-semibold text-dark-slate/60"
      style={{ width: size, height: size }}
    >
      {(name ?? "?").trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}
