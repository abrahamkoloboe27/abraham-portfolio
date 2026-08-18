/** Mirrors the Pydantic schemas exposed by the FastAPI backend. */

export type Locale = "fr" | "en";

export type ContentStatus = "draft" | "published" | "archived";

export type SectionType =
  | "hero"
  | "about"
  | "experience"
  | "education"
  | "skills"
  | "projects"
  | "blog"
  | "talks"
  | "playlists"
  | "certifications"
  | "testimonials"
  | "stats"
  | "contact"
  | "cta"
  | "markdown"
  | "gallery"
  | "custom";

export type TalkType =
  | "talk"
  | "workshop"
  | "course"
  | "meetup"
  | "conference"
  | "webinar"
  | "mentoring"
  | "podcast";

export interface Ordered {
  id: string;
  position: number;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
}

export interface SiteSettings {
  id: string;
  site_name: string;
  full_name: string;
  job_title_fr?: string | null;
  job_title_en?: string | null;
  tagline_fr?: string | null;
  tagline_en?: string | null;
  bio_fr?: string | null;
  bio_en?: string | null;
  quote_fr?: string | null;
  quote_en?: string | null;
  email?: string | null;
  phone?: string | null;
  location?: string | null;
  timezone?: string | null;
  availability_fr?: string | null;
  availability_en?: string | null;
  is_open_to_work?: boolean | null;
  calendar_url?: string | null;
  avatar_url?: string | null;
  logo_url?: string | null;
  favicon_url?: string | null;
  og_image_url?: string | null;
  resume_url_fr?: string | null;
  resume_url_en?: string | null;
  seo_title_fr?: string | null;
  seo_title_en?: string | null;
  seo_description_fr?: string | null;
  seo_description_en?: string | null;
  seo_keywords?: string[] | null;
  theme?: Record<string, unknown> | null;
  default_locale?: string | null;
  available_locales?: string[] | null;
  analytics?: Record<string, unknown> | null;
  features?: Record<string, boolean> | null;
  maintenance_mode?: boolean | null;
  footer_note_fr?: string | null;
  footer_note_en?: string | null;
}

export interface Section extends Ordered {
  key: string;
  type: SectionType;
  title_fr?: string | null;
  title_en?: string | null;
  subtitle_fr?: string | null;
  subtitle_en?: string | null;
  content_fr?: string | null;
  content_en?: string | null;
  config?: Record<string, unknown> | null;
  background?: string | null;
  max_items?: number | null;
}

export interface NavItem extends Ordered {
  label_fr: string;
  label_en: string;
  href: string;
  location: string;
  is_external: boolean;
  icon?: string | null;
}

export interface SocialLink extends Ordered {
  platform: string;
  label: string;
  url: string;
  handle?: string | null;
  icon?: string | null;
  show_in_header: boolean;
  show_in_footer: boolean;
  show_in_hero: boolean;
}

export interface Stat extends Ordered {
  key: string;
  label_fr: string;
  label_en: string;
  value: string;
  suffix?: string | null;
  icon?: string | null;
}

export interface Highlight {
  fr?: string;
  en?: string;
}

export interface Experience extends Ordered {
  company: string;
  company_url?: string | null;
  company_logo_url?: string | null;
  role_fr: string;
  role_en: string;
  employment_type?: string | null;
  location?: string | null;
  start_date: string;
  end_date?: string | null;
  is_current: boolean;
  summary_fr?: string | null;
  summary_en?: string | null;
  highlights: Highlight[];
  tech: string[];
  is_featured: boolean;
}

export interface Education extends Ordered {
  school: string;
  school_url?: string | null;
  school_logo_url?: string | null;
  degree_fr: string;
  degree_en: string;
  field_fr?: string | null;
  field_en?: string | null;
  location?: string | null;
  start_year?: number | null;
  end_year?: number | null;
  description_fr?: string | null;
  description_en?: string | null;
}

export interface Certification extends Ordered {
  name: string;
  issuer: string;
  issuer_logo_url?: string | null;
  issued_at?: string | null;
  expires_at?: string | null;
  credential_id?: string | null;
  credential_url?: string | null;
  description_fr?: string | null;
  description_en?: string | null;
  is_featured: boolean;
}

export interface Skill extends Ordered {
  name: string;
  level: number;
  icon?: string | null;
  url?: string | null;
  years_experience?: number | null;
  is_featured: boolean;
  category_id?: string | null;
}

export interface SkillCategory extends Ordered {
  slug: string;
  name_fr: string;
  name_en: string;
  icon?: string | null;
  description_fr?: string | null;
  description_en?: string | null;
  skills: Skill[];
}

export interface Language extends Ordered {
  name_fr: string;
  name_en: string;
  level_fr: string;
  level_en: string;
  cefr?: string | null;
}

