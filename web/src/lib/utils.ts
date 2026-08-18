import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

import type { Locale } from "@/lib/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const LOCALE_TAG: Record<Locale, string> = { fr: "fr-FR", en: "en-GB" };

export function formatDate(
  value: string | null | undefined,
  locale: Locale,
  options: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" },
): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(LOCALE_TAG[locale], options).format(date);
}

export function formatMonthYear(value: string | null | undefined, locale: Locale): string {
  return formatDate(value, locale, { month: "long", year: "numeric" });
}

/** "déc. 2025 — aujourd'hui" */
export function formatPeriod(
  start: string | null | undefined,
  end: string | null | undefined,
  locale: Locale,
  presentLabel: string,
): string {
  const from = formatDate(start, locale, { month: "short", year: "numeric" });
  const to = end ? formatDate(end, locale, { month: "short", year: "numeric" }) : presentLabel;
  return from ? `${from} — ${to}` : to;
}

export function formatNumber(value: number, locale: Locale): string {
  return new Intl.NumberFormat(LOCALE_TAG[locale]).format(value);
}

export function absoluteUrl(path: string): string {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Turns any YouTube URL (video or playlist) into an embeddable one. */
export function youtubeEmbed(url: string): string | null {
  const playlist = url.match(/[?&]list=([A-Za-z0-9_-]+)/);
  if (playlist) return `https://www.youtube.com/embed/videoseries?list=${playlist[1]}`;
  const video =
    url.match(/[?&]v=([A-Za-z0-9_-]{11})/) ?? url.match(/youtu\.be\/([A-Za-z0-9_-]{11})/);
  return video ? `https://www.youtube.com/embed/${video[1]}` : null;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
