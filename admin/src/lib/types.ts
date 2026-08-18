export type Role = "owner" | "admin" | "editor" | "viewer";

export const ROLE_LEVEL: Record<Role, number> = {
  owner: 40,
  admin: 30,
  editor: 20,
  viewer: 10,
};

export const ROLE_LABELS: Record<Role, string> = {
  owner: "Propriétaire",
  admin: "Administrateur",
  editor: "Éditeur",
  viewer: "Lecteur",
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  owner: "Contrôle total, y compris la suppression d'accès.",
  admin: "Gère les contenus et invite des membres.",
  editor: "Crée et modifie tous les contenus.",
  viewer: "Consultation seule de l'administration.",
};

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  avatar_url?: string | null;
  is_active: boolean;
  locale: string;
  last_login_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface Invitation {
  id: string;
  email: string;
  role: Role;
  status: "pending" | "accepted" | "revoked";
  expires_at: string;
  accepted_at?: string | null;
  message?: string | null;
  invited_by_id?: string | null;
  invite_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Session {
  id: string;
  created_at: string;
  expires_at: string;
  revoked_at?: string | null;
  user_agent?: string | null;
  ip_address?: string | null;
}

export interface AuditEntry {
  id: string;
  created_at: string;
  actor_id?: string | null;
  actor_email?: string | null;
  action: string;
  entity_type: string;
  entity_id?: string | null;
  entity_label?: string | null;
  changes?: Record<string, unknown> | null;
  ip_address?: string | null;
}

export interface MediaAsset {
  id: string;
  filename: string;
  storage_key: string;
  url: string;
  mime_type: string;
  size_bytes: number;
  width?: number | null;
  height?: number | null;
  folder: string;
  alt_fr?: string | null;
  alt_en?: string | null;
  caption_fr?: string | null;
  caption_en?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  company?: string | null;
  subject?: string | null;
  message: string;
  locale: string;
  is_read: boolean;
  is_archived: boolean;
  is_spam: boolean;
  replied_at?: string | null;
  notes?: string | null;
  ip_address?: string | null;
  referrer?: string | null;
  created_at: string;
  updated_at: string;
}

export interface DashboardStats {
  projects_total: number;
  projects_published: number;
  posts_total: number;
  posts_published: number;
  talks_total: number;
  playlists_total: number;
  media_total: number;
  messages_total: number;
  messages_unread: number;
  users_total: number;
  views_30d: number;
  views_7d: number;
  visitors_30d: number;
  views_timeseries: { date: string; value: number }[];
  top_pages: { label: string; value: number; href?: string | null }[];
  top_referrers: { label: string; value: number }[];
  recent_messages: ContactMessage[];
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

/** Every managed entity carries at least these fields. */
export interface Entity {
  id: string;
  created_at: string;
  updated_at: string;
  position?: number;
  is_visible?: boolean;
  [key: string]: unknown;
}
