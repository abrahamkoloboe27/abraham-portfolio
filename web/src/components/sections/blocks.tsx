import {
  Award,
  Briefcase,
  Building2,
  ExternalLink,
  GraduationCap,
  Quote,
  Sparkles,
} from "lucide-react";

import { PlaylistCard, PostCard, ProjectCard, TalkCard } from "@/components/cards";
import { SocialIcon } from "@/components/layout/SocialIcon";
import { Markdown } from "@/components/ui/Markdown";
import {
  Badge,
  ButtonLink,
  Card,
  Container,
  EmptyState,
  Section,
  SectionHeading,
} from "@/components/ui/primitives";
import { pick, translator } from "@/lib/i18n";
import type { Locale, Section as SectionModel, SiteBundle } from "@/lib/types";
import { cn, formatDate, formatPeriod, initials } from "@/lib/utils";

type BlockProps = { section: SectionModel; bundle: SiteBundle; locale: Locale };

function headings(section: SectionModel, locale: Locale) {
  return {
    title: pick(section, "title", locale),
    subtitle: pick(section, "subtitle", locale) || null,
  };
}

/* ------------------------------------------------------------------- hero */
function Hero({ section, bundle, locale }: BlockProps) {
  const t = translator(locale);
  const { settings, socials } = bundle;
  const heroSocials = socials.filter((s) => s.show_in_hero);
  const resume = locale === "fr" ? settings.resume_url_fr : settings.resume_url_en;
  const availability = pick(settings, "availability", locale);

  return (
    <section id={section.key} className="scroll-mt-20 pt-16 pb-14 sm:pt-24 sm:pb-20">
      <Container>
        <div className="grid items-center gap-12 lg:grid-cols-[1.35fr_1fr]">
          <div>
            {settings.is_open_to_work && availability ? (
              <Badge variant="success" className="mb-5">
                <span className="size-1.5 rounded-full bg-current" aria-hidden />
                {availability}
              </Badge>
            ) : null}

            <p className="text-sm font-medium text-[var(--color-accent)]">
              {pick(section, "title", locale) || t("nav.home")}
            </p>
            <h1 className="mt-2 text-4xl font-bold sm:text-5xl lg:text-6xl">
              {settings.full_name}
            </h1>
            <p className="mt-3 text-xl font-medium text-[var(--color-ink-muted)] sm:text-2xl">
              {pick(settings, "job_title", locale)}
            </p>

            {pick(settings, "tagline", locale) ? (
              <p className="mt-6 max-w-xl text-lg text-[var(--color-ink-muted)]">
                {pick(settings, "tagline", locale)}
              </p>
            ) : null}

            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href={`/${locale}/projects`}>{t("hero.cta.projects")}</ButtonLink>
              <ButtonLink href={`/${locale}/contact`} variant="secondary">
                {t("hero.cta.contact")}
              </ButtonLink>
              {resume ? (
                <ButtonLink href={resume} variant="ghost" external>
                  {t("hero.cta.resume")}
                  <ExternalLink className="size-4" aria-hidden />
                </ButtonLink>
              ) : null}
            </div>

            {heroSocials.length ? (
              <div className="mt-8 flex flex-wrap items-center gap-3">
                {heroSocials.map((social) => (
                  <a
                    key={social.id}
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-ink-muted)] transition-colors hover:border-[var(--color-border-strong)] hover:text-[var(--color-ink)]"
                  >
                    <SocialIcon name={social.icon ?? social.platform} className="size-4" />
                    {social.label}
                  </a>
                ))}
              </div>
            ) : null}
          </div>

          <div className="hidden lg:block">
            <div className="surface-card relative overflow-hidden p-8">
              <div
                aria-hidden
                className="absolute -top-24 -right-24 size-64 rounded-full bg-[var(--color-accent)] opacity-[0.07] blur-3xl"
              />
              {settings.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={settings.avatar_url}
                  alt={settings.full_name}
                  className="mb-6 size-20 rounded-2xl object-cover"
                />
              ) : (
                <div className="mb-6 grid size-20 place-items-center rounded-2xl bg-[var(--color-accent)] text-xl font-bold text-white">
                  {initials(settings.full_name)}
                </div>
              )}
              {pick(settings, "quote", locale) ? (
                <blockquote className="relative">
                  <Quote className="mb-3 size-6 text-[var(--color-accent)]" aria-hidden />
                  <p className="text-lg leading-relaxed font-medium">
                    {pick(settings, "quote", locale)}
                  </p>
                </blockquote>
              ) : null}
              {settings.location ? (
                <p className="mt-6 text-sm text-[var(--color-ink-subtle)]">{settings.location}</p>
              ) : null}
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

