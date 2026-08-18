/**
 * Declarative registry mirroring the backend's admin resources.
 *
 * Each entry drives the generic list view *and* the generic form, so adding a
 * managed entity is a config change here — not a new page.
 */

import {
  Award,
  BookOpen,
  Briefcase,
  Building2,
  FolderGit2,
  GraduationCap,
  Languages,
  LayoutList,
  Link2,
  ListOrdered,
  Mic,
  PlaySquare,
  Quote,
  Sigma,
  Sparkles,
  Tags,
  Video,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type FieldType =
  | "text"
  | "textarea"
  | "markdown"
  | "number"
  | "boolean"
  | "date"
  | "datetime"
  | "select"
  | "stringList"
  | "highlights"
  | "links"
  | "metrics"
  | "json"
  | "image"
  | "color"
  | "relation"
  | "relationMulti";

export interface FieldDef {
  name: string;
  label: string;
  type: FieldType;
  /** Renders FR/EN tabs and maps to `<name>_fr` / `<name>_en`. */
  bilingual?: boolean;
  required?: boolean;
  help?: string;
  placeholder?: string;
  options?: { value: string; label: string }[];
  /** For `relation` / `relationMulti`: the resource key to load choices from. */
  relation?: string;
  min?: number;
  max?: number;
  group?: string;
  half?: boolean;
  /** Auto-fills a slug from this field when creating. */
  slugFrom?: string;
}

export interface ColumnDef {
  name: string;
  label: string;
  type?: "text" | "badge" | "boolean" | "date" | "image" | "tags" | "number";
  bilingual?: boolean;
  width?: string;
}

export interface ResourceDef {
  key: string;
  path: string;
  label: string;
  singular: string;
  icon: LucideIcon;
  group: string;
  columns: ColumnDef[];
  fields: FieldDef[];
  reorderable?: boolean;
  searchable?: boolean;
  filters?: { name: string; label: string; options: { value: string; label: string }[] }[];
  labelField?: string;
  defaults?: Record<string, unknown>;
}

const STATUS_OPTIONS = [
  { value: "draft", label: "Brouillon" },
  { value: "published", label: "Publié" },
  { value: "archived", label: "Archivé" },
];

const CATEGORY_OPTIONS = [
  { value: "data-engineering", label: "Data Engineering" },
  { value: "machine-learning", label: "Machine Learning" },
  { value: "mlops", label: "MLOps" },
  { value: "analytics", label: "Analytics" },
  { value: "web", label: "Web" },
  { value: "open-source", label: "Open source" },
  { value: "other", label: "Autre" },
];

const TALK_TYPE_OPTIONS = [
  { value: "workshop", label: "Atelier" },
  { value: "course", label: "Cours" },
  { value: "talk", label: "Conférence" },
  { value: "meetup", label: "Meetup" },
  { value: "conference", label: "Conférence (événement)" },
  { value: "webinar", label: "Webinaire" },
  { value: "mentoring", label: "Mentorat" },
  { value: "podcast", label: "Podcast" },
];

const SECTION_TYPE_OPTIONS = [
  { value: "hero", label: "Hero (en-tête)" },
  { value: "stats", label: "Chiffres clés" },
  { value: "about", label: "À propos" },
  { value: "experience", label: "Expériences" },
  { value: "skills", label: "Compétences" },
  { value: "projects", label: "Réalisations" },
  { value: "talks", label: "Formations" },
  { value: "playlists", label: "Playlists" },
  { value: "certifications", label: "Certifications" },
  { value: "education", label: "Formation suivie" },
  { value: "blog", label: "Blog" },
  { value: "testimonials", label: "Recommandations" },
  { value: "contact", label: "Contact" },
  { value: "cta", label: "Appel à l'action" },
  { value: "markdown", label: "Texte libre (Markdown)" },
  { value: "custom", label: "Personnalisée" },
];

const VISIBILITY: FieldDef[] = [
  {
    name: "is_visible",
    label: "Visible sur le site",
    type: "boolean",
    group: "Publication",
    half: true,
  },
  { name: "position", label: "Ordre", type: "number", group: "Publication", half: true },
];

const SEO_FIELDS: FieldDef[] = [
  { name: "seo_title", label: "Titre SEO", type: "text", bilingual: true, group: "SEO" },
  {
    name: "seo_description",
    label: "Description SEO",
    type: "textarea",
    bilingual: true,
    group: "SEO",
    help: "155 caractères environ, affichés dans les résultats Google.",
  },
];

export const RESOURCES: ResourceDef[] = [
  /* ------------------------------------------------------------ contenus */
  {
    key: "projects",
    path: "/admin/projects",
    label: "Réalisations",
    singular: "réalisation",
    icon: FolderGit2,
    group: "Contenus",
    reorderable: true,
    searchable: true,
    labelField: "title_fr",
    filters: [
      { name: "status", label: "Statut", options: STATUS_OPTIONS },
      { name: "category", label: "Catégorie", options: CATEGORY_OPTIONS },
    ],
    defaults: { status: "draft", category: "data-engineering", is_visible: true, tech: [] },
    columns: [
      { name: "title", label: "Titre", bilingual: true },
      { name: "category", label: "Catégorie", type: "badge" },
      { name: "status", label: "Statut", type: "badge" },
      { name: "is_featured", label: "À la une", type: "boolean" },
      { name: "updated_at", label: "Modifié", type: "date" },
    ],
    fields: [
      { name: "title", label: "Titre", type: "text", bilingual: true, required: true },
      {
        name: "slug",
        label: "Slug (URL)",
        type: "text",
        required: true,
        slugFrom: "title_fr",
        help: "Minuscules, chiffres et tirets uniquement.",
      },
      { name: "summary", label: "Résumé", type: "textarea", bilingual: true },
      { name: "content", label: "Contenu", type: "markdown", bilingual: true },

      { name: "category", label: "Catégorie", type: "select", options: CATEGORY_OPTIONS, half: true, group: "Classement" },
      { name: "status", label: "Statut", type: "select", options: STATUS_OPTIONS, half: true, group: "Classement" },
      { name: "tags", label: "Tags", type: "relationMulti", relation: "tags", group: "Classement" },
      { name: "tech", label: "Technologies", type: "stringList", group: "Classement" },
      { name: "is_featured", label: "Mettre à la une", type: "boolean", group: "Classement" },

      { name: "cover_url", label: "Image de couverture", type: "image", group: "Médias" },
      { name: "thumbnail_url", label: "Vignette", type: "image", group: "Médias" },
      { name: "video_url", label: "Vidéo (YouTube)", type: "text", group: "Médias" },

      { name: "repo_url", label: "Dépôt GitHub", type: "text", half: true, group: "Liens" },
      { name: "demo_url", label: "Démo en ligne", type: "text", half: true, group: "Liens" },
      { name: "article_url", label: "Article associé", type: "text", half: true, group: "Liens" },
      { name: "links", label: "Liens additionnels", type: "links", group: "Liens" },

      { name: "role", label: "Rôle tenu", type: "text", bilingual: true, group: "Contexte" },
      { name: "client", label: "Client", type: "text", half: true, group: "Contexte" },
      { name: "started_at", label: "Début", type: "date", half: true, group: "Contexte" },
      { name: "finished_at", label: "Fin", type: "date", half: true, group: "Contexte" },
      { name: "published_at", label: "Publié le", type: "datetime", half: true, group: "Contexte" },
      { name: "metrics", label: "Résultats chiffrés", type: "metrics", group: "Contexte" },

      ...SEO_FIELDS,
      ...VISIBILITY,
    ],
  },
  {
    key: "posts",
    path: "/admin/posts",
    label: "Articles",
    singular: "article",
    icon: BookOpen,
    group: "Contenus",
    searchable: true,
    labelField: "title_fr",
    filters: [{ name: "status", label: "Statut", options: STATUS_OPTIONS }],
    defaults: { status: "draft", is_visible: true },
    columns: [
      { name: "title", label: "Titre", bilingual: true },
      { name: "status", label: "Statut", type: "badge" },
      { name: "reading_minutes", label: "Lecture", type: "number" },
      { name: "view_count", label: "Vues", type: "number" },
      { name: "published_at", label: "Publié", type: "date" },
    ],
    fields: [
      { name: "title", label: "Titre", type: "text", bilingual: true, required: true },
      { name: "slug", label: "Slug (URL)", type: "text", required: true, slugFrom: "title_fr" },
      {
        name: "excerpt",
        label: "Accroche",
        type: "textarea",
        bilingual: true,
        help: "Laissée vide, elle est générée depuis le contenu.",
      },
      { name: "content", label: "Contenu", type: "markdown", bilingual: true },

      { name: "status", label: "Statut", type: "select", options: STATUS_OPTIONS, half: true, group: "Publication" },
      { name: "published_at", label: "Date de publication", type: "datetime", half: true, group: "Publication" },
      { name: "is_featured", label: "Mettre à la une", type: "boolean", group: "Publication" },
      { name: "tags", label: "Tags", type: "relationMulti", relation: "tags", group: "Publication" },

      { name: "cover_url", label: "Image de couverture", type: "image", group: "Médias" },
      { name: "cover_alt", label: "Texte alternatif", type: "text", bilingual: true, group: "Médias" },

      { name: "canonical_url", label: "URL canonique", type: "text", half: true, group: "Liens" },
      { name: "external_url", label: "Publié ailleurs (URL)", type: "text", half: true, group: "Liens" },

      ...SEO_FIELDS,
      ...VISIBILITY,
    ],
  },
  {
    key: "tags",
    path: "/admin/tags",
    label: "Tags",
    singular: "tag",
    icon: Tags,
    group: "Contenus",
    reorderable: true,
    searchable: true,
    labelField: "name_fr",
    defaults: { is_visible: true },
    columns: [
      { name: "name", label: "Nom", bilingual: true },
      { name: "slug", label: "Slug" },
      { name: "color", label: "Couleur", type: "badge" },
    ],
    fields: [
      { name: "name", label: "Nom", type: "text", bilingual: true, required: true },
      { name: "slug", label: "Slug", type: "text", required: true, slugFrom: "name_fr" },
      { name: "color", label: "Couleur", type: "color", half: true },
      { name: "description", label: "Description", type: "textarea", bilingual: true },
      ...VISIBILITY,
    ],
  },

  /* ------------------------------------------------------------- parcours */
  {
    key: "experiences",
    path: "/admin/experiences",
    label: "Expériences",
    singular: "expérience",
    icon: Briefcase,
    group: "Parcours",
    reorderable: true,
    searchable: true,
    labelField: "company",
    defaults: { is_visible: true, highlights: [], tech: [] },
    columns: [
      { name: "company", label: "Entreprise" },
      { name: "role", label: "Poste", bilingual: true },
      { name: "start_date", label: "Début", type: "date" },
      { name: "is_current", label: "En cours", type: "boolean" },
    ],
    fields: [
      { name: "company", label: "Entreprise", type: "text", required: true, half: true },
      { name: "employment_type", label: "Type de contrat", type: "text", half: true },
      { name: "role", label: "Poste", type: "text", bilingual: true, required: true },
      { name: "location", label: "Lieu", type: "text", half: true },
      { name: "company_url", label: "Site de l'entreprise", type: "text", half: true },
      { name: "company_logo_url", label: "Logo", type: "image" },

      { name: "start_date", label: "Date de début", type: "date", required: true, half: true, group: "Période" },
      { name: "end_date", label: "Date de fin", type: "date", half: true, group: "Période" },
      { name: "is_current", label: "Poste actuel", type: "boolean", group: "Période" },

      { name: "summary", label: "Résumé", type: "textarea", bilingual: true, group: "Détail" },
      { name: "highlights", label: "Réalisations clés", type: "highlights", group: "Détail" },
      { name: "tech", label: "Technologies", type: "stringList", group: "Détail" },
      { name: "is_featured", label: "Mettre en avant", type: "boolean", group: "Détail" },
      ...VISIBILITY,
    ],
  },
  {
    key: "education",
    path: "/admin/education",
    label: "Formations suivies",
    singular: "formation",
    icon: GraduationCap,
    group: "Parcours",
    reorderable: true,
    searchable: true,
    labelField: "school",
    defaults: { is_visible: true },
    columns: [
      { name: "school", label: "Établissement" },
      { name: "degree", label: "Diplôme", bilingual: true },
      { name: "end_year", label: "Fin", type: "number" },
    ],
    fields: [
      { name: "school", label: "Établissement", type: "text", required: true },
      { name: "degree", label: "Diplôme", type: "text", bilingual: true, required: true },
      { name: "field", label: "Spécialité", type: "text", bilingual: true },
      { name: "location", label: "Lieu", type: "text", half: true },
      { name: "school_url", label: "Site de l'établissement", type: "text", half: true },
      { name: "school_logo_url", label: "Logo", type: "image" },
      { name: "start_year", label: "Année de début", type: "number", half: true },
      { name: "end_year", label: "Année de fin", type: "number", half: true },
      { name: "description", label: "Description", type: "textarea", bilingual: true },
      ...VISIBILITY,
    ],
  },
  {
    key: "certifications",
    path: "/admin/certifications",
    label: "Certifications",
    singular: "certification",
    icon: Award,
    group: "Parcours",
    reorderable: true,
    searchable: true,
    labelField: "name",
    defaults: { is_visible: true },
    columns: [
      { name: "name", label: "Certification" },
      { name: "issuer", label: "Organisme" },
      { name: "issued_at", label: "Obtenue", type: "date" },
      { name: "is_featured", label: "En avant", type: "boolean" },
    ],
    fields: [
      { name: "name", label: "Nom", type: "text", required: true },
      { name: "issuer", label: "Organisme", type: "text", required: true, half: true },
      { name: "credential_id", label: "Identifiant", type: "text", half: true },
      { name: "issued_at", label: "Date d'obtention", type: "date", half: true },
      { name: "expires_at", label: "Date d'expiration", type: "date", half: true },
      { name: "credential_url", label: "Lien de vérification", type: "text" },
      { name: "issuer_logo_url", label: "Logo de l'organisme", type: "image" },
      { name: "description", label: "Description", type: "textarea", bilingual: true },
      { name: "is_featured", label: "Mettre en avant", type: "boolean" },
      ...VISIBILITY,
    ],
  },
  {
    key: "skill-categories",
    path: "/admin/skill-categories",
    label: "Catégories de compétences",
    singular: "catégorie",
    icon: Sparkles,
    group: "Parcours",
    reorderable: true,
    searchable: true,
    labelField: "name_fr",
    defaults: { is_visible: true },
    columns: [
      { name: "name", label: "Catégorie", bilingual: true },
      { name: "slug", label: "Slug" },
    ],
    fields: [
      { name: "name", label: "Nom", type: "text", bilingual: true, required: true },
      { name: "slug", label: "Slug", type: "text", required: true, slugFrom: "name_fr" },
      { name: "icon", label: "Icône", type: "text", half: true },
      { name: "description", label: "Description", type: "textarea", bilingual: true },
      ...VISIBILITY,
    ],
  },
  {
    key: "skills",
    path: "/admin/skills",
    label: "Compétences",
    singular: "compétence",
    icon: Wrench,
    group: "Parcours",
    reorderable: true,
    searchable: true,
    labelField: "name",
    defaults: { is_visible: true, level: 4 },
    columns: [
      { name: "name", label: "Compétence" },
      { name: "level", label: "Niveau", type: "number" },
      { name: "is_featured", label: "En avant", type: "boolean" },
    ],
    fields: [
      { name: "name", label: "Nom", type: "text", required: true, half: true },
      {
        name: "category_id",
        label: "Catégorie",
        type: "relation",
        relation: "skill-categories",
        half: true,
      },
      { name: "level", label: "Niveau (1 à 5)", type: "number", min: 1, max: 5, half: true },
      { name: "years_experience", label: "Années d'expérience", type: "number", half: true },
      { name: "icon", label: "Icône", type: "text", half: true },
      { name: "url", label: "Lien", type: "text", half: true },
      { name: "is_featured", label: "Mettre en avant", type: "boolean" },
      ...VISIBILITY,
    ],
  },
  {
    key: "languages",
    path: "/admin/languages",
    label: "Langues",
    singular: "langue",
    icon: Languages,
    group: "Parcours",
    reorderable: true,
    labelField: "name_fr",
    defaults: { is_visible: true },
    columns: [
      { name: "name", label: "Langue", bilingual: true },
      { name: "level", label: "Niveau", bilingual: true },
      { name: "cefr", label: "CECRL" },
    ],
    fields: [
      { name: "name", label: "Langue", type: "text", bilingual: true, required: true },
      { name: "level", label: "Niveau", type: "text", bilingual: true, required: true },
      { name: "cefr", label: "Niveau CECRL", type: "text", half: true },
      ...VISIBILITY,
    ],
  },

  /* ----------------------------------------------------------- communauté */
  {
    key: "talks",
    path: "/admin/talks",
    label: "Formations & interventions",
    singular: "intervention",
    icon: Mic,
    group: "Communauté",
    reorderable: true,
    searchable: true,
    labelField: "title_fr",
    filters: [{ name: "type", label: "Type", options: TALK_TYPE_OPTIONS }],
    defaults: { is_visible: true, type: "workshop", language: "fr", topics: [] },
    columns: [
      { name: "title", label: "Titre", bilingual: true },
      { name: "type", label: "Type", type: "badge" },
      { name: "event_name", label: "Événement" },
      { name: "event_date", label: "Date", type: "date" },
    ],
    fields: [
      { name: "title", label: "Titre", type: "text", bilingual: true, required: true },
      { name: "slug", label: "Slug", type: "text", required: true, slugFrom: "title_fr" },
      { name: "type", label: "Type", type: "select", options: TALK_TYPE_OPTIONS, half: true },
      {
        name: "organization_id",
        label: "Organisation",
        type: "relation",
        relation: "organizations",
        half: true,
      },
      { name: "event_name", label: "Nom de l'événement", type: "text", half: true },
      { name: "language", label: "Langue", type: "text", half: true },

      { name: "abstract", label: "Résumé court", type: "textarea", bilingual: true, group: "Contenu" },
      { name: "description", label: "Description", type: "markdown", bilingual: true, group: "Contenu" },
      { name: "topics", label: "Sujets abordés", type: "stringList", group: "Contenu" },

      { name: "event_date", label: "Date", type: "date", half: true, group: "Logistique" },
      { name: "end_date", label: "Date de fin", type: "date", half: true, group: "Logistique" },
      { name: "location", label: "Lieu", type: "text", half: true, group: "Logistique" },
      { name: "is_online", label: "En ligne", type: "boolean", half: true, group: "Logistique" },
      { name: "audience_size", label: "Participants", type: "number", half: true, group: "Logistique" },
      { name: "duration_minutes", label: "Durée (minutes)", type: "number", half: true, group: "Logistique" },

      { name: "cover_url", label: "Image", type: "image", group: "Ressources" },
      { name: "slides_url", label: "Slides", type: "text", half: true, group: "Ressources" },
      { name: "video_url", label: "Vidéo", type: "text", half: true, group: "Ressources" },
      { name: "repo_url", label: "Dépôt de support", type: "text", half: true, group: "Ressources" },
      { name: "event_url", label: "Page de l'événement", type: "text", half: true, group: "Ressources" },
      { name: "is_featured", label: "Mettre en avant", type: "boolean", group: "Ressources" },
      ...VISIBILITY,
    ],
  },
  {
    key: "organizations",
    path: "/admin/organizations",
    label: "Organisations",
    singular: "organisation",
    icon: Building2,
    group: "Communauté",
    reorderable: true,
    searchable: true,
    labelField: "name",
    defaults: { is_visible: true },
    columns: [
      { name: "name", label: "Nom" },
      { name: "role", label: "Rôle", bilingual: true },
      { name: "is_featured", label: "En avant", type: "boolean" },
    ],
    fields: [
      { name: "name", label: "Nom", type: "text", required: true, half: true },
      { name: "slug", label: "Slug", type: "text", required: true, slugFrom: "name", half: true },
      { name: "role", label: "Rôle tenu", type: "text", bilingual: true },
      { name: "description", label: "Description", type: "textarea", bilingual: true },
      { name: "url", label: "Site web", type: "text", half: true },
      { name: "since", label: "Depuis", type: "date", half: true },
      { name: "logo_url", label: "Logo", type: "image" },
      { name: "is_featured", label: "Mettre en avant", type: "boolean" },
      ...VISIBILITY,
    ],
  },
  {
    key: "playlists",
    path: "/admin/playlists",
    label: "Playlists vidéo",
    singular: "playlist",
    icon: PlaySquare,
    group: "Communauté",
    reorderable: true,
    searchable: true,
    labelField: "title_fr",
    defaults: { is_visible: true, provider: "youtube", topics: [] },
    columns: [
      { name: "title", label: "Titre", bilingual: true },
      { name: "provider", label: "Plateforme", type: "badge" },
      { name: "video_count", label: "Vidéos", type: "number" },
    ],
    fields: [
      { name: "title", label: "Titre", type: "text", bilingual: true, required: true },
      { name: "slug", label: "Slug", type: "text", required: true, slugFrom: "title_fr" },
      { name: "url", label: "URL de la playlist", type: "text", required: true },
      { name: "provider", label: "Plateforme", type: "text", half: true },
      { name: "external_id", label: "Identifiant externe", type: "text", half: true },
      { name: "description", label: "Description", type: "textarea", bilingual: true },
      { name: "thumbnail_url", label: "Miniature", type: "image" },
      { name: "video_count", label: "Nombre de vidéos", type: "number", half: true },
      { name: "level", label: "Niveau", type: "text", half: true },
      { name: "topics", label: "Sujets", type: "stringList" },
      { name: "is_featured", label: "Mettre en avant", type: "boolean" },
      ...VISIBILITY,
    ],
  },
  {
    key: "videos",
    path: "/admin/videos",
    label: "Vidéos",
    singular: "vidéo",
    icon: Video,
    group: "Communauté",
    reorderable: true,
    searchable: true,
    labelField: "title",
    defaults: { is_visible: true },
    columns: [
      { name: "title", label: "Titre" },
      { name: "published_at", label: "Publiée", type: "date" },
    ],
    fields: [
      { name: "title", label: "Titre", type: "text", required: true },
      { name: "url", label: "URL", type: "text", required: true },
      {
        name: "playlist_id",
        label: "Playlist",
        type: "relation",
        relation: "playlists",
        half: true,
      },
      { name: "external_id", label: "Identifiant vidéo", type: "text", half: true },
      { name: "description", label: "Description", type: "textarea" },
      { name: "thumbnail_url", label: "Miniature", type: "image" },
      { name: "duration_seconds", label: "Durée (secondes)", type: "number", half: true },
      { name: "published_at", label: "Date de publication", type: "date", half: true },
      ...VISIBILITY,
    ],
  },

  /* ---------------------------------------------------------------- site */
  {
    key: "sections",
    path: "/admin/sections",
    label: "Sections du site",
    singular: "section",
    icon: LayoutList,
    group: "Apparence",
    reorderable: true,
    searchable: true,
    labelField: "key",
    defaults: { is_visible: true, type: "custom", config: {} },
    columns: [
      { name: "key", label: "Clé" },
      { name: "title", label: "Titre", bilingual: true },
      { name: "type", label: "Type", type: "badge" },
      { name: "is_visible", label: "Visible", type: "boolean" },
    ],
    fields: [
      {
        name: "key",
        label: "Clé technique",
        type: "text",
        required: true,
        half: true,
        help: "Identifiant unique, utilisé comme ancre (#) sur la page d'accueil.",
      },
      { name: "type", label: "Type de section", type: "select", options: SECTION_TYPE_OPTIONS, half: true },
      { name: "title", label: "Titre", type: "text", bilingual: true },
      { name: "subtitle", label: "Sous-titre", type: "textarea", bilingual: true },
      {
        name: "content",
        label: "Contenu libre (Markdown)",
        type: "markdown",
        bilingual: true,
        help: "Utilisé par les sections de type « Texte libre » et « Personnalisée ».",
      },
      { name: "max_items", label: "Nombre d'éléments affichés", type: "number", half: true },
      { name: "background", label: "Fond", type: "text", half: true },
      { name: "config", label: "Options avancées (JSON)", type: "json" },
      ...VISIBILITY,
    ],
  },
  {
    key: "nav-items",
    path: "/admin/nav-items",
    label: "Navigation",
    singular: "lien",
    icon: ListOrdered,
    group: "Apparence",
    reorderable: true,
    labelField: "label_fr",
    defaults: { is_visible: true, location: "header" },
    columns: [
      { name: "label", label: "Libellé", bilingual: true },
      { name: "href", label: "Lien" },
      { name: "location", label: "Emplacement", type: "badge" },
    ],
    fields: [
      { name: "label", label: "Libellé", type: "text", bilingual: true, required: true },
      { name: "href", label: "Lien", type: "text", required: true, half: true },
      {
        name: "location",
        label: "Emplacement",
        type: "select",
        half: true,
        options: [
          { value: "header", label: "En-tête" },
          { value: "footer", label: "Pied de page" },
        ],
      },
      { name: "is_external", label: "Lien externe", type: "boolean", half: true },
      { name: "icon", label: "Icône", type: "text", half: true },
      ...VISIBILITY,
    ],
  },
  {
    key: "socials",
    path: "/admin/socials",
    label: "Liens sociaux",
    singular: "lien social",
    icon: Link2,
    group: "Apparence",
    reorderable: true,
    labelField: "label",
    defaults: { is_visible: true, show_in_footer: true, show_in_hero: true },
    columns: [
      { name: "label", label: "Plateforme" },
      { name: "url", label: "URL" },
      { name: "show_in_header", label: "En-tête", type: "boolean" },
    ],
    fields: [
      { name: "platform", label: "Plateforme", type: "text", required: true, half: true },
      { name: "label", label: "Libellé affiché", type: "text", required: true, half: true },
      { name: "url", label: "URL", type: "text", required: true },
      { name: "handle", label: "Identifiant / pseudo", type: "text", half: true },
      {
        name: "icon",
        label: "Icône",
        type: "select",
        half: true,
        options: [
          { value: "github", label: "GitHub" },
          { value: "linkedin", label: "LinkedIn" },
          { value: "youtube", label: "YouTube" },
          { value: "twitter", label: "X / Twitter" },
          { value: "mail", label: "Email" },
          { value: "phone", label: "Téléphone" },
        ],
      },
      { name: "show_in_header", label: "Afficher dans l'en-tête", type: "boolean", half: true },
      { name: "show_in_hero", label: "Afficher dans le hero", type: "boolean", half: true },
      { name: "show_in_footer", label: "Afficher dans le pied de page", type: "boolean", half: true },
      ...VISIBILITY,
    ],
  },
  {
    key: "stats",
    path: "/admin/stats",
    label: "Chiffres clés",
    singular: "chiffre",
    icon: Sigma,
    group: "Apparence",
    reorderable: true,
    labelField: "label_fr",
    defaults: { is_visible: true },
    columns: [
      { name: "label", label: "Libellé", bilingual: true },
      { name: "value", label: "Valeur" },
    ],
    fields: [
      { name: "key", label: "Clé technique", type: "text", required: true, half: true },
      { name: "value", label: "Valeur", type: "text", required: true, half: true },
      { name: "label", label: "Libellé", type: "text", bilingual: true, required: true },
      { name: "suffix", label: "Suffixe (ex. +)", type: "text", half: true },
      { name: "icon", label: "Icône", type: "text", half: true },
      ...VISIBILITY,
    ],
  },
  {
    key: "testimonials",
    path: "/admin/testimonials",
    label: "Recommandations",
    singular: "recommandation",
    icon: Quote,
    group: "Apparence",
    reorderable: true,
    searchable: true,
    labelField: "author_name",
    defaults: { is_visible: true },
    columns: [
      { name: "author_name", label: "Auteur" },
      { name: "company", label: "Entreprise" },
      { name: "is_featured", label: "En avant", type: "boolean" },
    ],
    fields: [
      { name: "author_name", label: "Nom de l'auteur", type: "text", required: true, half: true },
      { name: "company", label: "Entreprise", type: "text", half: true },
      { name: "author_role", label: "Poste", type: "text", bilingual: true },
      { name: "quote", label: "Témoignage", type: "textarea", bilingual: true },
      { name: "avatar_url", label: "Photo", type: "image" },
      { name: "source_url", label: "Lien source", type: "text" },
      { name: "is_featured", label: "Mettre en avant", type: "boolean" },
      ...VISIBILITY,
    ],
  },
];

export const RESOURCE_GROUPS = ["Contenus", "Parcours", "Communauté", "Apparence"];

export function findResource(key: string): ResourceDef | undefined {
  return RESOURCES.find((resource) => resource.key === key);
}
