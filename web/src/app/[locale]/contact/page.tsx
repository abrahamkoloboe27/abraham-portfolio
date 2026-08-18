import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CalendarClock, Mail, MapPin } from "lucide-react";

import { ContactForm } from "@/components/ContactForm";
import { SocialIcon } from "@/components/layout/SocialIcon";
import { Card, Section, SectionHeading } from "@/components/ui/primitives";
import { api } from "@/lib/api";
import { isLocale, pick, translator } from "@/lib/i18n";

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = translator(locale);
  return {
    title: t("nav.contact"),
    description: t("contact.title"),
    alternates: { canonical: `/${locale}/contact` },
  };
}

export default async function ContactPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = translator(locale);
  const bundle = await api.siteBundleSafe();
  if (!bundle) return null;
  const { settings, socials } = bundle;

  return (
    <Section>
      <SectionHeading
        title={t("contact.title")}
        subtitle={pick(settings, "availability", locale)}
      />

      <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr]">
        <Card className="p-6 sm:p-8">
          <ContactForm locale={locale} />
        </Card>

        <div className="flex flex-col gap-4">
          <Card className="flex flex-col gap-4 p-6">
            {settings.email ? (
              <div>
                <p className="text-xs font-semibold tracking-[0.14em] text-[var(--color-ink-subtle)] uppercase">
                  {t("contact.directEmail")}
                </p>
                <a
                  href={`mailto:${settings.email}`}
                  className="link-underline mt-1.5 inline-flex items-center gap-2 font-medium"
                >
                  <Mail className="size-4" aria-hidden />
                  {settings.email}
                </a>
              </div>
            ) : null}

            {settings.location ? (
              <div className="flex items-center gap-2 text-sm text-[var(--color-ink-muted)]">
                <MapPin className="size-4 shrink-0" aria-hidden />
                {settings.location}
                {settings.timezone ? (
                  <span className="text-[var(--color-ink-subtle)]">({settings.timezone})</span>
                ) : null}
              </div>
            ) : null}

            {settings.calendar_url ? (
              <a
                href={settings.calendar_url}
                target="_blank"
                rel="noopener noreferrer"
                className="link-underline inline-flex items-center gap-2 text-sm"
              >
                <CalendarClock className="size-4 shrink-0" aria-hidden />
                {settings.calendar_url.replace(/^https?:\/\//, "")}
              </a>
            ) : null}
          </Card>

          <Card className="p-6">
            <p className="mb-3 text-xs font-semibold tracking-[0.14em] text-[var(--color-ink-subtle)] uppercase">
              {t("footer.elsewhere")}
            </p>
            <ul className="flex flex-col gap-3">
              {socials
                .filter((social) => social.show_in_footer)
                .map((social) => (
                  <li key={social.id}>
                    <a
                      href={social.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 text-sm text-[var(--color-ink-muted)] transition-colors hover:text-[var(--color-ink)]"
                    >
                      <SocialIcon
                        name={social.icon ?? social.platform}
                        className="size-4 shrink-0"
                      />
                      <span className="font-medium">{social.label}</span>
                      {social.handle ? (
                        <span className="truncate text-[var(--color-ink-subtle)]">
                          {social.handle}
                        </span>
                      ) : null}
                    </a>
                  </li>
                ))}
            </ul>
          </Card>
        </div>
      </div>
    </Section>
  );
}
