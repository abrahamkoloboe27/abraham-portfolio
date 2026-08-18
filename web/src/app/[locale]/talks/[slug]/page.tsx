import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  Github,
  Globe,
  MapPin,
  Presentation,
  Users,
  Video,
} from "lucide-react";

import { Markdown } from "@/components/ui/Markdown";
import { Badge, ButtonLink, Card, Container } from "@/components/ui/primitives";
import { api } from "@/lib/api";
import { isLocale, pick, translator } from "@/lib/i18n";
import { absoluteUrl, formatDate, youtubeEmbed } from "@/lib/utils";

export const revalidate = 300;

export async function generateStaticParams() {
  try {
    const result = await api.talks({ per_page: 50 });
    return result.items.map((talk) => ({ slug: talk.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const talk = await api.talk(slug);
  if (!talk) return {};

  const title = pick(talk, "title", locale);
  const description = pick(talk, "abstract", locale) || pick(talk, "description", locale);
  return {
    title,
    description,
    alternates: { canonical: `/${locale}/talks/${slug}` },
    openGraph: { type: "article", title, description },
  };
}

export default async function TalkPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const talk = await api.talk(slug);
  if (!talk) notFound();

  const t = translator(locale);
  const embed = talk.video_url ? youtubeEmbed(talk.video_url) : null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: pick(talk, "title", locale),
    description: pick(talk, "description", locale),
    startDate: talk.event_date ?? undefined,
    eventAttendanceMode: talk.is_online
      ? "https://schema.org/OnlineEventAttendanceMode"
      : "https://schema.org/OfflineEventAttendanceMode",
    location: talk.is_online
      ? { "@type": "VirtualLocation", url: talk.event_url ?? absoluteUrl(`/${locale}/talks/${slug}`) }
      : { "@type": "Place", name: talk.location ?? "Bénin" },
    performer: { "@type": "Person", name: "Sèdjro Abraham Zacharie KOLOBOE" },
    organizer: talk.organization ? { "@type": "Organization", name: talk.organization.name } : undefined,
  };

  return (
    <article className="py-12 sm:py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Container>
        <div className="mx-auto max-w-3xl">
          <Link
            href={`/${locale}/talks`}
            className="inline-flex items-center gap-2 text-sm text-[var(--color-ink-muted)] transition-colors hover:text-[var(--color-ink)]"
          >
            <ArrowLeft className="size-4" aria-hidden />
            {t("common.backTo")} {t("talks.title").toLowerCase()}
          </Link>

          <header className="mt-6">
            <div className="flex flex-wrap gap-2">
              <Badge variant="accent">
                {t(`talkType.${talk.type}` as Parameters<typeof t>[0])}
              </Badge>
              {talk.organization ? (
                <Badge variant="outline">{talk.organization.name}</Badge>
              ) : null}
              {talk.topics.map((topic) => (
                <Badge key={topic} variant="outline">
                  {topic}
                </Badge>
              ))}
            </div>

            <h1 className="mt-4 text-3xl font-bold sm:text-4xl">{pick(talk, "title", locale)}</h1>

            {pick(talk, "abstract", locale) ? (
              <p className="mt-4 text-lg text-[var(--color-ink-muted)]">
                {pick(talk, "abstract", locale)}
              </p>
            ) : null}

            <div className="mt-6 flex flex-wrap gap-3">
              {talk.slides_url ? (
                <ButtonLink href={talk.slides_url} external variant="secondary">
                  <Presentation className="size-4" aria-hidden />
                  {t("talks.slides")}
                </ButtonLink>
              ) : null}
              {talk.video_url ? (
                <ButtonLink href={talk.video_url} external>
                  <Video className="size-4" aria-hidden />
                  {t("talks.video")}
                </ButtonLink>
              ) : null}
              {talk.repo_url ? (
                <ButtonLink href={talk.repo_url} external variant="secondary">
                  <Github className="size-4" aria-hidden />
                  {t("talks.repo")}
                </ButtonLink>
              ) : null}
              {talk.event_url ? (
                <ButtonLink href={talk.event_url} external variant="ghost">
                  <Globe className="size-4" aria-hidden />
                  {t("talks.event")}
                </ButtonLink>
              ) : null}
            </div>
          </header>

          <Card className="mt-8 flex flex-wrap gap-x-8 gap-y-3 p-5 text-sm text-[var(--color-ink-muted)]">
            {talk.event_date ? (
              <span className="inline-flex items-center gap-2">
                <CalendarDays className="size-4" aria-hidden />
                {formatDate(talk.event_date, locale)}
              </span>
            ) : null}
            <span className="inline-flex items-center gap-2">
              <MapPin className="size-4" aria-hidden />
              {talk.is_online ? t("talks.online") : (talk.location ?? "—")}
            </span>
            {talk.audience_size ? (
              <span className="inline-flex items-center gap-2">
                <Users className="size-4" aria-hidden />
                {talk.audience_size} {t("talks.audience")}
              </span>
            ) : null}
          </Card>

          {embed ? (
            <div className="mt-8 aspect-video overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border)]">
              <iframe
                src={embed}
                title={pick(talk, "title", locale)}
                allowFullScreen
                loading="lazy"
                className="size-full"
              />
            </div>
          ) : null}

          <div className="mt-10">
            <Markdown content={pick(talk, "description", locale)} />
          </div>
        </div>
      </Container>
    </article>
  );
}
