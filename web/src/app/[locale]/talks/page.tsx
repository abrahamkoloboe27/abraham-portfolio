import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PlaylistCard, TalkCard } from "@/components/cards";
import { Pagination } from "@/components/Pagination";
import { Card, EmptyState, Section, SectionHeading } from "@/components/ui/primitives";
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
    title: t("talks.title"),
    description: t("talks.subtitle"),
    alternates: { canonical: `/${locale}/talks` },
  };
}

export default async function TalksPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string; type?: string; organization?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const { page: rawPage, type, organization } = await searchParams;
  const t = translator(locale);

  const page = Math.max(1, Number(rawPage ?? 1) || 1);
  const [talks, playlists, bundle] = await Promise.all([
    api.talks({ page, per_page: 12, type, organization }),
    api.playlists().catch(() => []),
    api.siteBundle(),
  ]);

  return (
    <>
      <Section>
        <SectionHeading title={t("talks.title")} subtitle={t("talks.subtitle")} />

        {bundle.organizations.length ? (
          <ul className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {bundle.organizations.map((org) => (
              <li key={org.id}>
                <Card className="h-full p-5">
                  <p className="font-semibold">
                    {org.url ? (
                      <a
                        href={org.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="link-underline"
                      >
                        {org.name}
                      </a>
                    ) : (
                      org.name
                    )}
                  </p>
                  <p className="mt-1 text-sm text-[var(--color-accent)]">
                    {pick(org, "role", locale)}
                  </p>
                  <p className="mt-2 text-sm text-[var(--color-ink-muted)]">
                    {pick(org, "description", locale)}
                  </p>
                </Card>
              </li>
            ))}
          </ul>
        ) : null}

        {talks.items.length ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {talks.items.map((talk) => (
              <TalkCard key={talk.id} talk={talk} locale={locale} />
            ))}
          </div>
        ) : (
          <EmptyState message={t("common.noResults")} />
        )}

        <Pagination
          page={talks.page}
          pages={talks.pages}
          basePath={`/${locale}/talks`}
          params={{ type, organization }}
          locale={locale}
        />
      </Section>

      {playlists.length ? (
        <Section muted>
          <SectionHeading title={t("talks.playlists")} />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {playlists.map((playlist) => (
              <PlaylistCard key={playlist.id} playlist={playlist} locale={locale} />
            ))}
          </div>
        </Section>
      ) : null}
    </>
  );
}
