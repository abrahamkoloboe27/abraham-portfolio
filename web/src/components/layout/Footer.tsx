import Link from "next/link";
import { MapPin, Mail } from "lucide-react";

import { SocialIcon } from "@/components/layout/SocialIcon";
import { Container } from "@/components/ui/primitives";
import { pick, translator } from "@/lib/i18n";
import type { Locale, NavItem, SiteSettings, SocialLink } from "@/lib/types";

export function Footer({
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
  const footerSocials = socials.filter((s) => s.show_in_footer);
  const year = new Date().getFullYear();
  const note = pick(settings, "footer_note", locale);

  return (
    <footer className="mt-auto border-t border-[var(--color-border)] bg-[var(--color-surface-muted)]">
      <Container className="py-12">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <p className="text-lg font-semibold">{settings.full_name}</p>
            <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
              {pick(settings, "job_title", locale)}
            </p>
            {note ? (
              <p className="mt-4 max-w-sm text-sm text-[var(--color-ink-subtle)]">{note}</p>
            ) : null}
            <div className="mt-5 flex flex-col gap-2 text-sm text-[var(--color-ink-muted)]">
              {settings.location ? (
                <span className="inline-flex items-center gap-2">
                  <MapPin className="size-4 shrink-0" aria-hidden />
                  {settings.location}
                </span>
              ) : null}
              {settings.email ? (
                <a
                  href={`mailto:${settings.email}`}
                  className="link-underline inline-flex w-fit items-center gap-2"
                >
                  <Mail className="size-4 shrink-0" aria-hidden />
                  {settings.email}
                </a>
              ) : null}
            </div>
          </div>

          <nav aria-label={t("footer.navigation")}>
            <p className="mb-3 text-xs font-semibold tracking-[0.14em] uppercase">
              {t("footer.navigation")}
            </p>
            <ul className="flex flex-col gap-2 text-sm">
              {nav.map((item) => (
                <li key={item.id}>
                  <Link
                    href={item.is_external ? item.href : `/${locale}${item.href}`}
                    {...(item.is_external
                      ? { target: "_blank", rel: "noopener noreferrer" }
                      : {})}
                    className="text-[var(--color-ink-muted)] transition-colors hover:text-[var(--color-ink)]"
                  >
                    {pick(item, "label", locale)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <p className="mb-3 text-xs font-semibold tracking-[0.14em] uppercase">
              {t("footer.elsewhere")}
            </p>
            <ul className="flex flex-col gap-2 text-sm">
              {footerSocials.map((social) => (
                <li key={social.id}>
                  <a
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-[var(--color-ink-muted)] transition-colors hover:text-[var(--color-ink)]"
                  >
                    <SocialIcon
                      name={social.icon ?? social.platform}
                      className="size-4 shrink-0"
                    />
                    {social.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-[var(--color-border)] pt-6 text-xs text-[var(--color-ink-subtle)] sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {settings.full_name}. {t("footer.rights")}.
          </p>
          <p>{t("footer.builtWith")}</p>
        </div>
      </Container>
    </footer>
  );
}
