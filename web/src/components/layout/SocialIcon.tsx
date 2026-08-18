import { Github, Globe, Linkedin, Mail, Phone, Twitter, Youtube } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  github: Github,
  linkedin: Linkedin,
  youtube: Youtube,
  twitter: Twitter,
  x: Twitter,
  mail: Mail,
  email: Mail,
  phone: Phone,
  whatsapp: Phone,
};

/** Falls back to a globe so a newly added platform never renders empty. */
export function SocialIcon({ name, className }: { name?: string | null; className?: string }) {
  const Icon = ICONS[(name ?? "").toLowerCase()] ?? Globe;
  return <Icon className={className} aria-hidden />;
}
