import { Globe, Mail, Phone } from "lucide-react";
import type { ComponentType } from "react";

import {
  GithubIcon,
  LinkedinIcon,
  XIcon,
  YoutubeIcon,
} from "@/components/layout/BrandIcons";

type IconComponent = ComponentType<{ className?: string }>;

const ICONS: Record<string, IconComponent> = {
  github: GithubIcon,
  linkedin: LinkedinIcon,
  youtube: YoutubeIcon,
  twitter: XIcon,
  x: XIcon,
  mail: Mail,
  email: Mail,
  phone: Phone,
  whatsapp: Phone,
};

/** Falls back to a globe so a newly added platform never renders empty. */
export function SocialIcon({ name, className }: { name?: string | null; className?: string }) {
  const Icon = ICONS[(name ?? "").toLowerCase()] ?? Globe;
  return <Icon className={className} />;
}
