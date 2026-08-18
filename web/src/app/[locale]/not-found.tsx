import Link from "next/link";

import { Container } from "@/components/ui/primitives";

export default function NotFound() {
  return (
    <Container>
      <div className="flex min-h-[60vh] flex-col items-center justify-center py-24 text-center">
        <p className="text-6xl font-bold text-[var(--color-accent)]">404</p>
        <h1 className="mt-4 text-2xl font-semibold">Page introuvable · Page not found</h1>
        <p className="mt-3 max-w-md text-[var(--color-ink-muted)]">
          Cette page n&apos;existe pas ou a été déplacée.
          <br />
          This page does not exist or has been moved.
        </p>
        <div className="mt-8 flex gap-3">
          <Link
            href="/fr"
            className="rounded-lg bg-[var(--color-accent)] px-4 py-2.5 text-sm font-medium text-white"
          >
            Accueil
          </Link>
          <Link
            href="/en"
            className="rounded-lg border border-[var(--color-border-strong)] px-4 py-2.5 text-sm font-medium"
          >
            Home
          </Link>
        </div>
      </div>
    </Container>
  );
}
