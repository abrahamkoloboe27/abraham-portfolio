import Link from "next/link";
import {
  ArrowUpRight,
  CalendarDays,
  Clock,
  ExternalLink,
  Github,
  MapPin,
  PlaySquare,
  Users,
} from "lucide-react";

import { Badge, Card } from "@/components/ui/primitives";
import { pick, translator } from "@/lib/i18n";
import type { Locale, Playlist, PostSummary, ProjectSummary, Talk } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export function ProjectCard({
  project,
  locale,
}: {
  project: ProjectSummary;
  locale: Locale;
}) {
  const t = translator(locale);
  const title = pick(project, "title", locale);

  return (
    <Card interactive className="group flex h-full flex-col">
      <div className="flex flex-1 flex-col p-6">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Badge variant="accent">{project.category.replace(/-/g, " ")}</Badge>
          {project.is_featured ? <Badge variant="success">★</Badge> : null}
        </div>

        <h3 className="text-lg font-semibold">
          <Link
            href={`/${locale}/projects/${project.slug}`}
            className="after:absolute after:inset-0 group-hover:text-[var(--color-accent)]"
          >
            {title}
          </Link>
        </h3>

        <p className="mt-2 line-clamp-3 flex-1 text-sm text-[var(--color-ink-muted)]">
          {pick(project, "summary", locale)}
        </p>

        {project.tech.length ? (
          <ul className="mt-4 flex flex-wrap gap-1.5">
            {project.tech.slice(0, 5).map((tech) => (
              <li key={tech}>
                <Badge variant="outline">{tech}</Badge>
              </li>
            ))}
            {project.tech.length > 5 ? (
              <li>
                <Badge variant="outline">+{project.tech.length - 5}</Badge>
              </li>
            ) : null}
          </ul>
        ) : null}
      </div>

      <div className="relative z-10 flex items-center gap-4 border-t border-[var(--color-border)] px-6 py-3 text-xs text-[var(--color-ink-subtle)]">
        {project.repo_url ? (
          <a
            href={project.repo_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 transition-colors hover:text-[var(--color-ink)]"
          >
            <Github className="size-3.5" aria-hidden />
            {t("projects.code")}
          </a>
        ) : null}
        {project.demo_url ? (
          <a
            href={project.demo_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 transition-colors hover:text-[var(--color-ink)]"
          >
            <ExternalLink className="size-3.5" aria-hidden />
            {t("projects.demo")}
          </a>
        ) : null}
        <ArrowUpRight
          className="ml-auto size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
          aria-hidden
        />
      </div>
    </Card>
  );
}

export function PostCard({ post, locale }: { post: PostSummary; locale: Locale }) {
  const t = translator(locale);

  return (
    <Card interactive className="group relative flex h-full flex-col p-6">
      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-[var(--color-ink-subtle)]">
        {post.published_at ? (
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="size-3.5" aria-hidden />
            {formatDate(post.published_at, locale)}
          </span>
        ) : null}
        <span className="inline-flex items-center gap-1.5">
          <Clock className="size-3.5" aria-hidden />
          {post.reading_minutes} {t("common.minRead")}
        </span>
      </div>

      <h3 className="text-lg font-semibold">
        <Link
          href={`/${locale}/blog/${post.slug}`}
          className="after:absolute after:inset-0 group-hover:text-[var(--color-accent)]"
        >
          {pick(post, "title", locale)}
        </Link>
      </h3>

      <p className="mt-2 line-clamp-3 flex-1 text-sm text-[var(--color-ink-muted)]">
        {pick(post, "excerpt", locale)}
      </p>

      {post.tags.length ? (
        <ul className="mt-4 flex flex-wrap gap-1.5">
          {post.tags.slice(0, 3).map((tag) => (
            <li key={tag.id}>
              <Badge variant="accent">{pick(tag, "name", locale)}</Badge>
            </li>
          ))}
        </ul>
      ) : null}
    </Card>
  );
}

export function TalkCard({ talk, locale }: { talk: Talk; locale: Locale }) {
  const t = translator(locale);
  const typeLabel = t(`talkType.${talk.type}` as Parameters<typeof t>[0]);

  return (
    <Card interactive className="group relative flex h-full flex-col p-6">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Badge variant="accent">{typeLabel}</Badge>
        {talk.organization ? <Badge variant="outline">{talk.organization.name}</Badge> : null}
      </div>

      <h3 className="text-base font-semibold">
        <Link
          href={`/${locale}/talks/${talk.slug}`}
          className="after:absolute after:inset-0 group-hover:text-[var(--color-accent)]"
        >
          {pick(talk, "title", locale)}
        </Link>
      </h3>

      <p className="mt-2 line-clamp-3 flex-1 text-sm text-[var(--color-ink-muted)]">
        {pick(talk, "description", locale)}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[var(--color-ink-subtle)]">
        {talk.event_date ? (
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="size-3.5" aria-hidden />
            {formatDate(talk.event_date, locale, { month: "long", year: "numeric" })}
          </span>
        ) : null}
        {talk.location ? (
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="size-3.5" aria-hidden />
            {talk.location}
          </span>
        ) : null}
        {talk.audience_size ? (
          <span className="inline-flex items-center gap-1.5">
            <Users className="size-3.5" aria-hidden />
            {talk.audience_size} {t("talks.audience")}
          </span>
        ) : null}
      </div>
    </Card>
  );
}

export function PlaylistCard({ playlist, locale }: { playlist: Playlist; locale: Locale }) {
  const t = translator(locale);

  return (
    <Card interactive className="group flex h-full flex-col">
      {playlist.thumbnail_url ? (
        // Thumbnails come from YouTube's CDN at a fixed 16:9 ratio.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={playlist.thumbnail_url}
          alt=""
          loading="lazy"
          className="aspect-video w-full object-cover"
        />
      ) : (
        <div className="grid aspect-video w-full place-items-center bg-[var(--color-surface-muted)]">
          <PlaySquare className="size-10 text-[var(--color-ink-subtle)]" aria-hidden />
        </div>
      )}

      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-semibold">{pick(playlist, "title", locale)}</h3>
        <p className="mt-2 line-clamp-2 flex-1 text-sm text-[var(--color-ink-muted)]">
          {pick(playlist, "description", locale)}
        </p>

        <div className="mt-4 flex items-center justify-between">
          <div className="flex flex-wrap gap-1.5">
            {playlist.level ? <Badge variant="outline">{playlist.level}</Badge> : null}
            {playlist.video_count ? (
              <Badge variant="outline">
                {playlist.video_count} {t("talks.videos")}
              </Badge>
            ) : null}
          </div>
          <a
            href={playlist.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-accent)]"
          >
            {t("talks.watchPlaylist")}
            <ArrowUpRight className="size-4" aria-hidden />
          </a>
        </div>
      </div>
    </Card>
  );
}
