"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";

import { locales } from "@/lib/i18n";
import type { Locale } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Remembered by the middleware so a returning visitor keeps their language. */
function persistLocale(locale: Locale) {
  document.cookie = `NEXT_LOCALE=${locale};path=/;max-age=31536000;samesite=lax`;
}

export function LocaleSwitcher({ current, label }: { current: Locale; label: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function switchTo(locale: Locale) {
    if (locale === current) return;
    // Swap the first path segment; everything after it is locale-independent.
    const rest = pathname.replace(new RegExp(`^/(${locales.join("|")})`), "");
    persistLocale(locale);
    startTransition(() => router.push(`/${locale}${rest}`));
  }

  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        "inline-flex items-center gap-0.5 rounded-lg border border-[var(--color-border)] p-0.5",
        pending && "opacity-60",
      )}
    >
      {locales.map((locale) => (
        <button
          key={locale}
          type="button"
          onClick={() => switchTo(locale)}
          aria-current={locale === current ? "true" : undefined}
          className={cn(
            "rounded-md px-2 py-1 text-xs font-semibold uppercase transition-colors",
            locale === current
              ? "bg-[var(--color-accent-soft)] text-[var(--color-accent-ink)]"
              : "text-[var(--color-ink-subtle)] hover:text-[var(--color-ink)]",
          )}
        >
          {locale}
        </button>
      ))}
    </div>
  );
}
