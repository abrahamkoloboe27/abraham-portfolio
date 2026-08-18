"""Import every model so Alembic's autogenerate sees the full metadata."""

from app.db.base import Base
from app.models.community import Organization, Playlist, Talk, Video
from app.models.content import Post, Project, Tag, post_tags, project_tags
from app.models.enums import (
    ROLE_LEVEL,
    AuditAction,
    ContentStatus,
    MediaFolder,
    ProjectCategory,
    SectionType,
    TalkType,
    UserRole,
)
from app.models.media import ContactMessage, MediaAsset, PageView
from app.models.resume import (
    Certification,
    Education,
    Experience,
    Language,
    Skill,
    SkillCategory,
)
from app.models.site import NavItem, Section, SiteSettings, SocialLink, Stat, Testimonial
from app.models.user import AuditLog, Invitation, RefreshToken, User

__all__ = [
    "ROLE_LEVEL",
    "AuditAction",
    "AuditLog",
    "Base",
    "Certification",
    "ContactMessage",
    "ContentStatus",
    "Education",
    "Experience",
    "Invitation",
    "Language",
    "MediaAsset",
    "MediaFolder",
    "NavItem",
    "Organization",
    "PageView",
    "Playlist",
    "Post",
    "Project",
    "ProjectCategory",
    "RefreshToken",
    "Section",
    "SectionType",
    "SiteSettings",
    "Skill",
    "SkillCategory",
    "SocialLink",
    "Stat",
    "Tag",
    "Talk",
    "TalkType",
    "Testimonial",
    "User",
    "UserRole",
    "Video",
    "post_tags",
    "project_tags",
]
