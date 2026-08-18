import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { notFound } from "next/navigation";

import "@/app/globals.css";

import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { themeScript } from "@/components/layout/ThemeToggle";
import { PageTracker } from "@/components/PageTracker";
import { api } from "@/lib/api";
import { isLocale, locales, pick, translator } from "@/lib/i18n";
import type { Locale, SiteBundle } from "@/lib/types";
import { absoluteUrl } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono-stack",
  display: "swap",
});

export const revalidate = 300;

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1120" },
  ],
  width: "device-width",
  initialScale: 1,
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};

  let bundle: SiteBundle | null = null;
  try {
    bundle = await api.siteBundle();
  } catch {
    // The API may be cold on a fresh deploy — never fail the whole render for metadata.
  }

  const settings = bundle?.settings;
  const title = settings ? pick(settings, "seo_title", locale) || settings.site_name : "Portfolio";
  const description = settings ? pick(settings, "seo_description", locale) : "";

  return {
    metadataBase: new URL(absoluteUrl("/")),
    title: { default: title, template: `%s — ${settings?.site_name ?? title}` },
    description,
    keywords: settings?.seo_keywords ?? undefined,
    authors: [{ name: settings?.full_name ?? "Abraham Z. KOLOBOE" }],
    creator: settings?.full_name,
    alternates: {
      canonical: `/${locale}`,
      languages: Object.fromEntries(locales.map((code) => [code, `/${code}`])),
      types: {
        "application/rss+xml": `/api/v1/rss.xml?locale=${locale}`,
      },
    },
    openGraph: {
      type: "website",
      locale: locale === "fr" ? "fr_FR" : "en_GB",
      url: `/${locale}`,
      siteName: settings?.site_name,
      title,
      description,
      images: settings?.og_image_url ? [{ url: settings.og_image_url }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: settings?.og_image_url ? [settings.og_image_url] : undefined,
    },
    robots: { index: true, follow: true },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const typedLocale = locale as Locale;
  const t = translator(typedLocale);

  let bundle: SiteBundle | null = null;
  try {
    bundle = await api.siteBundle();
  } catch {
    bundle = null;
  }

  const jsonLd = bundle
    ? {
        "@context": "https://schema.org",
        "@type": "Person",
        name: bundle.settings.full_name,
        jobTitle: pick(bundle.settings, "job_title", typedLocale),
        email: bundle.settings.email ? `mailto:${bundle.settings.email}` : undefined,
        url: absoluteUrl(`/${locale}`),
        image: bundle.settings.avatar_url ?? undefined,
        address: bundle.settings.location
          ? { "@type": "PostalAddress", addressLocality: bundle.settings.location }
          : undefined,
        sameAs: bundle.socials.filter((s) => s.url.startsWith("http")).map((s) => s.url),
        knowsAbout: bundle.skill_categories.flatMap((category) =>
          category.skills.map((skill) => skill.name),
        ),
        alumniOf: bundle.education.map((item) => ({
          "@type": "EducationalOrganization",
          name: item.school,
        })),
        worksFor: bundle.experiences
          .filter((item) => item.is_current)
          .map((item) => ({ "@type": "Organization", name: item.company })),
      }
    : null;

  return (
    <html lang={locale} suppressHydrationWarning className={`${inter.variable} ${mono.variable}`}>
      <head>
        {/* Applies the stored theme before first paint to avoid a flash. */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="flex min-h-dvh flex-col">
        <a href="#main" className="skip-link">
          {t("nav.menu")}
        </a>

        {bundle ? (
          <Header
            locale={typedLocale}
            nav={bundle.nav}
            socials={bundle.socials}
            settings={bundle.settings}
          />
        ) : null}

        <main id="main" className="flex-1">
          {bundle ? (
            children
          ) : (
            <div className="container-page py-24 text-center">
              <h1 className="text-2xl font-semibold">{t("error.generic")}</h1>
              <p className="mt-3 text-[var(--color-ink-muted)]">{t("error.offline")}</p>
            </div>
          )}
        </main>

        {bundle ? (
          <Footer
            locale={typedLocale}
            nav={bundle.nav}
            socials={bundle.socials}
            settings={bundle.settings}
          />
        ) : null}

        {jsonLd ? (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
          />
        ) : null}
        <PageTracker locale={typedLocale} />
      </body>
    </html>
  );
}
