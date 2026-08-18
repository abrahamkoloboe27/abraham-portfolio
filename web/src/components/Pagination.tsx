import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { translator } from "@/lib/i18n";
import type { Locale } from "@/lib/types";
import { cn } from "@/lib/utils";

export function Pagination({
  page,
  pages,
  basePath,
  params = {},
  locale,
}: {
  page: number;
  pages: number;
  basePath: string;
  params?: Record<string, string | undefined>;
  locale: Locale;
}) {
  if (pages <= 1) return null;
  const t = translator(locale);

  function href(target: number) {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value) search.set(key, value);
    }
    if (target > 1) search.set("page", String(target));
    const qs = search.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  }

  const linkClass =
    "inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-3 py-2 " +
    "text-sm transition-colors hover:bg-[var(--color-surface-muted)]";

  return (
    <nav aria-label="Pagination" className="mt-10 flex items-center justify-between gap-4">
      {page > 1 ? (
        <Link href={href(page - 1)} className={linkClass} rel="prev">
          <ChevronLeft className="size-4" aria-hidden />
          {t("common.previous")}
        </Link>
      ) : (
        <span className={cn(linkClass, "pointer-events-none opacity-40")}>
          <ChevronLeft className="size-4" aria-hidden />
          {t("common.previous")}
        </span>
      )}

      <span className="text-sm text-[var(--color-ink-subtle)]">
        {t("common.page")} {page} {t("common.of")} {pages}
      </span>

      {page < pages ? (
        <Link href={href(page + 1)} className={linkClass} rel="next">
          {t("common.next")}
          <ChevronRight className="size-4" aria-hidden />
        </Link>
      ) : (
        <span className={cn(linkClass, "pointer-events-none opacity-40")}>
          {t("common.next")}
          <ChevronRight className="size-4" aria-hidden />
        </span>
      )}
    </nav>
  );
}
