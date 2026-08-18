import {
  BookOpen,
  Eye,
  FolderGit2,
  ImageIcon,
  Mail,
  Mic,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";

import { Badge, ErrorState, LoadingBlock, PageHeader, Panel } from "@/components/ui";
import { useDashboard } from "@/lib/queries";
import { formatNumber, relativeTime } from "@/lib/utils";

export function Dashboard() {
  const { data, isLoading, isError, refetch } = useDashboard();

  if (isLoading) return <LoadingBlock />;
  if (isError || !data) {
    return <ErrorState message="Statistiques indisponibles." onRetry={() => void refetch()} />;
  }

  const cards: { label: string; value: string; hint: string; icon: LucideIcon; to: string }[] = [
    {
      label: "Réalisations",
      value: formatNumber(data.projects_total),
      hint: `${data.projects_published} publiée(s)`,
      icon: FolderGit2,
      to: "/r/projects",
    },
    {
      label: "Articles",
      value: formatNumber(data.posts_total),
      hint: `${data.posts_published} publié(s)`,
      icon: BookOpen,
      to: "/r/posts",
    },
    {
      label: "Interventions",
      value: formatNumber(data.talks_total),
      hint: `${data.playlists_total} playlist(s)`,
      icon: Mic,
      to: "/r/talks",
    },
    {
      label: "Messages",
      value: formatNumber(data.messages_total),
      hint: `${data.messages_unread} non lu(s)`,
      icon: Mail,
      to: "/messages",
    },
    {
      label: "Médias",
      value: formatNumber(data.media_total),
      hint: "fichiers",
      icon: ImageIcon,
      to: "/media",
    },
    {
      label: "Accès",
      value: formatNumber(data.users_total),
      hint: "comptes",
      icon: Users,
      to: "/team",
    },
  ];

  const peak = Math.max(1, ...data.views_timeseries.map((point) => point.value));

  return (
    <>
      <PageHeader
        title="Tableau de bord"
        description="Vue d'ensemble du site et de son audience."
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <Link key={card.label} to={card.to}>
            <Panel className="flex items-center gap-4 p-4 transition-colors hover:border-[var(--color-line-strong)]">
              <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-[var(--color-brand-soft)] text-[var(--color-brand-ink)]">
                <card.icon className="size-5" aria-hidden />
              </span>
              <div>
                <p className="text-2xl font-semibold tabular-nums">{card.value}</p>
                <p className="text-sm text-[var(--color-ink-muted)]">
                  {card.label} · <span className="text-[var(--color-ink-subtle)]">{card.hint}</span>
                </p>
              </div>
            </Panel>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel className="p-5 lg:col-span-2">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-semibold">
              <Eye className="size-4 text-[var(--color-brand)]" aria-hidden />
              Audience — 30 derniers jours
            </h2>
            <div className="flex gap-2 text-xs">
              <Badge tone="brand">{formatNumber(data.views_30d)} vues</Badge>
              <Badge tone="neutral">{formatNumber(data.visitors_30d)} visiteurs</Badge>
            </div>
          </div>

          {data.views_timeseries.length ? (
            <div
              className="flex h-40 items-end gap-1"
              role="img"
              aria-label={`Vues quotidiennes, pic à ${peak}`}
            >
              {data.views_timeseries.map((point) => (
                <div key={point.date} className="group relative flex-1">
                  <div
                    className="w-full rounded-t bg-[var(--color-brand)] opacity-80 transition-opacity group-hover:opacity-100"
                    style={{ height: `${Math.max(4, (point.value / peak) * 150)}px` }}
                  />
                  <span className="pointer-events-none absolute -top-7 left-1/2 hidden -translate-x-1/2 rounded bg-[var(--color-ink)] px-1.5 py-0.5 text-[10px] whitespace-nowrap text-[var(--color-panel)] group-hover:block">
                    {point.date} · {point.value}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-12 text-center text-sm text-[var(--color-ink-subtle)]">
              Pas encore de visite enregistrée.
            </p>
          )}

          <p className="mt-4 text-sm text-[var(--color-ink-muted)]">
            {formatNumber(data.views_7d)} vues sur les 7 derniers jours.
          </p>
        </Panel>

        <Panel className="p-5">
          <h2 className="mb-4 font-semibold">Pages les plus vues</h2>
          {data.top_pages.length ? (
            <ul className="flex flex-col gap-2.5 text-sm">
              {data.top_pages.map((entry) => (
                <li key={entry.label} className="flex items-center justify-between gap-3">
                  <span className="truncate text-[var(--color-ink-muted)]">{entry.label}</span>
                  <span className="shrink-0 tabular-nums">{entry.value}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[var(--color-ink-subtle)]">Aucune donnée.</p>
          )}

          <h2 className="mt-6 mb-4 font-semibold">Sources de trafic</h2>
          {data.top_referrers.length ? (
            <ul className="flex flex-col gap-2.5 text-sm">
              {data.top_referrers.slice(0, 5).map((entry) => (
                <li key={entry.label} className="flex items-center justify-between gap-3">
                  <span className="truncate text-[var(--color-ink-muted)]">{entry.label}</span>
                  <span className="shrink-0 tabular-nums">{entry.value}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[var(--color-ink-subtle)]">Aucune donnée.</p>
          )}
        </Panel>
      </div>

      <Panel className="mt-4 p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold">Derniers messages</h2>
          <Link to="/messages" className="text-sm text-[var(--color-brand)] hover:underline">
            Tout voir
          </Link>
        </div>
        {data.recent_messages.length ? (
          <ul className="divide-y divide-[var(--color-line)]">
            {data.recent_messages.map((message) => (
              <li key={message.id} className="flex items-start justify-between gap-4 py-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-sm font-medium">
                    {message.name}
                    {!message.is_read ? <Badge tone="brand">Nouveau</Badge> : null}
                  </p>
                  <p className="truncate text-sm text-[var(--color-ink-muted)]">
                    {message.subject ?? message.message}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-[var(--color-ink-subtle)]">
                  {relativeTime(message.created_at)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-[var(--color-ink-subtle)]">Aucun message pour le moment.</p>
        )}
      </Panel>
    </>
  );
}
