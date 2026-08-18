import {
  ExternalLink,
  Gauge,
  Image as ImageIcon,
  LogOut,
  Mail,
  Menu,
  Moon,
  ScrollText,
  Settings as SettingsIcon,
  Sun,
  Users,
  X,
} from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import { NavLink, Outlet } from "react-router-dom";

import { Badge, Button } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { useDashboard } from "@/lib/queries";
import { RESOURCE_GROUPS, RESOURCES } from "@/lib/resources";
import { ROLE_LABELS } from "@/lib/types";
import { cn } from "@/lib/utils";

const SITE_URL = (import.meta.env.VITE_SITE_URL as string | undefined) ?? "http://localhost:3000";
const THEME_KEY = "admin-theme";
const THEME_EVENT = "admin:themechange";

function subscribeTheme(onChange: () => void) {
  window.addEventListener(THEME_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(THEME_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function readTheme(): "light" | "dark" {
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function toggleTheme() {
  const next = readTheme() === "dark" ? "light" : "dark";
  localStorage.setItem(THEME_KEY, next);
  document.documentElement.classList.toggle("dark", next === "dark");
  window.dispatchEvent(new Event(THEME_EVENT));
}

export function Layout() {
  const { user, logout } = useAuth();
  const { data: stats } = useDashboard();
  const [open, setOpen] = useState(false);
  const theme = useSyncExternalStore(subscribeTheme, readTheme, () => "light" as const);

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
      isActive
        ? "bg-[var(--color-brand-soft)] font-medium text-[var(--color-brand-ink)]"
        : "text-[var(--color-ink-muted)] hover:bg-[var(--color-panel-alt)] hover:text-[var(--color-ink)]",
    );

  const nav = (
    <nav className="flex flex-1 flex-col gap-6 overflow-y-auto p-3">
      <div className="flex flex-col gap-0.5">
        <NavLink to="/" end className={linkClass} onClick={() => setOpen(false)}>
          <Gauge className="size-4 shrink-0" aria-hidden />
          Tableau de bord
        </NavLink>
        <NavLink to="/messages" className={linkClass} onClick={() => setOpen(false)}>
          <Mail className="size-4 shrink-0" aria-hidden />
          Messages
          {stats?.messages_unread ? (
            <Badge tone="brand" className="ml-auto">
              {stats.messages_unread}
            </Badge>
          ) : null}
        </NavLink>
        <NavLink to="/media" className={linkClass} onClick={() => setOpen(false)}>
          <ImageIcon className="size-4 shrink-0" aria-hidden />
          Médias
        </NavLink>
      </div>

      {RESOURCE_GROUPS.map((group) => (
        <div key={group} className="flex flex-col gap-0.5">
          <p className="px-3 pb-1 text-[10px] font-semibold tracking-[0.12em] text-[var(--color-ink-subtle)] uppercase">
            {group}
          </p>
          {RESOURCES.filter((resource) => resource.group === group).map((resource) => (
            <NavLink
              key={resource.key}
              to={`/r/${resource.key}`}
              className={linkClass}
              onClick={() => setOpen(false)}
            >
              <resource.icon className="size-4 shrink-0" aria-hidden />
              {resource.label}
            </NavLink>
          ))}
        </div>
      ))}

      <div className="flex flex-col gap-0.5">
        <p className="px-3 pb-1 text-[10px] font-semibold tracking-[0.12em] text-[var(--color-ink-subtle)] uppercase">
          Administration
        </p>
        <NavLink to="/settings" className={linkClass} onClick={() => setOpen(false)}>
          <SettingsIcon className="size-4 shrink-0" aria-hidden />
          Paramètres du site
        </NavLink>
        <NavLink to="/team" className={linkClass} onClick={() => setOpen(false)}>
          <Users className="size-4 shrink-0" aria-hidden />
          Accès & invitations
        </NavLink>
        <NavLink to="/audit" className={linkClass} onClick={() => setOpen(false)}>
          <ScrollText className="size-4 shrink-0" aria-hidden />
          Journal d&apos;activité
        </NavLink>
      </div>
    </nav>
  );

  return (
    <div className="flex h-full">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-[var(--color-line)] bg-[var(--color-panel)] lg:flex">
        <Brand />
        {nav}
        <UserBox onLogout={logout} theme={theme} />
      </aside>

      {/* Mobile drawer */}
      {open ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Fermer le menu"
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <aside className="relative flex h-full w-72 flex-col border-r border-[var(--color-line)] bg-[var(--color-panel)]">
            <Brand />
            {nav}
            <UserBox onLogout={logout} theme={theme} />
          </aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-[var(--color-line)] bg-[var(--color-panel)] px-4">
          <button
            type="button"
            onClick={() => setOpen((current) => !current)}
            aria-label="Menu"
            className="rounded-md p-2 text-[var(--color-ink-muted)] lg:hidden"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>

          <div className="ml-auto flex items-center gap-2">
            <a
              href={SITE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-[var(--color-ink-muted)] hover:bg-[var(--color-panel-alt)]"
            >
              Voir le site
              <ExternalLink className="size-3.5" aria-hidden />
            </a>
            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Changer de thème"
              className="rounded-lg p-2 text-[var(--color-ink-muted)] hover:bg-[var(--color-panel-alt)]"
            >
              {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </button>
            {user ? (
              <span className="hidden text-sm text-[var(--color-ink-muted)] sm:inline">
                {user.full_name}
              </span>
            ) : null}
          </div>
        </header>

        <main className="min-w-0 flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="mx-auto max-w-6xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

function Brand() {
  return (
    <div className="flex h-14 shrink-0 items-center gap-2.5 border-b border-[var(--color-line)] px-4">
      <span
        aria-hidden
        className="grid size-7 place-items-center rounded-md bg-[var(--color-brand)] text-[11px] font-bold text-white"
      >
        AK
      </span>
      <span className="font-semibold">Administration</span>
    </div>
  );
}

function UserBox({ onLogout, theme: _theme }: { onLogout: () => void; theme: string }) {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <div className="shrink-0 border-t border-[var(--color-line)] p-3">
      <div className="mb-2 flex items-center gap-2">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[var(--color-brand-soft)] text-xs font-semibold text-[var(--color-brand-ink)]">
          {user.full_name
            .split(" ")
            .slice(0, 2)
            .map((part) => part[0])
            .join("")
            .toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{user.full_name}</p>
          <p className="truncate text-xs text-[var(--color-ink-subtle)]">
            {ROLE_LABELS[user.role]}
          </p>
        </div>
      </div>
      <Button variant="ghost" size="sm" className="w-full justify-start" onClick={onLogout}>
        <LogOut className="size-3.5" />
        Se déconnecter
      </Button>
    </div>
  );
}
