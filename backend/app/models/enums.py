"""Enumerations shared by models, schemas and the admin UI."""

from __future__ import annotations

from enum import StrEnum


class UserRole(StrEnum):
    """Ordered from most to least privileged — see `ROLE_LEVEL`."""

    OWNER = "owner"
    ADMIN = "admin"
    EDITOR = "editor"
    VIEWER = "viewer"


ROLE_LEVEL: dict[str, int] = {
    UserRole.OWNER: 40,
    UserRole.ADMIN: 30,
    UserRole.EDITOR: 20,
    UserRole.VIEWER: 10,
}


class ContentStatus(StrEnum):
    DRAFT = "draft"
    PUBLISHED = "published"
    ARCHIVED = "archived"


class SectionType(StrEnum):
    HERO = "hero"
    ABOUT = "about"
    EXPERIENCE = "experience"
    EDUCATION = "education"
    SKILLS = "skills"
    PROJECTS = "projects"
    BLOG = "blog"
    TALKS = "talks"
    PLAYLISTS = "playlists"
    CERTIFICATIONS = "certifications"
    TESTIMONIALS = "testimonials"
    STATS = "stats"
    CONTACT = "contact"
    CTA = "cta"
    MARKDOWN = "markdown"
    GALLERY = "gallery"
    CUSTOM = "custom"


class TalkType(StrEnum):
    TALK = "talk"
    WORKSHOP = "workshop"
    COURSE = "course"
    MEETUP = "meetup"
    CONFERENCE = "conference"
    WEBINAR = "webinar"
    MENTORING = "mentoring"
    PODCAST = "podcast"


class ProjectCategory(StrEnum):
    DATA_ENGINEERING = "data-engineering"
    MACHINE_LEARNING = "machine-learning"
    MLOPS = "mlops"
    ANALYTICS = "analytics"
    WEB = "web"
    OPEN_SOURCE = "open-source"
    OTHER = "other"


class MediaFolder(StrEnum):
    AVATARS = "avatars"
    PROJECTS = "projects"
    POSTS = "posts"
    TALKS = "talks"
    LOGOS = "logos"
    DOCUMENTS = "documents"
    GENERAL = "general"


class AuditAction(StrEnum):
    CREATE = "create"
    UPDATE = "update"
    DELETE = "delete"
    LOGIN = "login"
    LOGOUT = "logout"
    INVITE = "invite"
    REORDER = "reorder"
    UPLOAD = "upload"
    PUBLISH = "publish"
