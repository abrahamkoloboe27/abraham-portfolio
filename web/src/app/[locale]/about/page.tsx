import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  CertificationList,
  EducationList,
  ExperienceTimeline,
  SkillsGrid,
} from "@/components/sections/blocks";
import { Badge, Card, Section, SectionHeading } from "@/components/ui/primitives";
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
    title: t("nav.about"),
    alternates: { canonical: `/${locale}/about` },
  };
}

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = translator(locale);
  const bundle = await api.siteBundleSafe();
  if (!bundle) return null;

  return (
    <>
      <Section>
        <SectionHeading
          eyebrow={bundle.settings.full_name}
          title={t("nav.about")}
          subtitle={pick(bundle.settings, "tagline", locale)}
        />
        <p className="max-w-3xl text-lg leading-relaxed text-[var(--color-ink-muted)]">
          {pick(bundle.settings, "bio", locale)}
        </p>
      </Section>

      {bundle.experiences.length ? (
        <Section muted>
          <SectionHeading title={t("about.experience")} />
          <ExperienceTimeline items={bundle.experiences} locale={locale} />
        </Section>
      ) : null}

      {bundle.skill_categories.length ? (
        <Section>
          <SectionHeading title={t("about.skills")} />
          <SkillsGrid categories={bundle.skill_categories} locale={locale} />
        </Section>
      ) : null}

      {bundle.education.length ? (
        <Section muted>
          <SectionHeading title={t("about.education")} />
          <EducationList items={bundle.education} locale={locale} />
        </Section>
      ) : null}

      {bundle.certifications.length ? (
        <Section>
          <SectionHeading title={t("about.certifications")} />
          <CertificationList items={bundle.certifications} locale={locale} />
        </Section>
      ) : null}

      {bundle.languages.length ? (
        <Section muted>
          <SectionHeading title={t("about.languages")} />
          <ul className="flex flex-wrap gap-4">
            {bundle.languages.map((language) => (
              <li key={language.id}>
                <Card className="flex items-center gap-3 px-5 py-4">
                  <span className="font-medium">{pick(language, "name", locale)}</span>
                  <Badge variant="accent">{pick(language, "level", locale)}</Badge>
                  {language.cefr ? <Badge variant="outline">{language.cefr}</Badge> : null}
                </Card>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}
    </>
  );
}