/* ------------------------------------------------------------------ stats */
function Stats({ section, bundle, locale }: BlockProps) {
  if (!bundle.stats.length) return null;
  return (
    <Section id={section.key} muted className="py-12 sm:py-14">
      <dl className="grid grid-cols-2 gap-8 lg:grid-cols-4">
        {bundle.stats.map((stat) => (
          <div key={stat.id}>
            <dt className="order-2 mt-1 text-sm text-[var(--color-ink-muted)]">
              {pick(stat, "label", locale)}
            </dt>
            <dd className="order-1 text-3xl font-bold sm:text-4xl">
              {stat.value}
              {stat.suffix ? (
                <span className="text-[var(--color-accent)]">{stat.suffix}</span>
              ) : null}
            </dd>
          </div>
        ))}
      </dl>
    </Section>
  );
}

/* ------------------------------------------------------------------ about */
function About({ section, bundle, locale }: BlockProps) {
  const { title, subtitle } = headings(section, locale);
  const bio = pick(bundle.settings, "bio", locale);
  const custom = pick(section, "content", locale);

  return (
    <Section id={section.key}>
      <SectionHeading title={title} subtitle={subtitle} />
      <div className="grid gap-10 lg:grid-cols-[1.6fr_1fr]">
        <div>
          {custom ? (
            <Markdown content={custom} />
          ) : (
            <p className="text-lg leading-relaxed text-[var(--color-ink-muted)]">{bio}</p>
          )}
        </div>
        {bundle.organizations.length ? (
          <div>
            <p className="mb-4 text-xs font-semibold tracking-[0.14em] uppercase">
              {translator(locale)("about.communities")}
            </p>
            <ul className="flex flex-col gap-3">
              {bundle.organizations.map((org) => (
                <li key={org.id}>
                  <Card className="flex items-start gap-3 p-4">
                    <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[var(--color-accent-soft)] text-[var(--color-accent-ink)]">
                      <Building2 className="size-4" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <p className="font-medium">
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
                      <p className="text-sm text-[var(--color-ink-muted)]">
                        {pick(org, "role", locale)}
                      </p>
                    </div>
                  </Card>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------- experience */
export function ExperienceTimeline({
  items,
  locale,
}: {
  items: SiteBundle["experiences"];
  locale: Locale;
}) {
  const t = translator(locale);

  return (
    <ol className="relative flex flex-col gap-10 border-l border-[var(--color-border)] pl-6 sm:pl-8">
      {items.map((item) => (
        <li key={item.id} className="relative">
          <span
            aria-hidden
            className={cn(
              "absolute top-1.5 -left-[calc(1.5rem+5px)] size-2.5 rounded-full ring-4 ring-[var(--color-surface)] sm:-left-[calc(2rem+5px)]",
              item.is_current ? "bg-[var(--color-accent)]" : "bg-[var(--color-border-strong)]",
            )}
          />
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-lg font-semibold">{pick(item, "role", locale)}</h3>
            <span className="text-sm text-[var(--color-ink-subtle)]">
              {formatPeriod(item.start_date, item.end_date, locale, t("common.present"))}
            </span>
          </div>

          <p className="mt-1 flex flex-wrap items-center gap-2 text-[var(--color-ink-muted)]">
            <Briefcase className="size-4 shrink-0" aria-hidden />
            {item.company_url ? (
              <a
                href={item.company_url}
                target="_blank"
                rel="noopener noreferrer"
                className="link-underline font-medium"
              >
                {item.company}
              </a>
            ) : (
              <span className="font-medium">{item.company}</span>
            )}
            {item.location ? (
              <span className="text-sm text-[var(--color-ink-subtle)]">· {item.location}</span>
            ) : null}
          </p>

          {pick(item, "summary", locale) ? (
            <p className="mt-3 text-[var(--color-ink-muted)]">{pick(item, "summary", locale)}</p>
          ) : null}

          {item.highlights.length ? (
            <ul className="mt-3 flex list-disc flex-col gap-2 pl-5 text-[var(--color-ink-muted)] marker:text-[var(--color-ink-subtle)]">
              {item.highlights.map((highlight, index) => (
                <li key={index}>{highlight[locale] ?? highlight.fr ?? highlight.en}</li>
              ))}
            </ul>
          ) : null}

          {item.tech.length ? (
            <ul className="mt-4 flex flex-wrap gap-1.5">
              {item.tech.map((tech) => (
                <li key={tech}>
                  <Badge variant="outline">{tech}</Badge>
                </li>
              ))}
            </ul>
          ) : null}
        </li>
      ))}
    </ol>
  );
}

function Experience({ section, bundle, locale }: BlockProps) {
  if (!bundle.experiences.length) return null;
  const { title, subtitle } = headings(section, locale);
  return (
    <Section id={section.key} muted>
      <SectionHeading title={title} subtitle={subtitle} />
      <ExperienceTimeline items={bundle.experiences} locale={locale} />
    </Section>
  );
}

/* ----------------------------------------------------------------- skills */
export function SkillsGrid({
  categories,
  locale,
}: {
  categories: SiteBundle["skill_categories"];
  locale: Locale;
}) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {categories.map((category) => (
        <Card key={category.id} className="p-5">
          <h3 className="mb-4 flex items-center gap-2 font-semibold">
            <Sparkles className="size-4 text-[var(--color-accent)]" aria-hidden />
            {pick(category, "name", locale)}
          </h3>
          <ul className="flex flex-col gap-2.5">
            {category.skills.map((skill) => (
              <li key={skill.id} className="flex items-center justify-between gap-3">
                <span className="text-sm text-[var(--color-ink-muted)]">{skill.name}</span>
                <span className="flex gap-0.5" aria-label={`${skill.level}/5`}>
                  {[1, 2, 3, 4, 5].map((step) => (
                    <span
                      key={step}
                      aria-hidden
                      className={cn(
                        "h-1.5 w-3.5 rounded-full",
                        step <= skill.level
                          ? "bg-[var(--color-accent)]"
                          : "bg-[var(--color-border)]",
                      )}
                    />
                  ))}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      ))}
    </div>
  );
}

function Skills({ section, bundle, locale }: BlockProps) {
  if (!bundle.skill_categories.length) return null;
  const { title, subtitle } = headings(section, locale);
  return (
    <Section id={section.key}>
      <SectionHeading title={title} subtitle={subtitle} />
      <SkillsGrid categories={bundle.skill_categories} locale={locale} />
    </Section>
  );
}

/* --------------------------------------------------------------- projects */
function Projects({ section, bundle, locale }: BlockProps) {
  const t = translator(locale);
  const { title, subtitle } = headings(section, locale);
  const items = bundle.featured_projects.slice(0, section.max_items ?? 6);
  if (!items.length) return null;

  return (
    <Section id={section.key} muted>
      <SectionHeading
        title={title}
        subtitle={subtitle}
        action={
          <ButtonLink href={`/${locale}/projects`} variant="secondary">
            {t("common.viewAll")}
          </ButtonLink>
        }
      />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((project) => (
          <ProjectCard key={project.id} project={project} locale={locale} />
        ))}
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------------ talks */
function Talks({ section, bundle, locale }: BlockProps) {
  const t = translator(locale);
  const { title, subtitle } = headings(section, locale);
  const items = bundle.featured_talks.slice(0, section.max_items ?? 6);
  if (!items.length) return null;

  return (
    <Section id={section.key}>
      <SectionHeading
        title={title}
        subtitle={subtitle}
        action={
          <ButtonLink href={`/${locale}/talks`} variant="secondary">
            {t("common.viewAll")}
          </ButtonLink>
        }
      />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((talk) => (
          <TalkCard key={talk.id} talk={talk} locale={locale} />
        ))}
      </div>
    </Section>
  );
}

/* -------------------------------------------------------------- playlists */
function Playlists({ section, bundle, locale }: BlockProps) {
  if (!bundle.playlists.length) return null;
  const { title, subtitle } = headings(section, locale);
  return (
    <Section id={section.key} muted>
      <SectionHeading title={title} subtitle={subtitle} />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {bundle.playlists.map((playlist) => (
          <PlaylistCard key={playlist.id} playlist={playlist} locale={locale} />
        ))}
      </div>
    </Section>
  );
}

/* --------------------------------------------------------- certifications */
export function CertificationList({
  items,
  locale,
}: {
  items: SiteBundle["certifications"];
  locale: Locale;
}) {
  const t = translator(locale);
  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {items.map((item) => (
        <li key={item.id}>
          <Card className="flex h-full items-start gap-3 p-5">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[var(--color-accent-soft)] text-[var(--color-accent-ink)]">
              <Award className="size-4" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="font-medium">{item.name}</p>
              <p className="mt-0.5 text-sm text-[var(--color-ink-muted)]">
                {item.issuer}
                {item.issued_at
                  ? ` · ${formatDate(item.issued_at, locale, { year: "numeric" })}`
                  : ""}
              </p>
              {item.credential_url ? (
                <a
                  href={item.credential_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1.5 text-sm text-[var(--color-accent)]"
                >
                  {t("about.credential")}
                  <ExternalLink className="size-3.5" aria-hidden />
                </a>
              ) : null}
            </div>
          </Card>
        </li>
      ))}
    </ul>
  );
}

function Certifications({ section, bundle, locale }: BlockProps) {
  if (!bundle.certifications.length) return null;
  const { title, subtitle } = headings(section, locale);
  return (
    <Section id={section.key}>
      <SectionHeading title={title} subtitle={subtitle} />
      <CertificationList items={bundle.certifications} locale={locale} />
    </Section>
  );
}

/* -------------------------------------------------------------- education */
export function EducationList({
  items,
  locale,
}: {
  items: SiteBundle["education"];
  locale: Locale;
}) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {items.map((item) => (
        <li key={item.id}>
          <Card className="flex h-full items-start gap-3 p-5">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[var(--color-accent-soft)] text-[var(--color-accent-ink)]">
              <GraduationCap className="size-4" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="font-medium">{pick(item, "degree", locale)}</p>
              <p className="mt-0.5 text-sm text-[var(--color-ink-muted)]">{item.school}</p>
              <p className="mt-1 text-xs text-[var(--color-ink-subtle)]">
                {[item.start_year, item.end_year].filter(Boolean).join(" — ")}
                {item.location ? ` · ${item.location}` : ""}
              </p>
              {pick(item, "description", locale) ? (
                <p className="mt-2 text-sm text-[var(--color-ink-muted)]">
                  {pick(item, "description", locale)}
                </p>
              ) : null}
            </div>
          </Card>
        </li>
      ))}
    </ul>
  );
}

function EducationBlock({ section, bundle, locale }: BlockProps) {
  if (!bundle.education.length) return null;
  const { title, subtitle } = headings(section, locale);
  return (
    <Section id={section.key} muted>
      <SectionHeading title={title} subtitle={subtitle} />
      <EducationList items={bundle.education} locale={locale} />
    </Section>
  );
}

/* ------------------------------------------------------------------- blog */
function Blog({ section, bundle, locale }: BlockProps) {
  const t = translator(locale);
  const { title, subtitle } = headings(section, locale);
  const items = bundle.latest_posts.slice(0, section.max_items ?? 3);
  if (!items.length) return null;

  return (
    <Section id={section.key}>
      <SectionHeading
        title={title}
        subtitle={subtitle}
        action={
          <ButtonLink href={`/${locale}/blog`} variant="secondary">
            {t("common.viewAll")}
          </ButtonLink>
        }
      />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((post) => (
          <PostCard key={post.id} post={post} locale={locale} />
        ))}
      </div>
    </Section>
  );
}

/* ----------------------------------------------------------- testimonials */
function Testimonials({ section, bundle, locale }: BlockProps) {
  if (!bundle.testimonials.length) return null;
  const { title, subtitle } = headings(section, locale);
  return (
    <Section id={section.key} muted>
      <SectionHeading title={title} subtitle={subtitle} />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {bundle.testimonials.map((item) => (
          <Card key={item.id} className="flex h-full flex-col p-6">
            <Quote className="mb-3 size-5 text-[var(--color-accent)]" aria-hidden />
            <p className="flex-1 text-[var(--color-ink-muted)] italic">
              {pick(item, "quote", locale)}
            </p>
            <div className="mt-5 flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-full bg-[var(--color-accent-soft)] text-xs font-semibold text-[var(--color-accent-ink)]">
                {initials(item.author_name)}
              </span>
              <div>
                <p className="text-sm font-medium">{item.author_name}</p>
                <p className="text-xs text-[var(--color-ink-subtle)]">
                  {[pick(item, "author_role", locale), item.company].filter(Boolean).join(" · ")}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </Section>
  );
}

/* ---------------------------------------------------------------- contact */
function ContactCta({ section, bundle, locale }: BlockProps) {
  const t = translator(locale);
  const { title, subtitle } = headings(section, locale);

  return (
    <Section id={section.key} muted>
      <Card className="flex flex-col items-start gap-6 p-8 sm:p-12 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-xl">
          <h2 className="text-2xl font-semibold sm:text-3xl">{title || t("contact.title")}</h2>
          {subtitle ? <p className="mt-3 text-[var(--color-ink-muted)]">{subtitle}</p> : null}
        </div>
        <div className="flex flex-wrap gap-3">
          <ButtonLink href={`/${locale}/contact`}>{t("hero.cta.contact")}</ButtonLink>
          {bundle.settings.email ? (
            <ButtonLink href={`mailto:${bundle.settings.email}`} variant="secondary">
              {bundle.settings.email}
            </ButtonLink>
          ) : null}
        </div>
      </Card>
    </Section>
  );
}

/* ------------------------------------------------------- markdown / custom */
function MarkdownBlock({ section, locale }: BlockProps) {
  const { title, subtitle } = headings(section, locale);
  const content = pick(section, "content", locale);
  if (!content && !title) return null;

  return (
    <Section id={section.key}>
      {title ? <SectionHeading title={title} subtitle={subtitle} /> : null}
      <div className="max-w-3xl">
        <Markdown content={content} />
      </div>
    </Section>
  );
}

/* --------------------------------------------------------------- renderer */
const BLOCKS: Partial<Record<SectionModel["type"], (props: BlockProps) => React.ReactNode>> = {
  hero: Hero,
  stats: Stats,
  about: About,
  experience: Experience,
  skills: Skills,
  projects: Projects,
  talks: Talks,
  playlists: Playlists,
  certifications: Certifications,
  education: EducationBlock,
  blog: Blog,
  testimonials: Testimonials,
  contact: ContactCta,
  cta: ContactCta,
  markdown: MarkdownBlock,
  custom: MarkdownBlock,
};

/**
 * Renders the home page from the ordered `sections` rows.
 *
 * Adding a section in the admin inserts a row here — no deploy needed. An
 * unknown type falls back to the Markdown block instead of breaking the page.
 */
export function SectionRenderer({ bundle, locale }: { bundle: SiteBundle; locale: Locale }) {
  return (
    <>
      {bundle.sections.map((section) => {
        const Block = BLOCKS[section.type] ?? MarkdownBlock;
        return <Block key={section.id} section={section} bundle={bundle} locale={locale} />;
      })}
      {bundle.sections.length === 0 ? (
        <Section>
          <EmptyState message={translator(locale)("common.noResults")} />
        </Section>
      ) : null}
    </>
  );
}
