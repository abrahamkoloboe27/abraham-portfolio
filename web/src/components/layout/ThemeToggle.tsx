"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useSyncExternalStore } from "react";

import { cn } from "@/lib/utils";

type Mode = "light" | "dark" | "system";

const MODES: { value: Mode; icon: typeof Sun }[] = [
  { value: "light", icon: Sun },
  { value: "dark", icon: Moon },
  { value: "system", icon: Monitor },
];

const STORAGE_KEY = "theme";
const CHANGE_EVENT = "portfolio:themechange";

export function applyTheme(mode: Mode) {
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const dark = mode === "dark" || (mode === "system" && prefersDark);
  document.documentElement.classList.toggle("dark", dark);
  document.documentElement.style.colorScheme = dark ? "dark" : "light";
}

function readMode(): Mode {
  return (localStorage.getItem(STORAGE_KEY) as Mode | null) ?? "system";
}

function writeMode(mode: Mode) {
  localStorage.setItem(STORAGE_KEY, mode);
  applyTheme(mode);
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** localStorage is an external store — subscribing avoids setState-in-effect. */
function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

export function ThemeToggle({ label }: { label: string }) {
  // The server has no preference to report, so it always renders "system".
  const mode = useSyncExternalStore(subscribe, readMode, () => "system" as Mode);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (readMode() === "system") applyTheme("system");
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  return (
    <div
      role="group"
      aria-label={label}
      className="inline-flex items-center gap-0.5 rounded-lg border border-[var(--color-border)] p-0.5"
    >
      {MODES.map(({ value, icon: Icon }) => (
        <button
          key={value}
          type="button"
          onClick={() => writeMode(value)}
          aria-label={value}
          aria-pressed={mode === value}
          className={cn(
            "rounded-md p-1.5 transition-colors",
            mode === value
              ? "bg-[var(--color-accent-soft)] text-[var(--color-accent-ink)]"
              : "text-[var(--color-ink-subtle)] hover:text-[var(--color-ink)]",
          )}
        >
          <Icon className="size-4" aria-hidden />
        </button>
      ))}
    </div>
  );
}

/**
 * Runs before paint so the stored theme is applied without a flash of the
 * wrong palette. Kept as a string because it must execute synchronously.
 */
export const themeScript = `
(function() {
  try {
    var mode = localStorage.getItem('${STORAGE_KEY}') || 'system';
    var dark = mode === 'dark' || (mode === 'system' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (dark) {
      document.documentElement.classList.add('dark');
      document.documentElement.style.colorScheme = 'dark';
    }
  } catch (e) {}
})();
`;
