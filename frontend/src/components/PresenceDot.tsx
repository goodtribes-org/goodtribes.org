export default function PresenceDot({ online }: { online: boolean }) {
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${online ? "bg-seagrass" : "bg-dark-slate/20"}`}
      aria-hidden="true"
    />
  );
}
