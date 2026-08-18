import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ProjectCard } from "@/components/cards";
import { Pagination } from "@/components/Pagination";
import { EmptyState, Section, SectionHeading } from "@/components/ui/primitives";
import { api } from "@/lib/api";
import { isLocale, translator } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export const revalidate = 300;

const CATEGORIES = [
  "data-engineering",
  "machine-learning",
  "mlops",
  "analytics",
  "web",
  "open-source",
] as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = translator(locale);
  return {
    title: t("projects.title"),
    description: t("projects.subtitle"),
    alternates: { canonical: `/${locale}/projects` },
  };
}

export default async function ProjectsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string; category?: string; tag?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const { page: rawPage, category, tag } = await searchParams;
  const t = translator(locale);

  const page = Math.max(1, Number(rawPage ?? 1) || 1);
  const result = await api.projects({ page, per_page: 12, category, tag });

  const base = `/${locale}/projects`;
  const filterClass =
    "rounded-full border px-3.5 py-1.5 text-sm transition-colors hover:border-[var(--color-border-strong)]";

  return (
    <Section>
      <SectionHeading title={t("projects.title")} subtitle={t("projects.subtitle")} />

      <nav aria-label={t("projects.filterCategory")} className="mb-8 flex flex-wrap gap-2">
        <Link
          href={base}
          className={cn(
            filterClass,
            !category
              ? "border-transparent bg-[var(--color-accent)] text-white"
              : "border-[var(--color-border)] text-[var(--color-ink-muted)]",
          )}
        >
          {t("common.filterAll")}
        </Link>
        {CATEGORIES.map((item) => (
          <Link
            key={item}
            href={`${base}?category=${item}`}
            className={cn(
              filterClass,
              category === item
                ? "border-transparent bg-[var(--color-accent)] text-white"
                : "border-[var(--color-border)] text-[var(--color-ink-muted)]",
            )}
          >
            {item.replace(/-/g, " ")}
          </Link>
        ))}
      </nav>

      {result.items.length ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {result.items.map((project) => (
            <ProjectCard key={project.id} project={project} locale={locale} />
          ))}
        </div>
      ) : (
        <EmptyState message={t("common.noResults")} />
      )}

      <Pagination
        page={result.page}
        pages={result.pages}
        basePath={base}
        params={{ category, tag }}
        locale={locale}
      />
    </Section>
  );
}