export interface Tag extends Ordered {
  slug: string;
  name_fr: string;
  name_en: string;
  color?: string | null;
  description_fr?: string | null;
  description_en?: string | null;
  count?: number;
}

export interface ProjectLink {
  label: string;
  url: string;
  icon?: string;
}

export interface Metric {
  label_fr?: string;
  label_en?: string;
  value: string;
}

export interface ProjectSummary extends Ordered {
  slug: string;
  title_fr: string;
  title_en: string;
  summary_fr?: string | null;
  summary_en?: string | null;
  category: string;
  status: ContentStatus;
  is_featured: boolean;
  cover_url?: string | null;
  thumbnail_url?: string | null;
  repo_url?: string | null;
  demo_url?: string | null;
  tech: string[];
  metrics: Metric[];
  started_at?: string | null;
  finished_at?: string | null;
  published_at?: string | null;
  view_count: number;
  tags: Tag[];
}

export interface Project extends ProjectSummary {
  content_fr?: string | null;
  content_en?: string | null;
  gallery: { url: string; alt?: string }[];
  video_url?: string | null;
  article_url?: string | null;
  links: ProjectLink[];
  role_fr?: string | null;
  role_en?: string | null;
  client?: string | null;
  seo_title_fr?: string | null;
  seo_title_en?: string | null;
  seo_description_fr?: string | null;
  seo_description_en?: string | null;
}

export interface PostSummary extends Ordered {
  slug: string;
  title_fr: string;
  title_en: string;
  excerpt_fr?: string | null;
  excerpt_en?: string | null;
  status: ContentStatus;
  is_featured: boolean;
  cover_url?: string | null;
  published_at?: string | null;
  reading_minutes: number;
  view_count: number;
  external_url?: string | null;
  tags: Tag[];
}

export interface Post extends PostSummary {
  content_fr?: string | null;
  content_en?: string | null;
  cover_alt_fr?: string | null;
  cover_alt_en?: string | null;
  canonical_url?: string | null;
  seo_title_fr?: string | null;
  seo_title_en?: string | null;
  seo_description_fr?: string | null;
  seo_description_en?: string | null;
}

export interface Organization extends Ordered {
  slug: string;
  name: string;
  role_fr?: string | null;
  role_en?: string | null;
  description_fr?: string | null;
  description_en?: string | null;
  logo_url?: string | null;
  url?: string | null;
  since?: string | null;
  is_featured: boolean;
}

export interface Talk extends Ordered {
  slug: string;
  title_fr: string;
  title_en: string;
  type: TalkType;
  event_name?: string | null;
  organization_id?: string | null;
  organization?: Organization | null;
  description_fr?: string | null;
  description_en?: string | null;
  abstract_fr?: string | null;
  abstract_en?: string | null;
  event_date?: string | null;
  end_date?: string | null;
  location?: string | null;
  is_online: boolean;
  language: string;
  audience_size?: number | null;
  duration_minutes?: number | null;
  cover_url?: string | null;
  slides_url?: string | null;
  video_url?: string | null;
  repo_url?: string | null;
  event_url?: string | null;
  gallery: { url: string; alt?: string }[];
  topics: string[];
  is_featured: boolean;
}

export interface Video extends Ordered {
  title: string;
  description?: string | null;
  external_id?: string | null;
  url: string;
  thumbnail_url?: string | null;
  duration_seconds?: number | null;
  published_at?: string | null;
  playlist_id?: string | null;
}

export interface Playlist extends Ordered {
  slug: string;
  title_fr: string;
  title_en: string;
  description_fr?: string | null;
  description_en?: string | null;
  provider: string;
  external_id?: string | null;
  url: string;
  thumbnail_url?: string | null;
  video_count?: number | null;
  level?: string | null;
  topics: string[];
  is_featured: boolean;
  videos: Video[];
}

export interface Testimonial extends Ordered {
  author_name: string;
  author_role_fr?: string | null;
  author_role_en?: string | null;
  company?: string | null;
  avatar_url?: string | null;
  quote_fr?: string | null;
  quote_en?: string | null;
  source_url?: string | null;
  is_featured: boolean;
}

export interface SiteBundle {
  settings: SiteSettings;
  sections: Section[];
  nav: NavItem[];
  socials: SocialLink[];
  stats: Stat[];
  experiences: Experience[];
  education: Education[];
  certifications: Certification[];
  skill_categories: SkillCategory[];
  languages: Language[];
  organizations: Organization[];
  featured_projects: ProjectSummary[];
  latest_posts: PostSummary[];
  featured_talks: Talk[];
  playlists: Playlist[];
  testimonials: Testimonial[];
  tags: Tag[];
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}
