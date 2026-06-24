import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
      <p className="text-8xl font-bold text-muted-teal/30 mb-4">404</p>
      <h1 className="text-2xl font-bold text-dark-slate mb-2">Page not found</h1>
      <p className="text-dark-slate/60 mb-8 max-w-sm">
        This page doesn&apos;t exist or has been moved. Try exploring projects or ideas instead.
      </p>
      <div className="flex gap-4">
        <Link
          href="/projects"
          className="px-5 py-2 bg-coral text-white text-sm font-medium rounded hover:bg-watermelon transition-colors"
        >
          Browse projects
        </Link>
        <Link
          href="/ideas"
          className="px-5 py-2 border border-muted-teal text-dark-slate/70 text-sm font-medium rounded hover:text-dark-slate hover:border-dark-slate/40 transition-colors"
        >
          Explore ideas
        </Link>
      </div>
    </div>
  );
}
