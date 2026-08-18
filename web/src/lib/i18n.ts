import type { Locale } from "@/lib/types";

export const locales: Locale[] = ["fr", "en"];
export const defaultLocale: Locale = "fr";

export function isLocale(value: string): value is Locale {
  return (locales as string[]).includes(value);
}

/**
 * Reads the right half of a bilingual record.
 *
 * The API returns both languages in one payload (one cache entry serves both),
 * so picking a language is a pure client-side lookup with a fallback.
 */
export function pick(entity: object | null | undefined, field: string, locale: Locale): string {
  if (!entity) return "";
  // Interfaces have no index signature, so the lookup goes through a cast.
  const record = entity as Record<string, unknown>;
  const primary = record[`${field}_${locale}`];
  if (typeof primary === "string" && primary.trim()) return primary;
  const fallback = record[`${field}_${locale === "fr" ? "en" : "fr"}`];
  return typeof fallback === "string" ? fallback : "";
}

const dictionaries = {
  fr: {
    "nav.home": "Accueil",
    "nav.about": "Parcours",
    "nav.projects": "Réalisations",
    "nav.blog": "Blog",
    "nav.talks": "Formations",
    "nav.contact": "Contact",
    "nav.menu": "Menu",
    "nav.close": "Fermer",

    "hero.cta.projects": "Voir mes réalisations",
    "hero.cta.contact": "Me contacter",
    "hero.cta.resume": "Télécharger le CV",
    "hero.available": "Disponible",

    "common.readMore": "Lire la suite",
    "common.viewAll": "Tout voir",
    "common.backTo": "Retour à",
    "common.loading": "Chargement…",
    "common.present": "Aujourd'hui",
    "common.minRead": "min de lecture",
    "common.views": "vues",
    "common.noResults": "Aucun résultat pour le moment.",
    "common.filterAll": "Tous",
    "common.search": "Rechercher",
    "common.previous": "Précédent",
    "common.next": "Suivant",
    "common.page": "Page",
    "common.of": "sur",
    "common.publishedOn": "Publié le",
    "common.updatedOn": "Mis à jour le",
    "common.language": "Langue",
    "common.theme": "Thème",

    "projects.title": "Réalisations",
    "projects.subtitle": "Projets data & IA, du prototype à la production.",
    "projects.code": "Code source",
    "projects.demo": "Démo",
    "projects.article": "Article",
    "projects.stack": "Stack technique",
    "projects.role": "Rôle",
    "projects.client": "Client",
    "projects.period": "Période",
    "projects.related": "Autres réalisations",
    "projects.filterCategory": "Catégorie",

    "blog.title": "Blog",
    "blog.subtitle": "Notes de terrain sur la data, l'IA et l'ingénierie.",
    "blog.related": "Articles similaires",
    "blog.readOriginal": "Lire l'article original",

    "talks.title": "Formations & interventions",
    "talks.subtitle": "Ce que j'enseigne, et où.",
    "talks.slides": "Slides",
    "talks.video": "Vidéo",
    "talks.repo": "Support",
    "talks.event": "Événement",
    "talks.online": "En ligne",
    "talks.audience": "participants",
    "talks.playlists": "Playlists vidéo",
    "talks.watchPlaylist": "Voir la playlist",
    "talks.videos": "vidéos",

    "talkType.talk": "Conférence",
    "talkType.workshop": "Atelier",
    "talkType.course": "Cours",
    "talkType.meetup": "Meetup",
    "talkType.conference": "Conférence",
    "talkType.webinar": "Webinaire",
    "talkType.mentoring": "Mentorat",
    "talkType.podcast": "Podcast",

    "about.experience": "Expérience professionnelle",
    "about.education": "Formation",
    "about.certifications": "Certifications",
    "about.skills": "Compétences",
    "about.languages": "Langues",
    "about.communities": "Communautés",
    "about.credential": "Voir le certificat",

    "contact.title": "Travaillons ensemble",
    "contact.name": "Nom",
    "contact.email": "Email",
    "contact.company": "Entreprise (optionnel)",
    "contact.subject": "Sujet",
    "contact.message": "Message",
    "contact.send": "Envoyer le message",
    "contact.sending": "Envoi en cours…",
    "contact.success": "Message envoyé, merci ! Je reviens vers vous rapidement.",
    "contact.error": "L'envoi a échoué. Réessayez ou écrivez-moi directement par email.",
    "contact.required": "Champ obligatoire",
    "contact.invalidEmail": "Adresse email invalide",
    "contact.tooShort": "Message trop court (10 caractères minimum)",
    "contact.directEmail": "Ou écrivez-moi directement",

    "footer.builtWith": "Site conçu et développé par Abraham Z. KOLOBOE",
    "footer.rights": "Tous droits réservés",
    "footer.navigation": "Navigation",
    "footer.elsewhere": "Ailleurs",

    "error.notFound": "Page introuvable",
    "error.notFoundText": "Cette page n'existe pas ou a été déplacée.",
    "error.backHome": "Retour à l'accueil",
    "error.generic": "Une erreur est survenue",
    "error.retry": "Réessayer",
    "error.offline":
      "Le site ne parvient pas à joindre l'API. Vérifiez que le backend est démarré.",
  },
  en: {
    "nav.home": "Home",
    "nav.about": "Career",
    "nav.projects": "Work",
    "nav.blog": "Blog",
    "nav.talks": "Teaching",
    "nav.contact": "Contact",
    "nav.menu": "Menu",
    "nav.close": "Close",

    "hero.cta.projects": "See my work",
    "hero.cta.contact": "Get in touch",
    "hero.cta.resume": "Download résumé",
    "hero.available": "Available",

    "common.readMore": "Read more",
    "common.viewAll": "View all",
    "common.backTo": "Back to",
    "common.loading": "Loading…",
    "common.present": "Present",
    "common.minRead": "min read",
    "common.views": "views",
    "common.noResults": "Nothing here yet.",
    "common.filterAll": "All",
    "common.search": "Search",
    "common.previous": "Previous",
    "common.next": "Next",
    "common.page": "Page",
    "common.of": "of",
    "common.publishedOn": "Published on",
    "common.updatedOn": "Updated on",
    "common.language": "Language",
    "common.theme": "Theme",

    "projects.title": "Selected work",
    "projects.subtitle": "Data & AI projects, from prototype to production.",
    "projects.code": "Source code",
    "projects.demo": "Live demo",
    "projects.article": "Article",
    "projects.stack": "Tech stack",
    "projects.role": "Role",
    "projects.client": "Client",
    "projects.period": "Period",
    "projects.related": "More work",
    "projects.filterCategory": "Category",

    "blog.title": "Blog",
    "blog.subtitle": "Field notes on data, AI and engineering.",
    "blog.related": "Related articles",
    "blog.readOriginal": "Read the original article",

    "talks.title": "Teaching & talks",
    "talks.subtitle": "What I teach, and where.",
    "talks.slides": "Slides",
    "talks.video": "Video",
    "talks.repo": "Materials",
    "talks.event": "Event",
    "talks.online": "Online",
    "talks.audience": "attendees",
    "talks.playlists": "Video playlists",
    "talks.watchPlaylist": "Watch playlist",
    "talks.videos": "videos",

    "talkType.talk": "Talk",
    "talkType.workshop": "Workshop",
    "talkType.course": "Course",
    "talkType.meetup": "Meetup",
    "talkType.conference": "Conference",
    "talkType.webinar": "Webinar",
    "talkType.mentoring": "Mentoring",
    "talkType.podcast": "Podcast",

    "about.experience": "Professional experience",
    "about.education": "Education",
    "about.certifications": "Certifications",
    "about.skills": "Skills",
    "about.languages": "Languages",
    "about.communities": "Communities",
    "about.credential": "View credential",

    "contact.title": "Let's work together",
    "contact.name": "Name",
    "contact.email": "Email",
    "contact.company": "Company (optional)",
    "contact.subject": "Subject",
    "contact.message": "Message",
    "contact.send": "Send message",
    "contact.sending": "Sending…",
    "contact.success": "Message sent, thank you! I'll get back to you shortly.",
    "contact.error": "Sending failed. Try again or email me directly.",
    "contact.required": "Required field",
    "contact.invalidEmail": "Invalid email address",
    "contact.tooShort": "Message too short (10 characters minimum)",
    "contact.directEmail": "Or email me directly",

    "footer.builtWith": "Designed and built by Abraham Z. KOLOBOE",
    "footer.rights": "All rights reserved",
    "footer.navigation": "Navigation",
    "footer.elsewhere": "Elsewhere",

    "error.notFound": "Page not found",
    "error.notFoundText": "This page does not exist or has been moved.",
    "error.backHome": "Back to home",
    "error.generic": "Something went wrong",
    "error.retry": "Try again",
    "error.offline": "The site cannot reach the API. Check that the backend is running.",
  },
} as const;

export type TranslationKey = keyof (typeof dictionaries)["fr"];

export function getDictionary(locale: Locale) {
  return dictionaries[locale];
}

/** `t("nav.home")` — falls back to the key itself if a translation is missing. */
export function translator(locale: Locale) {
  const dict = dictionaries[locale];
  return (key: TranslationKey): string => dict[key] ?? key;
}
