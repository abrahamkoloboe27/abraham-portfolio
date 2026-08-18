import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PostCard } from "@/components/cards";
import { Pagination } from "@/components/Pagination";
import { EmptyState, Section, SectionHeading } from "@/components/ui/primitives";
import { api } from "@/lib/api";
import { isLocale, pick, translator } from "@/lib/i18n";
import { cn } from "@/lib/utils";

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
    title: t("blog.title"),
    description: t("blog.subtitle"),
    alternates: {
      canonical: `/${locale}/blog`,
      types: { "application/rss+xml": `/api/v1/rss.xml?locale=${locale}` },
    },
  };
}

export default async function BlogPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string; tag?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const { page: rawPage, tag } = await searchParams;
  const t = translator(locale);

  const page = Math.max(1, Number(rawPage ?? 1) || 1);
  const [result, tags] = await Promise.all([
    api.posts({ page, per_page: 9, tag }),
    api.tags().catch(() => []),
  ]);

  const base = `/${locale}/blog`;
  const filterClass =
    "rounded-full border px-3.5 py-1.5 text-sm transition-colors hover:border-[var(--color-border-strong)]";

  return (
    <Section>
      <SectionHeading title={t("blog.title")} subtitle={t("blog.subtitle")} />

      {tags.length ? (
        <nav aria-label="Tags" className="mb-8 flex flex-wrap gap-2">
          <Link
            href={base}
            className={cn(
              filterClass,
              !tag
                ? "border-transparent bg-[var(--color-accent)] text-white"
                : "border-[var(--color-border)] text-[var(--color-ink-muted)]",
            )}
          >
            {t("common.filterAll")}
          </Link>
          {tags
            .filter((item) => (item.count ?? 0) > 0)
            .map((item) => (
              <Link
                key={item.id}
                href={`${base}?tag=${item.slug}`}
                className={cn(
                  filterClass,
                  tag === item.slug
                    ? "border-transparent bg-[var(--color-accent)] text-white"
                    : "border-[var(--color-border)] text-[var(--color-ink-muted)]",
                )}
              >
                {pick(item, "name", locale)}
              </Link>
            ))}
        </nav>
      ) : null}

      {result.items.length ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {result.items.map((post) => (
            <PostCard key={post.id} post={post} locale={locale} />
          ))}
        </div>
      ) : (
        <EmptyState message={t("common.noResults")} />
      )}

      <Pagination
        page={result.page}
        pages={result.pages}
        basePath={base}
        params={{ tag }}
        locale={locale}
      />
    </Section>
  );
}
