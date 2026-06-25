"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
      <p className="text-8xl font-bold text-muted-teal/30 mb-4">500</p>
      <h1 className="text-2xl font-bold text-dark-slate mb-2">Something went wrong</h1>
      <p className="text-dark-slate/60 mb-8 max-w-sm">
        An unexpected error occurred. You can try again, or head back to safety.
      </p>
      <div className="flex gap-4">
        <button
          onClick={reset}
          className="px-5 py-2 bg-coral text-white text-sm font-medium rounded hover:bg-watermelon transition-colors"
        >
          Try again
        </button>
        <Link
          href="/"
          className="px-5 py-2 border border-muted-teal text-dark-slate/70 text-sm font-medium rounded hover:text-dark-slate hover:border-dark-slate/40 transition-colors"
        >
          Go home
        </Link>
      </div>
      {error.digest && (
        <p className="mt-6 text-xs text-dark-slate/30">Error ID: {error.digest}</p>
      )}
    </div>
  );
}
