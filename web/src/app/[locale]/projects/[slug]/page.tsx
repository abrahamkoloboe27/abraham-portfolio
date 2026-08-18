import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, Newspaper } from "lucide-react";

import { GithubIcon } from "@/components/layout/BrandIcons";

import { PageTracker } from "@/components/PageTracker";
import { Markdown } from "@/components/ui/Markdown";
import { Badge, ButtonLink, Card, Container } from "@/components/ui/primitives";
import { api } from "@/lib/api";
import { isLocale, pick, translator } from "@/lib/i18n";
import { absoluteUrl, formatDate, youtubeEmbed } from "@/lib/utils";

export const revalidate = 300;

export async function generateStaticParams() {
  try {
    const result = await api.projects({ per_page: 50 });
    return result.items.map((project) => ({ slug: project.slug }));
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
  const project = await api.project(slug);
  if (!project) return {};

  const title = pick(project, "seo_title", locale) || pick(project, "title", locale);
  const description = pick(project, "seo_description", locale) || pick(project, "summary", locale);

  return {
    title,
    description,
    alternates: { canonical: `/${locale}/projects/${slug}` },
    openGraph: {
      type: "article",
      title,
      description,
      url: absoluteUrl(`/${locale}/projects/${slug}`),
      images: project.cover_url ? [{ url: project.cover_url }] : undefined,
    },
  };
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const project = await api.project(slug);
  if (!project) notFound();

  const t = translator(locale);
  const embed = project.video_url ? youtubeEmbed(project.video_url) : null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: pick(project, "title", locale),
    description: pick(project, "summary", locale),
    url: absoluteUrl(`/${locale}/projects/${slug}`),
    keywords: project.tech.join(", "),
    dateCreated: project.started_at ?? undefined,
    author: { "@type": "Person", name: "Sèdjro Abraham Zacharie KOLOBOE" },
  };

  return (
    <>
      <PageTracker locale={locale} entityType="project" entityId={project.slug} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <article className="py-12 sm:py-16">
        <Container>
          <Link
            href={`/${locale}/projects`}
            className="inline-flex items-center gap-2 text-sm text-[var(--color-ink-muted)] transition-colors hover:text-[var(--color-ink)]"
          >
            <ArrowLeft className="size-4" aria-hidden />
            {t("common.backTo")} {t("projects.title").toLowerCase()}
          </Link>

          <header className="mt-6 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="accent">{project.category.replace(/-/g, " ")}</Badge>
              {project.tags.map((tag) => (
                <Badge key={tag.id} variant="outline">
                  {pick(tag, "name", locale)}
                </Badge>
              ))}
            </div>
            <h1 className="mt-4 text-3xl font-bold sm:text-4xl">
              {pick(project, "title", locale)}
            </h1>
            <p className="mt-4 text-lg text-[var(--color-ink-muted)]">
              {pick(project, "summary", locale)}
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              {project.repo_url ? (
                <ButtonLink href={project.repo_url} external variant="secondary">
                  <GithubIcon className="size-4" aria-hidden />
                  {t("projects.code")}
                </ButtonLink>
              ) : null}
              {project.demo_url ? (
                <ButtonLink href={project.demo_url} external>
                  <ExternalLink className="size-4" aria-hidden />
                  {t("projects.demo")}
                </ButtonLink>
              ) : null}
              {project.article_url ? (
                <ButtonLink href={project.article_url} external variant="ghost">
                  <Newspaper className="size-4" aria-hidden />
                  {t("projects.article")}
                </ButtonLink>
              ) : null}
              {project.links.map((link) => (
                <ButtonLink key={link.url} href={link.url} external variant="ghost">
                  {link.label}
                  <ExternalLink className="size-4" aria-hidden />
                </ButtonLink>
              ))}
            </div>
          </header>

          {project.metrics.length ? (
            <dl className="mt-10 grid gap-4 sm:grid-cols-3">
              {project.metrics.map((metric, index) => (
                <Card key={index} className="p-5">
                  <dd className="text-2xl font-bold text-[var(--color-accent)]">{metric.value}</dd>
                  <dt className="mt-1 text-sm text-[var(--color-ink-muted)]">
                    {locale === "fr" ? metric.label_fr : (metric.label_en ?? metric.label_fr)}
                  </dt>
                </Card>
              ))}
            </dl>
          ) : null}

          {embed ? (
            <div className="mt-10 aspect-video overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border)]">
              <iframe
                src={embed}
                title={pick(project, "title", locale)}
                allowFullScreen
                loading="lazy"
                className="size-full"
              />
            </div>
          ) : null}

          <div className="mt-12 grid gap-12 lg:grid-cols-[minmax(0,1fr)_18rem]">
            <div className="min-w-0">
              <Markdown content={pick(project, "content", locale)} />
            </div>

            <aside className="flex flex-col gap-6 lg:sticky lg:top-24 lg:self-start">
              {project.tech.length ? (
                <Card className="p-5">
                  <h2 className="mb-3 text-sm font-semibold">{t("projects.stack")}</h2>
                  <ul className="flex flex-wrap gap-1.5">
                    {project.tech.map((tech) => (
                      <li key={tech}>
                        <Badge variant="outline">{tech}</Badge>
                      </li>
                    ))}
                  </ul>
                </Card>
              ) : null}

              <Card className="flex flex-col gap-3 p-5 text-sm">
                {pick(project, "role", locale) ? (
                  <div>
                    <p className="text-[var(--color-ink-subtle)]">{t("projects.role")}</p>
                    <p className="font-medium">{pick(project, "role", locale)}</p>
                  </div>
                ) : null}
                {project.client ? (
                  <div>
                    <p className="text-[var(--color-ink-subtle)]">{t("projects.client")}</p>
                    <p className="font-medium">{project.client}</p>
                  </div>
                ) : null}
                {project.started_at ? (
                  <div>
                    <p className="text-[var(--color-ink-subtle)]">{t("projects.period")}</p>
                    <p className="font-medium">
                      {formatDate(project.started_at, locale, { year: "numeric" })}
                      {project.finished_at
                        ? ` — ${formatDate(project.finished_at, locale, { year: "numeric" })}`
                        : ""}
                    </p>
                  </div>
                ) : null}
              </Card>
            </aside>
          </div>
        </Container>
      </article>
    </>
  );
}
