import { notFound } from "next/navigation";

import { SectionRenderer } from "@/components/sections/blocks";
import { api } from "@/lib/api";
import { isLocale } from "@/lib/i18n";

export const revalidate = 300;

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  // `null` when the API is unreachable at build time — the layout then renders
  // its own "API unavailable" state instead of failing the whole build.
  const bundle = await api.siteBundleSafe();
  if (!bundle) return null;

  return <SectionRenderer bundle={bundle} locale={locale} />;
}
