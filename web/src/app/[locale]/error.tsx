"use client";

import { useEffect } from "react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Page render failed", error);
  }, [error]);

  return (
    <div className="container-page flex min-h-[60vh] flex-col items-center justify-center py-24 text-center">
      <h1 className="text-2xl font-semibold">Une erreur est survenue</h1>
      <p className="mt-3 max-w-md text-[var(--color-ink-muted)]">
        Le contenu n&apos;a pas pu être chargé. Vérifiez que l&apos;API est joignable, puis
        réessayez.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-8 rounded-lg bg-[var(--color-accent)] px-4 py-2.5 text-sm font-medium text-white"
      >
        Réessayer
      </button>
    </div>
  );
}
