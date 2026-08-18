"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";

import { LocaleSwitcher } from "@/components/layout/LocaleSwitcher";
import { SocialIcon } from "@/components/layout/SocialIcon";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { Container } from "@/components/ui/primitives";
import { pick, translator } from "@/lib/i18n";
import type { Locale, NavItem, SiteSettings, SocialLink } from "@/lib/types";
import { cn, initials } from "@/lib/utils";

export function Header({
  locale,
  nav,
  socials,
  settings,
}: {
  locale: Locale;
  nav: NavItem[];
  socials: SocialLink[];
  settings: SiteSettings;
}) {
  const t = translator(locale);
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [lastPath, setLastPath] = useState(pathname);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // A route change must always close the mobile drawer. Adjusting during render
  // (rather than in an effect) avoids a flash of the still-open menu.
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  const headerSocials = socials.filter((s) => s.show_in_header);

  function href(item: NavItem) {
    return item.is_external ? item.href : `/${locale}${item.href}`;
  }

  function isActive(item: NavItem) {
    if (item.is_external) return false;
    const target = `/${locale}${item.href}`;
    return item.href === "/" ? pathname === `/${locale}` : pathname.startsWith(target);
  }

  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b transition-colors",
        scrolled
          ? "border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface)_88%,transparent)] backdrop-blur-md"
          : "border-transparent bg-[var(--color-surface)]",
      )}
    >
      <Container className="flex h-16 items-center justify-between gap-4">
        <Link
          href={`/${locale}`}
          className="flex items-center gap-2.5 font-semibold tracking-tight"
        >
          <span
            aria-hidden
            className="grid size-8 place-items-center rounded-lg bg-[var(--color-accent)] text-xs font-bold text-white"
          >
            {initials(settings.full_name || settings.site_name)}
          </span>
          <span className="hidden sm:inline">{settings.site_name}</span>
        </Link>

        <nav aria-label="Navigation principale" className="hidden items-center gap-1 md:flex">
          {nav.map((item) => (
            <Link
              key={item.id}
              href={href(item)}
              {...(item.is_external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              className={cn(
                "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive(item)
                  ? "text-[var(--color-accent)]"
                  : "text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]",
              )}
            >
              {pick(item, "label", locale)}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-1 sm:flex">
            {headerSocials.map((social) => (
              <a
                key={social.id}
                href={social.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={social.label}
                className="rounded-md p-2 text-[var(--color-ink-subtle)] transition-colors hover:text-[var(--color-ink)]"
              >
                <SocialIcon name={social.icon ?? social.platform} className="size-4" />
              </a>
            ))}
          </div>
          <LocaleSwitcher current={locale} label={t("common.language")} />
          <ThemeToggle label={t("common.theme")} />
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? t("nav.close") : t("nav.menu")}
            className="rounded-md p-2 text-[var(--color-ink-muted)] md:hidden"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </Container>

      {open ? (
        <div id="mobile-nav" className="border-t border-[var(--color-border)] md:hidden">
          <Container className="flex flex-col py-3">
            {nav.map((item) => (
              <Link
                key={item.id}
                href={href(item)}
                {...(item.is_external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                className={cn(
                  "rounded-md px-2 py-3 text-sm font-medium",
                  isActive(item) ? "text-[var(--color-accent)]" : "text-[var(--color-ink-muted)]",
                )}
              >
                {pick(item, "label", locale)}
              </Link>
            ))}
          </Container>
        </div>
      ) : null}
    </header>
  );
}
