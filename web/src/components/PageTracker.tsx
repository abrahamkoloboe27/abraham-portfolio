"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

import { api } from "@/lib/api";
import type { Locale } from "@/lib/types";

/**
 * Cookie-free view counter feeding the admin dashboard.
 *
 * The API derives a daily-rotating visitor hash server-side; nothing
 * identifying is sent from the browser and nothing is stored locally.
 */
export function PageTracker({
  locale,
  entityType,
  entityId,
}: {
  locale: Locale;
  entityType?: string;
  entityId?: string;
}) {
  const pathname = usePathname();
  const lastTracked = useRef<string | null>(null);

  useEffect(() => {
    if (lastTracked.current === pathname) return;
    lastTracked.current = pathname;

    void api.track({
      path: pathname,
      locale,
      entity_type: entityType,
      entity_id: entityId,
      referrer: document.referrer || undefined,
    });
  }, [pathname, locale, entityType, entityId]);

  return null;
}
