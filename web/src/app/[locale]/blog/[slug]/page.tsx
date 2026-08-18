import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, Clock, ExternalLink } from "lucide-react";

import { PostCard } from "@/components/cards";
import { PageTracker } from "@/components/PageTracker";
import { Markdown } from "@/components/ui/Markdown";
import { Badge, ButtonLink, Container, Section, SectionHeading } from "@/components/ui/primitives";
import { api } from "@/lib/api";
import { isLocale, pick, translator } from "@/lib/i18n";
import { absoluteUrl, formatDate } from "@/lib/utils";

export const revalidate = 300;

export async function generateStaticParams() {
  try {
    const result = await api.posts({ per_page: 50 });
    return result.items.map((post) => ({ slug: post.slug }));
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
  const post = await api.post(slug);
  if (!post) return {};

  const title = pick(post, "seo_title", locale) || pick(post, "title", locale);
  const description = pick(post, "seo_description", locale) || pick(post, "excerpt", locale);

  return {
    title,
    description,
    alternates: { canonical: post.canonical_url ?? `/${locale}/blog/${slug}` },
    openGraph: {
      type: "article",
      title,
      description,
      publishedTime: post.published_at ?? undefined,
      modifiedTime: post.updated_at,
      url: absoluteUrl(`/${locale}/blog/${slug}`),
      images: post.cover_url ? [{ url: post.cover_url }] : undefined,
    },
  };
}

export default async function PostPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const post = await api.post(slug);
  if (!post) notFound();

  const t = translator(locale);
  const related = await api
    .posts({ per_page: 4, tag: post.tags[0]?.slug })
    .then((page) => page.items.filter((item) => item.slug !== post.slug).slice(0, 3))
    .catch(() => []);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: pick(post, "title", locale),
    description: pick(post, "excerpt", locale),
    datePublished: post.published_at ?? undefined,
    dateModified: post.updated_at,
    url: absoluteUrl(`/${locale}/blog/${slug}`),
    image: post.cover_url ?? undefined,
    keywords: post.tags.map((tag) => pick(tag, "name", locale)).join(", "),
    author: { "@type": "Person", name: "Sèdjro Abraham Zacharie KOLOBOE" },
    inLanguage: locale,
  };

  return (
    <>
      <PageTracker locale={locale} entityType="post" entityId={post.slug} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <article className="py-12 sm:py-16">
        <Container>
          <div className="mx-auto max-w-3xl">
            <Link
              href={`/${locale}/blog`}
              className="inline-flex items-center gap-2 text-sm text-[var(--color-ink-muted)] transition-colors hover:text-[var(--color-ink)]"
            >
              <ArrowLeft className="size-4" aria-hidden />
              {t("common.backTo")} {t("blog.title").toLowerCase()}
            </Link>

            <header className="mt-6">
              <h1 className="text-3xl font-bold sm:text-4xl">{pick(post, "title", locale)}</h1>

              <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-[var(--color-ink-subtle)]">
                {post.published_at ? (
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarDays className="size-4" aria-hidden />
                    <time dateTime={post.published_at}>
                      {formatDate(post.published_at, locale)}
                    </time>
                  </span>
                ) : null}
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="size-4" aria-hidden />
                  {post.reading_minutes} {t("common.minRead")}
                </span>
              </div>

              {post.tags.length ? (
                <ul className="mt-4 flex flex-wrap gap-1.5">
                  {post.tags.map((tag) => (
                    <li key={tag.id}>
                      <Link href={`/${locale}/blog?tag=${tag.slug}`}>
                        <Badge variant="accent">{pick(tag, "name", locale)}</Badge>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}

              {pick(post, "excerpt", locale) ? (
                <p className="mt-6 border-l-2 border-[var(--color-accent)] pl-4 text-lg text-[var(--color-ink-muted)]">
                  {pick(post, "excerpt", locale)}
                </p>
              ) : null}
            </header>

            <div className="mt-10">
              <Markdown content={pick(post, "content", locale)} />
            </div>

            {post.external_url ? (
              <div className="mt-10">
                <ButtonLink href={post.external_url} external variant="secondary">
                  {t("blog.readOriginal")}
                  <ExternalLink className="size-4" aria-hidden />
                </ButtonLink>
              </div>
            ) : null}
          </div>
        </Container>
      </article>

      {related.length ? (
        <Section muted>
          <SectionHeading title={t("blog.related")} />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((item) => (
              <PostCard key={item.id} post={item} locale={locale} />
            ))}
          </div>
        </Section>
      ) : null}
    </>
  );
}
