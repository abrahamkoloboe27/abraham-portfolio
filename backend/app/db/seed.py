"""Seed the database with Abraham's real career data.

Idempotent: every record is matched on its natural key (slug / key / company),
so re-running updates instead of duplicating. Safe to call on every deploy.

    python -m app.db.seed          # create/refresh reference data
    python -m app.db.seed --reset  # drop and recreate everything first
"""

from __future__ import annotations

import argparse
import asyncio
from datetime import UTC, date, datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.logging import configure_logging, get_logger
from app.core.security import hash_password
from app.db.base import Base
from app.db.session import SessionLocal, engine
from app.models.community import Organization, Playlist, Talk
from app.models.content import Post, Project, Tag
from app.models.enums import (
    ContentStatus,
    ProjectCategory,
    SectionType,
    TalkType,
    UserRole,
)
from app.models.resume import (
    Certification,
    Education,
    Experience,
    Language,
    Skill,
    SkillCategory,
)
from app.models.site import NavItem, Section, SiteSettings, SocialLink, Stat
from app.models.user import User

logger = get_logger("seed")

GITHUB = "https://github.com/abrahamkoloboe27"
LINKEDIN = (
    "https://www.linkedin.com/in/"
    "abraham-zacharie-koloboe-data-science-ia-generative-llms-machine-learning/"
)
YOUTUBE_CHANNEL = "https://www.youtube.com/@abrahamkoloboe978"
PLAYLIST_PYTHONBENIN = "https://www.youtube.com/playlist?list=PLqbY091OZLLCIQ1XIgz5YTvtlA0Vd-yQ5"
PLAYLIST_WORKSHOP_DE = "https://www.youtube.com/playlist?list=PL-Wrfjk3ZE__frLErCrX3_Z0XwAU9EXGC"


async def upsert(db: AsyncSession, model: Any, match: dict[str, Any], **values: Any) -> Any:
    """Fetch by natural key, then create or refresh."""
    stmt = select(model)
    for field, value in match.items():
        stmt = stmt.where(getattr(model, field) == value)
    obj = (await db.execute(stmt.limit(1))).scalar_one_or_none()
    if obj is None:
        obj = model(**match, **values)
        db.add(obj)
    else:
        for key, value in values.items():
            setattr(obj, key, value)
    return obj


# ---------------------------------------------------------------------- users
async def seed_users(db: AsyncSession) -> User:
    owner = (
        await db.execute(select(User).where(User.email == settings.FIRST_SUPERUSER_EMAIL.lower()))
    ).scalar_one_or_none()
    if owner is None:
        owner = User(
            email=settings.FIRST_SUPERUSER_EMAIL.lower(),
            full_name=settings.FIRST_SUPERUSER_NAME,
            hashed_password=hash_password(settings.FIRST_SUPERUSER_PASSWORD),
            role=UserRole.OWNER,
            is_active=True,
        )
        db.add(owner)
        logger.info("seed.owner.created", email=owner.email)
    else:
        owner.role = UserRole.OWNER
        owner.is_active = True
    return owner


# ------------------------------------------------------------------- settings
async def seed_settings(db: AsyncSession) -> None:
    bio_fr = (
        "Data Engineer chez Gozem, je construis et j'opère des pipelines analytiques sur GCP "
        "(BigQuery, Dataform, Airflow) : des données brutes aux tables fiables que les analyses "
        "exploitent chaque jour. J'aime les architectures simples, documentées et peu coûteuses. "
        "En parallèle, je forme et j'interviens régulièrement sur les sujets Data & IA au Bénin "
        "(Python Bénin, Africa TechUp Tour)."
    )
    bio_en = (
        "Data Engineer at Gozem, I build and operate analytics pipelines on GCP (BigQuery, "
        "Dataform, Airflow): from raw data to the reliable tables analysts rely on every day. "
        "I favour simple, documented and cost-efficient architectures. Alongside that, I teach "
        "and speak regularly about Data & AI in Benin (Python Bénin, Africa TechUp Tour)."
    )

    await upsert(
        db,
        SiteSettings,
        {"is_singleton": True},
        site_name="Abraham Z. KOLOBOE",
        full_name="Sèdjro Abraham Zacharie KOLOBOE",
        job_title_fr="Cloud Data Engineer · ML Engineer",
        job_title_en="Cloud Data Engineer · ML Engineer",
        tagline_fr="Je transforme vos données brutes en produits analytiques fiables.",
        tagline_en="I turn raw data into reliable analytics products.",
        bio_fr=bio_fr,
        bio_en=bio_en,
        quote_fr="« Donnez-moi vos données, j'en fais un moteur d'innovation. »",
        quote_en="“Give me your data, I'll turn it into an engine for innovation.”",
        email="abklb27@gmail.com",
        phone="+229 01 91 83 84 21",
        location="Cotonou / Abomey-Calavi, Bénin",
        timezone="Africa/Porto-Novo",
        availability_fr="Ouvert aux missions freelance et aux collaborations Data/IA",
        availability_en="Open to freelance work and Data/AI collaborations",
        is_open_to_work=True,
        seo_title_fr="Abraham Z. KOLOBOE — Cloud Data Engineer & ML Engineer",
        seo_title_en="Abraham Z. KOLOBOE — Cloud Data Engineer & ML Engineer",
        seo_description_fr=(
            "Portfolio d'Abraham Zacharie Koloboe : pipelines de données, BigQuery, Airflow, dbt, "
            "MLOps, formations Data & IA au Bénin."
        ),
        seo_description_en=(
            "Portfolio of Abraham Zacharie Koloboe: data pipelines, BigQuery, Airflow, dbt, "
            "MLOps, and Data & AI training in Benin."
        ),
        seo_keywords=[
            "Data Engineer",
            "Cloud Data Engineer",
            "BigQuery",
            "Apache Airflow",
            "dbt",
            "Dataform",
            "MLOps",
            "Bénin",
            "Cotonou",
            "Machine Learning",
        ],
        theme={"accent": "#2563eb", "radius": "lg", "mode": "system", "font": "inter"},
        default_locale="fr",
        available_locales=["fr", "en"],
        analytics={"provider": "internal"},
        features={"blog": True, "talks": True, "playlists": True, "contact": True},
        footer_note_fr="Construit avec FastAPI, Next.js et beaucoup de café.",
        footer_note_en="Built with FastAPI, Next.js and a lot of coffee.",
    )


async def seed_socials(db: AsyncSession) -> None:
    entries = [
        ("linkedin", "LinkedIn", LINKEDIN, "abraham-zacharie-koloboe", "linkedin", True),
        ("github", "GitHub", GITHUB, "abrahamkoloboe27", "github", True),
        ("youtube", "YouTube", YOUTUBE_CHANNEL, "@abrahamkoloboe978", "youtube", True),
        ("email", "Email", "mailto:abklb27@gmail.com", "abklb27@gmail.com", "mail", False),
        ("phone", "WhatsApp", "https://wa.me/2290191838421", "+229 01 91 83 84 21", "phone", False),
    ]
    for position, (platform, label, url, handle, icon, in_header) in enumerate(entries):
        await upsert(
            db,
            SocialLink,
            {"platform": platform},
            label=label,
            url=url,
            handle=handle,
            icon=icon,
            position=position,
            show_in_header=in_header,
            show_in_footer=True,
            show_in_hero=True,
            is_visible=True,
        )


async def seed_nav(db: AsyncSession) -> None:
    entries = [
        ("Parcours", "Career", "/about", "header"),
        ("Réalisations", "Work", "/projects", "header"),
        ("Formations", "Teaching", "/talks", "header"),
        ("Blog", "Blog", "/blog", "header"),
        ("Contact", "Contact", "/contact", "header"),
    ]
    for position, (label_fr, label_en, href, location) in enumerate(entries):
        await upsert(
            db,
            NavItem,
            {"href": href, "location": location},
            label_fr=label_fr,
            label_en=label_en,
            position=position,
            is_visible=True,
        )


async def seed_sections(db: AsyncSession) -> None:
    entries = [
        ("hero", SectionType.HERO, "Bonjour, moi c'est Abraham", "Hi, I'm Abraham", None, None),
        ("stats", SectionType.STATS, "En quelques chiffres", "By the numbers", None, None),
        (
            "about",
            SectionType.ABOUT,
            "À propos",
            "About",
            "Data Engineer, formateur et bâtisseur de pipelines",
            "Data engineer, teacher and pipeline builder",
        ),
        (
            "experience",
            SectionType.EXPERIENCE,
            "Parcours professionnel",
            "Professional experience",
            "Là où j'ai mis les mains dans la donnée",
            "Where I got my hands on the data",
        ),
        (
            "skills",
            SectionType.SKILLS,
            "Compétences techniques",
            "Technical skills",
            "La stack que j'utilise au quotidien",
            "The stack I use every day",
        ),
        (
            "projects",
            SectionType.PROJECTS,
            "Réalisations",
            "Selected work",
            "Projets data & IA, du prototype à la production",
            "Data & AI projects, from prototype to production",
        ),
        (
            "talks",
            SectionType.TALKS,
            "Formations & interventions",
            "Teaching & talks",
            "Python Bénin, Africa TechUp Tour, GrowUp AI, ENSGMM",
            "Python Bénin, Africa TechUp Tour, GrowUp AI, ENSGMM",
        ),
        (
            "playlists",
            SectionType.PLAYLISTS,
            "Mes playlists vidéo",
            "My video playlists",
            "Ateliers et cours filmés, en accès libre",
            "Recorded workshops and courses, freely available",
        ),
        (
            "certifications",
            SectionType.CERTIFICATIONS,
            "Certifications",
            "Certifications",
            None,
            None,
        ),
        ("education", SectionType.EDUCATION, "Formation", "Education", None, None),
        (
            "blog",
            SectionType.BLOG,
            "Derniers articles",
            "Latest articles",
            "Notes de terrain sur la data et l'IA",
            "Field notes on data and AI",
        ),
        (
            "contact",
            SectionType.CONTACT,
            "Travaillons ensemble",
            "Let's work together",
            "Une idée, un pipeline à construire, une formation à organiser ?",
            "An idea, a pipeline to build, a training to organise?",
        ),
    ]
    for position, (key, kind, title_fr, title_en, subtitle_fr, subtitle_en) in enumerate(entries):
        await upsert(
            db,
            Section,
            {"key": key},
            type=kind,
            title_fr=title_fr,
            title_en=title_en,
            subtitle_fr=subtitle_fr,
            subtitle_en=subtitle_en,
            position=position,
            is_visible=True,
            config={},
        )


async def seed_stats(db: AsyncSession) -> None:
    entries = [
        ("experience", "Années d'expérience data", "Years in data", "3", "+", "trending-up"),
        (
            "projects",
            "Projets data & IA publiés",
            "Data & AI projects shipped",
            "20",
            "+",
            "rocket",
        ),
        ("talks", "Formations et ateliers animés", "Trainings & workshops led", "12", "+", "users"),
        ("certifications", "Certifications obtenues", "Certifications earned", "8", "+", "award"),
    ]
    for position, (key, label_fr, label_en, value, suffix, icon) in enumerate(entries):
        await upsert(
            db,
            Stat,
            {"key": key},
            label_fr=label_fr,
            label_en=label_en,
            value=value,
            suffix=suffix,
            icon=icon,
            position=position,
        )


# ------------------------------------------------------------------- resume
async def seed_experiences(db: AsyncSession) -> None:
    entries = [
        {
            "match": {"company": "Gozem — Africa's Super App"},
            "company_url": "https://gozem.co",
            "role_fr": "Cloud Data Engineer",
            "role_en": "Cloud Data Engineer",
            "employment_type": "CDI",
            "location": "Cotonou, Bénin",
            "start_date": date(2025, 12, 1),
            "end_date": None,
            "is_current": True,
            "summary_fr": (
                "Je maintiens et fais évoluer la plateforme analytique GCP qui alimente les "
                "décisions transport, supply/demand et finance."
            ),
            "summary_en": (
                "I maintain and evolve the GCP analytics platform powering transport, "
                "supply/demand and finance decisions."
            ),
            "highlights": [
                {
                    "fr": "Maintenance et évolution des pipelines Dataform / BigQuery / Airflow : "
                    "modèles incrémentaux, déduplication, fiabilisation des sources MongoDB "
                    "répliquées.",
                    "en": "Maintaining and evolving Dataform / BigQuery / Airflow pipelines: "
                    "incremental models, deduplication, hardening of replicated MongoDB sources.",
                },
                {
                    "fr": "Conception et livraison de tables analytiques (transport, "
                    "supply/demand, finance) en collaboration quotidienne avec les data analysts.",
                    "en": "Designing and delivering analytics tables (transport, supply/demand, "
                    "finance) in daily collaboration with the data analysts.",
                },
                {
                    "fr": "Réduction des coûts BigQuery : tuning de requêtes, partitioning et "
                    "clustering des tables les plus sollicitées.",
                    "en": "Cutting BigQuery costs: query tuning, partitioning and clustering of "
                    "the most queried tables.",
                },
                {
                    "fr": "Templates réutilisables (DAGs, modèles SQLX), documentation et "
                    "onboarding des équipes consommatrices de données.",
                    "en": "Reusable templates (DAGs, SQLX models), documentation and onboarding "
                    "for data-consuming teams.",
                },
            ],
            "tech": ["BigQuery", "Dataform", "Apache Airflow", "GCP", "SQL", "Python", "MongoDB"],
            "is_featured": True,
        },
        {
            "match": {"company": "OpenSI / KKIAPAY"},
            "company_url": "https://kkiapay.me",
            "role_fr": "Data Scientist / Data Engineer",
            "role_en": "Data Scientist / Data Engineer",
            "employment_type": "CDI",
            "location": "Cotonou, Littoral, Bénin",
            "start_date": date(2024, 7, 1),
            "end_date": date(2025, 11, 30),
            "is_current": False,
            "summary_fr": (
                "Construction de la plateforme analytique de bout en bout et automatisation "
                "complète du reporting."
            ),
            "summary_en": (
                "Built the end-to-end analytics platform and fully automated reporting."
            ),
            "highlights": [
                {
                    "fr": "Mise en place d'une plateforme analytique de bout en bout : pipelines "
                    "ELT orchestrés avec Airflow et Docker, transformations Python (Pandas, "
                    "Polars), stockage PostgreSQL et MongoDB.",
                    "en": "End-to-end analytics platform: ELT pipelines orchestrated with Airflow "
                    "and Docker, Python transformations (Pandas, Polars), PostgreSQL and MongoDB "
                    "storage.",
                },
                {
                    "fr": "Automatisation du reporting : DAGs de génération et distribution de "
                    "rapports quotidiens et hebdomadaires (email, Google Chat), supprimant les "
                    "exports manuels.",
                    "en": "Automated reporting: DAGs generating and distributing daily and weekly "
                    "reports (email, Google Chat), removing manual exports entirely.",
                },
                {
                    "fr": "Tableaux de bord KPIs avec Streamlit et Looker Studio pour les équipes "
                    "commerciales et opérationnelles.",
                    "en": "KPI dashboards with Streamlit and Looker Studio for the sales and "
                    "operations teams.",
                },
            ],
            "tech": [
                "Apache Airflow",
                "Docker",
                "Python",
                "Pandas",
                "Polars",
                "PostgreSQL",
                "MongoDB",
                "Streamlit",
                "Looker Studio",
            ],
            "is_featured": True,
        },
        {
            "match": {"company": "Agence Nationale de Météorologie (METEO-BENIN)"},
            "company_url": None,
            "role_fr": "Stagiaire Data Science",
            "role_en": "Data Science Intern",
            "employment_type": "Stage",
            "location": "Cotonou, Bénin",
            "start_date": date(2024, 2, 1),
            "end_date": date(2024, 6, 30),
            "is_current": False,
            "summary_fr": "Prévision des précipitations au Bénin par apprentissage automatique.",
            "summary_en": "Machine-learning-based rainfall forecasting for Benin.",
            "highlights": [
                {
                    "fr": "Application Streamlit d'entraînement et de visualisation de modèles ML "
                    "pour la prévision des précipitations au Bénin.",
                    "en": "Streamlit application to train and visualise ML models forecasting "
                    "rainfall across Benin.",
                }
            ],
            "tech": ["Python", "Streamlit", "scikit-learn", "Pandas"],
            "is_featured": False,
        },
    ]

    for position, entry in enumerate(entries):
        match = entry.pop("match")
        await upsert(db, Experience, match, position=position, is_visible=True, **entry)


async def seed_education(db: AsyncSession) -> None:
    entries = [
        {
            "match": {"school": "ENSGMM — UNSTIM Abomey"},
            "degree_fr": "Diplôme d'Ingénieur en Génie Mathématique et Modélisation",
            "degree_en": "Engineering Degree in Mathematical Engineering & Modelling",
            "field_fr": "Modélisation mathématique, recherche opérationnelle, statistiques",
            "field_en": "Mathematical modelling, operations research, statistics",
            "location": "Abomey, Bénin",
            "start_year": 2020,
            "end_year": 2023,
            "description_fr": (
                "École Nationale Supérieure de Génie Mathématique et Modélisation, "
                "Université Nationale des Sciences, Technologies, Ingénierie et Mathématiques."
            ),
            "description_en": (
                "National Graduate School of Mathematical Engineering and Modelling, "
                "National University of Sciences, Technologies, Engineering and Mathematics."
            ),
        },
        {
            "match": {"school": "INSPEI — UNSTIM Abomey"},
            "degree_fr": "Classes Préparatoires aux Grandes Écoles",
            "degree_en": "Preparatory Classes for Engineering Schools",
            "field_fr": "Mathématiques, physique, informatique",
            "field_en": "Mathematics, physics, computer science",
            "location": "Abomey, Bénin",
            "start_year": 2018,
            "end_year": 2020,
            "description_fr": (
                "Institut National Supérieur des Classes Préparatoires aux Études d'Ingénieur."
            ),
            "description_en": ("National Institute for Preparatory Studies in Engineering."),
        },
    ]
    for position, entry in enumerate(entries):
        match = entry.pop("match")
        await upsert(db, Education, match, position=position, is_visible=True, **entry)


async def seed_certifications(db: AsyncSession) -> None:
    entries = [
        (
            "Microsoft Certified — Fabric Data Engineer Associate",
            "Microsoft",
            date(2026, 1, 1),
            True,
        ),
        (
            "KCNA — Kubernetes and Cloud Native Associate",
            "The Linux Foundation / CNCF",
            date(2026, 1, 1),
            True,
        ),
        ("Professional Data Engineer", "DataCamp", None, True),
        ("Machine Learning Engineer", "DataCamp", None, True),
        (
            "Astronomer Certification for Apache Airflow DAG Authoring",
            "Astronomer",
            None,
            True,
        ),
        ("Data Infrastructure / Cloud / DevOps", "Africa TechUp Tour", None, False),
        ("Introduction to Apache Airflow in Python", "DataCamp", None, False),
        ("Créez votre Data Lake", "OpenClassrooms", None, False),
        ("Implémentez vos bases de données relationnelles avec SQL", "OpenClassrooms", None, False),
        ("Concevez l'architecture d'un système", "OpenClassrooms", None, False),
        ("Adoptez les API REST pour vos projets web", "OpenClassrooms", None, False),
    ]
    for position, (name, issuer, issued_at, featured) in enumerate(entries):
        await upsert(
            db,
            Certification,
            {"name": name},
            issuer=issuer,
            issued_at=issued_at,
            is_featured=featured,
            position=position,
            is_visible=True,
        )


async def seed_skills(db: AsyncSession) -> None:
    catalogue = [
        (
            "langages",
            "Langages",
            "Languages",
            "code",
            [("Python", 5), ("SQL", 5), ("Pandas", 5), ("Polars", 4), ("PySpark", 3), ("Bash", 4)],
        ),
        (
            "orchestration",
            "Orchestration & Pipelines",
            "Orchestration & Pipelines",
            "workflow",
            [
                ("Apache Airflow", 5),
                ("Dataform", 4),
                ("dbt", 4),
                ("Airbyte", 4),
                ("Docker", 5),
                ("Kafka", 3),
            ],
        ),
        (
            "bases-de-donnees",
            "Bases de données & DWH",
            "Databases & DWH",
            "database",
            [
                ("BigQuery", 5),
                ("PostgreSQL", 5),
                ("MongoDB", 4),
                ("Snowflake", 4),
                ("DuckDB", 4),
                ("Microsoft Fabric", 3),
            ],
        ),
        (
            "bi-visualisation",
            "BI & Visualisation",
            "BI & Visualisation",
            "bar-chart",
            [
                ("Looker Studio", 4),
                ("Metabase", 4),
                ("Apache Superset", 4),
                ("Streamlit", 5),
                ("Grafana", 4),
            ],
        ),
        (
            "cloud-devops",
            "Cloud & DevOps",
            "Cloud & DevOps",
            "cloud",
            [
                ("GCP", 5),
                ("Kubernetes", 3),
                ("GitHub Actions", 4),
                ("CI/CD", 4),
                ("MLOps", 4),
                ("Prometheus", 3),
            ],
        ),
        (
            "machine-learning",
            "Machine Learning & IA",
            "Machine Learning & AI",
            "brain",
            [
                ("scikit-learn", 4),
                ("TensorFlow / Keras", 4),
                ("PyCaret", 4),
                ("LangChain / RAG", 3),
                ("FastAPI", 4),
            ],
        ),
    ]

    for cat_position, (slug, name_fr, name_en, icon, skills) in enumerate(catalogue):
        category = await upsert(
            db,
            SkillCategory,
            {"slug": slug},
            name_fr=name_fr,
            name_en=name_en,
            icon=icon,
            position=cat_position,
            is_visible=True,
        )
        await db.flush()
        for skill_position, (name, level) in enumerate(skills):
            await upsert(
                db,
                Skill,
                {"name": name, "category_id": category.id},
                level=level,
                position=skill_position,
                is_visible=True,
                is_featured=level >= 5,
            )


async def seed_languages(db: AsyncSession) -> None:
    entries = [
        ("Français", "French", "Langue maternelle", "Native or bilingual", "C2"),
        ("Anglais", "English", "Professionnel", "Professional working", "B2"),
    ]
    for position, (name_fr, name_en, level_fr, level_en, cefr) in enumerate(entries):
        await upsert(
            db,
            Language,
            {"name_fr": name_fr},
            name_en=name_en,
            level_fr=level_fr,
            level_en=level_en,
            cefr=cefr,
            position=position,
        )


# ------------------------------------------------------------------- content
TAGS = [
    ("data-engineering", "Data Engineering", "Data Engineering", "#2563eb"),
    ("machine-learning", "Machine Learning", "Machine Learning", "#7c3aed"),
    ("mlops", "MLOps", "MLOps", "#0891b2"),
    ("airflow", "Airflow", "Airflow", "#16a34a"),
    ("dbt", "dbt", "dbt", "#ea580c"),
    ("bigquery", "BigQuery", "BigQuery", "#0ea5e9"),
    ("snowflake", "Snowflake", "Snowflake", "#38bdf8"),
    ("docker", "Docker", "Docker", "#2496ed"),
    ("streamlit", "Streamlit", "Streamlit", "#ff4b4b"),
    ("formation", "Formation", "Training", "#f59e0b"),
    ("genai", "IA générative", "Generative AI", "#db2777"),
    ("devops", "DevOps", "DevOps", "#64748b"),
]


async def seed_tags(db: AsyncSession) -> dict[str, Tag]:
    result: dict[str, Tag] = {}
    for position, (slug, name_fr, name_en, color) in enumerate(TAGS):
        result[slug] = await upsert(
            db,
            Tag,
            {"slug": slug},
            name_fr=name_fr,
            name_en=name_en,
            color=color,
            position=position,
            is_visible=True,
        )
    await db.flush()
    return result


async def seed_projects(db: AsyncSession, tags: dict[str, Tag]) -> None:
    entries: list[dict[str, Any]] = [
        {
            "slug": "plateforme-analytique-vtc-snowflake-dbt",
            "title_fr": "Plateforme analytique pour un service de VTC",
            "title_en": "Analytics platform for a ride-hailing service",
            "summary_fr": (
                "Stack moderne complète : ingestion MongoDB Atlas via Airbyte, modélisation dbt "
                "sur Snowflake (tests, snapshots, docs), orchestration Airflow, dashboards "
                "Metabase."
            ),
            "summary_en": (
                "A complete modern stack: MongoDB Atlas ingestion through Airbyte, dbt modelling "
                "on Snowflake (tests, snapshots, docs), Airflow orchestration, Metabase "
                "dashboards."
            ),
            "content_fr": (
                "## Contexte\n\n"
                "Un service de VTC produit des données transactionnelles dans MongoDB Atlas, "
                "sans couche analytique exploitable par les équipes métier.\n\n"
                "## Architecture\n\n"
                "1. **Ingestion** — Airbyte réplique les collections MongoDB Atlas "
                "vers Snowflake.\n"
                "2. **Modélisation** — dbt structure les données en couches *staging → "
                "intermediate → marts*, avec tests de qualité, snapshots pour l'historisation "
                "et documentation générée automatiquement.\n"
                "3. **Orchestration** — Airflow (déployé avec Astro) déclenche les syncs Airbyte "
                "puis les runs dbt, avec alerting en cas d'échec.\n"
                "4. **Restitution** — Metabase expose les marts aux équipes métier.\n\n"
                "## Ce que j'en retiens\n\n"
                "La séparation stricte des couches dbt rend les incidents beaucoup plus faciles "
                "à localiser : une anomalie se trace de la mart jusqu'à la source en quelques "
                "minutes."
            ),
            "content_en": (
                "## Context\n\n"
                "A ride-hailing service produced transactional data in MongoDB Atlas without any "
                "analytics layer the business teams could use.\n\n"
                "## Architecture\n\n"
                "1. **Ingestion** — Airbyte replicates MongoDB Atlas collections into Snowflake.\n"
                "2. **Modelling** — dbt structures the data in *staging → intermediate → marts* "
                "layers, with quality tests, snapshots for history and auto-generated docs.\n"
                "3. **Orchestration** — Airflow (deployed with Astro) triggers Airbyte syncs then "
                "dbt runs, with alerting on failure.\n"
                "4. **Serving** — Metabase exposes the marts to business teams.\n\n"
                "## Takeaway\n\n"
                "Strict dbt layering makes incidents far easier to locate: an anomaly can be "
                "traced from mart back to source in minutes."
            ),
            "category": ProjectCategory.DATA_ENGINEERING,
            "repo_url": f"{GITHUB}/rentcar-pipeline-airbyte-snowflake-dbt-airflow-astro",
            "tech": [
                "Airbyte",
                "Snowflake",
                "dbt",
                "Apache Airflow",
                "Astro",
                "Metabase",
                "MongoDB",
            ],
            "started_at": date(2024, 1, 1),
            "finished_at": date(2024, 12, 31),
            "is_featured": True,
            "tags": ["data-engineering", "dbt", "snowflake", "airflow"],
        },
        {
            "slug": "pipelines-analytiques-e-commerce-superset",
            "title_fr": "Pipelines analytiques e-commerce",
            "title_en": "E-commerce analytics pipelines",
            "summary_fr": (
                "Architecture en couches Bronze/Silver/Gold, ETL orchestré avec Airflow, "
                "dashboards Apache Superset et monitoring Grafana/Prometheus."
            ),
            "summary_en": (
                "Bronze/Silver/Gold layered architecture, Airflow-orchestrated ETL, Apache "
                "Superset dashboards and Grafana/Prometheus monitoring."
            ),
            "content_fr": (
                "## Objectif\n\n"
                "Construire une chaîne de traitement e-commerce complète, reproductible en local "
                "avec Docker Compose, du générateur de données jusqu'au dashboard.\n\n"
                "## Couches\n\n"
                "- **Bronze** — données brutes déposées dans MinIO (stockage objet S3).\n"
                "- **Silver** — nettoyage et typage avec Polars.\n"
                "- **Gold** — tables agrégées prêtes pour l'analyse dans PostgreSQL.\n\n"
                "## Exploitation\n\n"
                "Airflow orchestre les DAGs, Apache Superset sert les dashboards, et "
                "Prometheus + Grafana + cAdvisor surveillent conteneurs et pipelines."
            ),
            "content_en": (
                "## Goal\n\n"
                "Build a complete e-commerce processing chain, reproducible locally with Docker "
                "Compose, from the data generator to the dashboard.\n\n"
                "## Layers\n\n"
                "- **Bronze** — raw data landed in MinIO (S3 object storage).\n"
                "- **Silver** — cleaning and typing with Polars.\n"
                "- **Gold** — aggregated, analysis-ready tables in PostgreSQL.\n\n"
                "## Operations\n\n"
                "Airflow orchestrates the DAGs, Apache Superset serves the dashboards, and "
                "Prometheus + Grafana + cAdvisor monitor containers and pipelines."
            ),
            "category": ProjectCategory.DATA_ENGINEERING,
            "repo_url": f"{GITHUB}/E-Commerce-Data-Pipeline-And-Dashboard-With-Apache-Superset",
            "tech": [
                "Apache Airflow",
                "Apache Superset",
                "Polars",
                "PostgreSQL",
                "MinIO",
                "Docker",
                "Grafana",
                "Prometheus",
            ],
            "started_at": date(2024, 1, 1),
            "finished_at": date(2024, 12, 31),
            "is_featured": True,
            "tags": ["data-engineering", "airflow", "docker", "devops"],
        },
        {
            "slug": "pipeline-airflow-compagnie-aerienne",
            "title_fr": "Pipeline & dashboard pour une compagnie aérienne",
            "title_en": "Airline data pipeline & dashboard",
            "summary_fr": (
                "ETL orchestré avec Airflow depuis MongoDB Atlas vers PostgreSQL et DuckDB, "
                "restitué dans un dashboard Streamlit déployé en ligne."
            ),
            "summary_en": (
                "Airflow-orchestrated ETL from MongoDB Atlas into PostgreSQL and DuckDB, served "
                "through a Streamlit dashboard deployed online."
            ),
            "content_fr": (
                "Chaîne complète *extract → transform → load* conteneurisée : Airflow orchestre "
                "l'extraction depuis MongoDB Atlas, les transformations Python alimentent "
                "PostgreSQL et DuckDB, et un dashboard Streamlit rend les indicateurs "
                "accessibles publiquement."
            ),
            "content_en": (
                "A complete containerised *extract → transform → load* chain: Airflow "
                "orchestrates extraction from MongoDB Atlas, Python transformations feed "
                "PostgreSQL and DuckDB, and a Streamlit dashboard makes the indicators publicly "
                "available."
            ),
            "category": ProjectCategory.DATA_ENGINEERING,
            "repo_url": f"{GITHUB}/Airflow-Pipeline-Dashboard-Compagnie-Aerienne",
            "demo_url": "https://airflow-pipeline-dashboard-compagnie-aerienne.streamlit.app/",
            "tech": [
                "Apache Airflow",
                "MongoDB Atlas",
                "PostgreSQL",
                "DuckDB",
                "Streamlit",
                "Docker",
            ],
            "is_featured": True,
            "tags": ["data-engineering", "airflow", "streamlit", "docker"],
        },
        {
            "slug": "reconnaissance-de-fruits-mlops",
            "title_fr": "Reconnaissance de fruits — de l'entraînement au déploiement",
            "title_en": "Fruit recognition — from training to deployment",
            "summary_fr": (
                "Chaîne MLOps complète : entraînement CNN (EfficientNet, ResNet, VGG16), API "
                "FastAPI, applications Streamlit et Gradio, monitoring Prometheus/Grafana."
            ),
            "summary_en": (
                "A complete MLOps chain: CNN training (EfficientNet, ResNet, VGG16), FastAPI "
                "service, Streamlit and Gradio apps, Prometheus/Grafana monitoring."
            ),
            "content_fr": (
                "## Le projet\n\n"
                "Classification d'images de fruits, traitée comme un produit et non comme un "
                "notebook :\n\n"
                "- **Entraînement** — comparaison d'architectures (EfficientNet, ResNet, VGG16) "
                "avec augmentation de données via Albumentations.\n"
                "- **Service** — API FastAPI conteneurisée, déployée sur Hugging Face Spaces.\n"
                "- **Interfaces** — une application Streamlit et une application Gradio.\n"
                "- **Observabilité** — métriques exposées à Prometheus et visualisées dans "
                "Grafana.\n"
            ),
            "content_en": (
                "## The project\n\n"
                "Fruit image classification, treated as a product rather than a notebook:\n\n"
                "- **Training** — architecture comparison (EfficientNet, ResNet, VGG16) with "
                "Albumentations-based data augmentation.\n"
                "- **Serving** — containerised FastAPI service deployed on Hugging Face Spaces.\n"
                "- **Interfaces** — a Streamlit app and a Gradio app.\n"
                "- **Observability** — metrics exposed to Prometheus and visualised in Grafana.\n"
            ),
            "category": ProjectCategory.MLOPS,
            "repo_url": f"{GITHUB}/Fruits-Recognition-Training",
            "demo_url": "https://abrahamklb-fruits-recognition-gradio.hf.space",
            "links": [
                {"label": "API FastAPI", "url": f"{GITHUB}/Fruits-Recognition-API", "icon": "code"},
                {
                    "label": "App Streamlit",
                    "url": f"{GITHUB}/Fruits-Recognition-Streamlit-App",
                    "icon": "layout",
                },
                {
                    "label": "App Gradio",
                    "url": f"{GITHUB}/Fruits-Recognition-Gradio-App",
                    "icon": "layout",
                },
            ],
            "tech": [
                "TensorFlow",
                "Keras",
                "EfficientNet",
                "FastAPI",
                "Streamlit",
                "Gradio",
                "Docker",
                "Prometheus",
            ],
            "is_featured": True,
            "tags": ["machine-learning", "mlops", "docker"],
        },
        {
            "slug": "streaming-pipeline-kafka-spark",
            "title_fr": "Pipeline de streaming temps réel Kafka + Spark",
            "title_en": "Real-time streaming pipeline with Kafka + Spark",
            "summary_fr": (
                "Ingestion d'un flux d'API en temps réel via Kafka, traitement Spark Streaming, "
                "persistance PostgreSQL, le tout orchestré par Airflow et conteneurisé."
            ),
            "summary_en": (
                "Real-time API stream ingestion through Kafka, Spark Streaming processing, "
                "PostgreSQL persistence, orchestrated by Airflow and fully containerised."
            ),
            "content_fr": (
                "Architecture événementielle complète : producteur Kafka alimenté par une API, "
                "Schema Registry pour le contrat de données, consommateur Spark Streaming, "
                "persistance PostgreSQL et orchestration Airflow. Zookeeper et l'ensemble des "
                "services tournent via Docker Compose."
            ),
            "content_en": (
                "A complete event-driven architecture: a Kafka producer fed by an API, Schema "
                "Registry for the data contract, a Spark Streaming consumer, PostgreSQL "
                "persistence and Airflow orchestration. Zookeeper and every service run through "
                "Docker Compose."
            ),
            "category": ProjectCategory.DATA_ENGINEERING,
            "repo_url": f"{GITHUB}/Random-User-Streaming-Pipeline",
            "tech": ["Kafka", "Spark Streaming", "Apache Airflow", "PostgreSQL", "Docker"],
            "is_featured": False,
            "tags": ["data-engineering", "airflow", "docker"],
        },
        {
            "slug": "rag-transcripts-youtube",
            "title_fr": "RAG sur transcriptions YouTube",
            "title_en": "RAG over YouTube transcripts",
            "summary_fr": (
                "Chattez avec n'importe quelle vidéo YouTube : extraction de transcription, "
                "embeddings, recherche vectorielle et réponse générée, avec CI/CD."
            ),
            "summary_en": (
                "Chat with any YouTube video: transcript extraction, embeddings, vector search "
                "and generated answers, with CI/CD."
            ),
            "content_fr": (
                "Application de *Retrieval-Augmented Generation* : la transcription d'une vidéo "
                "YouTube est découpée, vectorisée avec des embeddings Hugging Face, puis "
                "interrogée via LangChain. L'interface Streamlit est conteneurisée et déployée "
                "automatiquement par GitHub Actions."
            ),
            "content_en": (
                "A Retrieval-Augmented Generation app: a YouTube video transcript is chunked, "
                "embedded with Hugging Face models, then queried through LangChain. The "
                "Streamlit interface is containerised and deployed automatically by GitHub "
                "Actions."
            ),
            "category": ProjectCategory.MACHINE_LEARNING,
            "repo_url": f"{GITHUB}/youtube-transcript-rag-project",
            "demo_url": "https://youtube-transcript-rag.streamlit.app/",
            "tech": ["LangChain", "Hugging Face", "RAG", "Streamlit", "Docker", "CI/CD"],
            "is_featured": True,
            "tags": ["genai", "machine-learning", "docker"],
        },
        {
            "slug": "prediction-churn-client",
            "title_fr": "Analyse et prédiction du churn client",
            "title_en": "Customer churn analysis and prediction",
            "summary_fr": (
                "Application interactive d'analyse exploratoire et de prédiction du départ "
                "client, avec visualisations et modèles scikit-learn."
            ),
            "summary_en": (
                "Interactive app for exploratory analysis and churn prediction, with "
                "visualisations and scikit-learn models."
            ),
            "content_fr": (
                "Exploration des facteurs de départ client, entraînement de plusieurs "
                "classifieurs et mise à disposition d'un simulateur interactif permettant à une "
                "équipe métier de tester des profils clients."
            ),
            "content_en": (
                "Exploration of churn drivers, training of several classifiers, and an "
                "interactive simulator letting a business team test customer profiles."
            ),
            "category": ProjectCategory.MACHINE_LEARNING,
            "repo_url": f"{GITHUB}/Churn-Prediction-and-Analysis-Project",
            "demo_url": "https://churn-prediction-and-analysis-app.streamlit.app",
            "tech": ["scikit-learn", "Pandas", "Streamlit", "Python"],
            "is_featured": False,
            "tags": ["machine-learning", "streamlit"],
        },
        {
            "slug": "airflow-utils-templates",
            "title_fr": "Templates et utilitaires Airflow",
            "title_en": "Airflow templates and utilities",
            "summary_fr": (
                "Boîte à outils réutilisable pour Airflow : alerting email/Google Chat, "
                "helpers de DAG et environnement Docker Compose prêt à l'emploi."
            ),
            "summary_en": (
                "A reusable Airflow toolbox: email/Google Chat alerting, DAG helpers and a "
                "ready-to-use Docker Compose environment."
            ),
            "content_fr": (
                "Extrait et généralisé de mon travail en production : callbacks d'alerting "
                "(SMTP et Google Chat), helpers de construction de DAG et un socle Docker "
                "Compose pour démarrer un projet Airflow en quelques minutes."
            ),
            "content_en": (
                "Extracted and generalised from my production work: alerting callbacks (SMTP and "
                "Google Chat), DAG-building helpers and a Docker Compose baseline to start an "
                "Airflow project in minutes."
            ),
            "category": ProjectCategory.OPEN_SOURCE,
            "repo_url": f"{GITHUB}/airflow-utils-templates",
            "tech": ["Apache Airflow", "Python", "Docker", "SMTP"],
            "is_featured": False,
            "tags": ["airflow", "data-engineering", "devops"],
        },
        {
            "slug": "setup-databases-with-docker",
            "title_fr": "Docker Databases Starter Kit",
            "title_en": "Docker Databases Starter Kit",
            "summary_fr": (
                "Kit de démarrage pour lancer PostgreSQL, MySQL, MariaDB, MongoDB, Redis et "
                "Cassandra en local, documenté avec MkDocs."
            ),
            "summary_en": (
                "Starter kit to spin up PostgreSQL, MySQL, MariaDB, MongoDB, Redis and Cassandra "
                "locally, documented with MkDocs."
            ),
            "content_fr": (
                "Une seule commande `make` pour disposer d'une base de données prête à l'emploi, "
                "avec DBeaver préconfiguré. Utilisé comme support dans mes formations pour éviter "
                "de perdre une heure sur l'installation."
            ),
            "content_en": (
                "A single `make` command to get a ready-to-use database, with DBeaver "
                "pre-configured. Used as training material to avoid losing an hour on setup."
            ),
            "category": ProjectCategory.OPEN_SOURCE,
            "repo_url": f"{GITHUB}/Setup-Databases-With-Docker",
            "demo_url": "https://abrahamkoloboe27.github.io/Setup-Databases-With-Docker/",
            "tech": ["Docker", "PostgreSQL", "MongoDB", "Redis", "Cassandra", "MkDocs"],
            "is_featured": False,
            "tags": ["docker", "data-engineering", "formation"],
        },
        {
            "slug": "mlops-prediction-prix-immobilier",
            "title_fr": "Prédiction de prix immobiliers — API + app + CI/CD",
            "title_en": "Housing price prediction — API + app + CI/CD",
            "summary_fr": (
                "Modèle PyCaret servi par une API FastAPI, interface Streamlit, images Docker "
                "publiées automatiquement par GitHub Actions."
            ),
            "summary_en": (
                "A PyCaret model served by a FastAPI service, a Streamlit interface, and Docker "
                "images published automatically by GitHub Actions."
            ),
            "content_fr": (
                "Illustration de bout en bout d'un déploiement MLOps : entraînement automatisé "
                "avec PyCaret, exposition via FastAPI, consommation par une application "
                "Streamlit, et publication continue des images Docker."
            ),
            "content_en": (
                "An end-to-end illustration of MLOps deployment: automated training with "
                "PyCaret, exposure through FastAPI, consumption by a Streamlit app, and "
                "continuous publishing of Docker images."
            ),
            "category": ProjectCategory.MLOPS,
            "repo_url": f"{GITHUB}/Housing-Price-Prediction",
            "demo_url": "https://abrahamklb-housing-api.hf.space/redoc",
            "tech": ["PyCaret", "FastAPI", "Streamlit", "Docker", "GitHub Actions"],
            "is_featured": False,
            "tags": ["mlops", "machine-learning", "devops"],
        },
    ]

    for position, entry in enumerate(entries):
        tag_slugs = entry.pop("tags", [])
        slug = entry.pop("slug")
        project = await upsert(
            db,
            Project,
            {"slug": slug},
            status=ContentStatus.PUBLISHED,
            published_at=None,
            position=position,
            is_visible=True,
            **entry,
        )
        project.tags = [tags[s] for s in tag_slugs if s in tags]


async def seed_posts(db: AsyncSession, tags: dict[str, Tag]) -> None:
    entries = [
        {
            "slug": "reduire-les-couts-bigquery",
            "title_fr": "Réduire sa facture BigQuery sans casser les dashboards",
            "title_en": "Cutting your BigQuery bill without breaking the dashboards",
            "excerpt_fr": (
                "Partitioning, clustering et discipline de requête : trois leviers concrets, "
                "appliqués sur des tables réellement sollicitées."
            ),
            "excerpt_en": (
                "Partitioning, clustering and query discipline: three concrete levers, applied "
                "to genuinely busy tables."
            ),
            "content_fr": (
                "BigQuery facture les **octets lus**, pas le temps de calcul. Toute optimisation "
                "revient donc à une seule question : comment lire moins ?\n\n"
                "## 1. Partitionner sur la colonne de filtre réelle\n\n"
                "Partitionner par date d'ingestion alors que les analystes filtrent sur la date "
                "d'événement ne sert à rien. Regardez `INFORMATION_SCHEMA.JOBS` pour savoir sur "
                "quoi vos utilisateurs filtrent vraiment.\n\n"
                "## 2. Clusteriser sur les colonnes de jointure et de filtre secondaire\n\n"
                "Le clustering trie physiquement les données et permet d'élaguer des blocs "
                "entiers. Il est particulièrement efficace sur les colonnes à cardinalité "
                "moyenne.\n\n"
                "## 3. Interdire `SELECT *` dans les modèles\n\n"
                "BigQuery étant en colonnes, chaque colonne inutile est facturée. Une revue de "
                "code qui refuse `SELECT *` économise souvent plus qu'un mois de tuning.\n\n"
                "## Mesurer avant d'optimiser\n\n"
                "Commencez toujours par lister les dix requêtes les plus coûteuses des trente "
                "derniers jours. L'optimisation qui compte est rarement celle qu'on imagine."
            ),
            "content_en": (
                "BigQuery charges for **bytes read**, not compute time. Every optimisation "
                "therefore boils down to one question: how do we read less?\n\n"
                "## 1. Partition on the column people actually filter on\n\n"
                "Partitioning by ingestion date while analysts filter on event date achieves "
                "nothing. Look at `INFORMATION_SCHEMA.JOBS` to learn what your users really "
                "filter on.\n\n"
                "## 2. Cluster on join and secondary filter columns\n\n"
                "Clustering physically sorts the data and lets BigQuery prune whole blocks. It "
                "is especially effective on medium-cardinality columns.\n\n"
                "## 3. Ban `SELECT *` in models\n\n"
                "Because BigQuery is columnar, every unnecessary column is billed. A code review "
                "that rejects `SELECT *` often saves more than a month of tuning.\n\n"
                "## Measure before optimising\n\n"
                "Always start by listing the ten most expensive queries of the last thirty days. "
                "The optimisation that matters is rarely the one you expected."
            ),
            "tags": ["bigquery", "data-engineering"],
            "is_featured": True,
            "published_at": datetime(2026, 3, 12, 9, 0, tzinfo=UTC),
        },
        {
            "slug": "airflow-alerting-qui-sert-vraiment",
            "title_fr": "Un alerting Airflow que l'équipe lit vraiment",
            "title_en": "Airflow alerting your team actually reads",
            "excerpt_fr": (
                "Une alerte ignorée ne vaut rien. Comment j'ai construit des callbacks "
                "email/Google Chat qui déclenchent une action au lieu d'un soupir."
            ),
            "excerpt_en": (
                "An ignored alert is worthless. How I built email/Google Chat callbacks that "
                "trigger action instead of a sigh."
            ),
            "content_fr": (
                "Le problème n'est presque jamais l'absence d'alertes : c'est leur volume.\n\n"
                "## Alerter sur l'impact, pas sur la tâche\n\n"
                "Un message utile répond à trois questions : *quelle donnée est touchée*, "
                "*depuis quand*, et *que doit faire le lecteur*. Le nom de la task ne répond à "
                "aucune des trois.\n\n"
                "## Regrouper par DAG run\n\n"
                "Dix tâches qui échouent à cause d'une même source doivent produire une alerte, "
                "pas dix.\n\n"
                "## Séparer les canaux\n\n"
                "Les échecs bloquants vont dans Google Chat, les anomalies de qualité dans un "
                "rapport quotidien par email. Mélanger les deux garantit que plus personne ne "
                "lit ni l'un ni l'autre.\n\n"
                "J'ai extrait ces callbacks dans un dépôt réutilisable, "
                f"[airflow-utils-templates]({GITHUB}/airflow-utils-templates)."
            ),
            "content_en": (
                "The problem is almost never the absence of alerts: it is their volume.\n\n"
                "## Alert on impact, not on tasks\n\n"
                "A useful message answers three questions: *which data is affected*, *since "
                "when*, and *what should the reader do*. A task name answers none of them.\n\n"
                "## Group by DAG run\n\n"
                "Ten tasks failing because of one source should produce one alert, not ten.\n\n"
                "## Separate the channels\n\n"
                "Blocking failures go to Google Chat, quality anomalies into a daily email "
                "digest. Mixing both guarantees nobody reads either.\n\n"
                "I extracted these callbacks into a reusable repository, "
                f"[airflow-utils-templates]({GITHUB}/airflow-utils-templates)."
            ),
            "tags": ["airflow", "data-engineering"],
            "is_featured": True,
            "published_at": datetime(2026, 1, 20, 9, 0, tzinfo=UTC),
        },
        {
            "slug": "enseigner-la-data-au-benin",
            "title_fr": "Enseigner la data au Bénin : ce que j'ai appris en formant",
            "title_en": "Teaching data in Benin: what training taught me",
            "excerpt_fr": (
                "Python Bénin, Africa TechUp Tour, GrowUp AI : trois ans à former, et une "
                "conviction — l'environnement de travail compte plus que le cours."
            ),
            "excerpt_en": (
                "Python Bénin, Africa TechUp Tour, GrowUp AI: three years of teaching, and one "
                "conviction — the working environment matters more than the lesson."
            ),
            "content_fr": (
                "## La première heure décide de tout\n\n"
                "Si l'installation prend une heure, l'atelier est déjà perdu. C'est exactement "
                "pour ça que j'ai construit "
                f"[Setup-Databases-With-Docker]({GITHUB}/Setup-Databases-With-Docker) : une "
                "commande, et tout le monde démarre en même temps.\n\n"
                "## Enseigner un métier, pas une syntaxe\n\n"
                "Les participants n'ont pas besoin d'apprendre `GROUP BY` : ils ont besoin de "
                "savoir répondre à une question métier avec des données imparfaites.\n\n"
                "## Laisser une trace\n\n"
                "Chaque formation laisse un dépôt public. C'est ce qui distingue un souvenir "
                "d'un support réutilisable — et c'est ce qui permet aux participants de "
                "continuer seuls.\n\n"
                "Les rediffusions sont disponibles dans mes playlists YouTube."
            ),
            "content_en": (
                "## The first hour decides everything\n\n"
                "If setup takes an hour, the workshop is already lost. That is exactly why I "
                f"built [Setup-Databases-With-Docker]({GITHUB}/Setup-Databases-With-Docker): one "
                "command, and everyone starts together.\n\n"
                "## Teach a craft, not a syntax\n\n"
                "Participants do not need to learn `GROUP BY`: they need to answer a business "
                "question using imperfect data.\n\n"
                "## Leave something behind\n\n"
                "Every training leaves a public repository. That is what separates a memory from "
                "reusable material — and what lets participants keep going on their own.\n\n"
                "Recordings are available in my YouTube playlists."
            ),
            "tags": ["formation"],
            "is_featured": False,
            "published_at": datetime(2025, 11, 5, 9, 0, tzinfo=UTC),
        },
    ]

    for position, entry in enumerate(entries):
        tag_slugs = entry.pop("tags", [])
        slug = entry.pop("slug")
        post = await upsert(
            db,
            Post,
            {"slug": slug},
            status=ContentStatus.PUBLISHED,
            position=position,
            is_visible=True,
            **entry,
        )
        post.tags = [tags[s] for s in tag_slugs if s in tags]


# ----------------------------------------------------------------- community
async def seed_community(db: AsyncSession) -> None:
    organizations = [
        {
            "slug": "python-benin",
            "name": "Python Bénin",
            "role_fr": "Formateur & intervenant",
            "role_en": "Trainer & speaker",
            "description_fr": (
                "Communauté béninoise des développeurs Python. J'y anime des sessions sur SQL, "
                "Python et l'ingénierie de données."
            ),
            "description_en": (
                "Benin's Python developer community, where I run sessions on SQL, Python and "
                "data engineering."
            ),
            "is_featured": True,
        },
        {
            "slug": "africa-techup-tour",
            "name": "Africa TechUp Tour (ATUT)",
            "role_fr": "Formateur Data & DevOps",
            "role_en": "Data & DevOps trainer",
            "description_fr": (
                "Programme panafricain de montée en compétences tech. J'y enseigne Python "
                "avancé, SQL avancé, Docker, CI/CD et les fondamentaux DevOps."
            ),
            "description_en": (
                "Pan-African tech upskilling programme where I teach advanced Python, advanced "
                "SQL, Docker, CI/CD and DevOps fundamentals."
            ),
            "url": "https://africatechuptour.com",
            "is_featured": True,
        },
        {
            "slug": "growup-ai",
            "name": "GrowUp AI",
            "role_fr": "Formateur Python & IA générative",
            "role_en": "Python & Generative AI trainer",
            "description_fr": (
                "Parcours de formation en data science, de l'analyse de données Python jusqu'à "
                "l'IA générative."
            ),
            "description_en": (
                "Data science training track, from Python data analysis through to generative AI."
            ),
            "is_featured": True,
        },
        {
            "slug": "ensgmm",
            "name": "ENSGMM — UNSTIM",
            "role_fr": "Intervenant auprès des élèves ingénieurs",
            "role_en": "Guest instructor for engineering students",
            "description_fr": (
                "Initiation des élèves ingénieurs à Git, GitHub et aux bonnes pratiques de "
                "collaboration."
            ),
            "description_en": (
                "Introducing engineering students to Git, GitHub and collaboration best practices."
            ),
            "is_featured": False,
        },
    ]

    org_by_slug: dict[str, Organization] = {}
    for position, entry in enumerate(organizations):
        slug = entry.pop("slug")
        org_by_slug[slug] = await upsert(
            db, Organization, {"slug": slug}, position=position, is_visible=True, **entry
        )
    await db.flush()

    talks = [
        {
            "slug": "python-benin-sql-101",
            "title_fr": "SQL 101 — de la première requête aux jointures",
            "title_en": "SQL 101 — from your first query to joins",
            "type": TalkType.WORKSHOP,
            "event_name": "Python Bénin",
            "org": "python-benin",
            "description_fr": (
                "Atelier d'introduction à SQL destiné aux débutants : sélection, filtrage, "
                "agrégation et jointures, avec un support interactif en ligne."
            ),
            "description_en": (
                "Beginner-friendly SQL workshop: selection, filtering, aggregation and joins, "
                "with an interactive online handout."
            ),
            "repo_url": f"{GITHUB}/python-benin-sql-101",
            "event_url": "https://python-benin-sql-101.vercel.app",
            "video_url": PLAYLIST_PYTHONBENIN,
            "topics": ["SQL", "PostgreSQL", "Débutants"],
            "language": "fr",
            "is_featured": True,
        },
        {
            "slug": "atut-python-avance",
            "title_fr": "Python avancé pour la data",
            "title_en": "Advanced Python for data",
            "type": TalkType.COURSE,
            "event_name": "Africa TechUp Tour",
            "org": "africa-techup-tour",
            "description_fr": (
                "Module avancé : Polars, logging, atomicité des traitements, gestion "
                "d'environnements avec uv et automatisation de pipelines."
            ),
            "description_en": (
                "Advanced module: Polars, logging, processing atomicity, environment management "
                "with uv and pipeline automation."
            ),
            "repo_url": f"{GITHUB}/advanced-python-atut",
            "topics": ["Python", "Polars", "uv", "Automatisation"],
            "language": "fr",
            "is_featured": True,
        },
        {
            "slug": "atut-sql-avance",
            "title_fr": "SQL avancé et PL/pgSQL",
            "title_en": "Advanced SQL and PL/pgSQL",
            "type": TalkType.COURSE,
            "event_name": "Africa TechUp Tour",
            "org": "africa-techup-tour",
            "description_fr": (
                "Fenêtrage, CTE récursives, procédures stockées PL/pgSQL et optimisation de "
                "requêtes sur PostgreSQL conteneurisé."
            ),
            "description_en": (
                "Window functions, recursive CTEs, PL/pgSQL stored procedures and query "
                "optimisation on containerised PostgreSQL."
            ),
            "repo_url": f"{GITHUB}/advanced-sql-atut",
            "topics": ["SQL", "PL/pgSQL", "PostgreSQL", "Docker"],
            "language": "fr",
            "is_featured": True,
        },
        {
            "slug": "atut-docker-devops-2025",
            "title_fr": "Docker & DevOps",
            "title_en": "Docker & DevOps",
            "type": TalkType.COURSE,
            "event_name": "Africa TechUp Tour 2025",
            "org": "africa-techup-tour",
            "description_fr": (
                "Conteneurisation d'applications, Docker Compose multi-services et bonnes "
                "pratiques d'images pour la production."
            ),
            "description_en": (
                "Application containerisation, multi-service Docker Compose and production image "
                "best practices."
            ),
            "repo_url": f"{GITHUB}/docker-atut-devops-2025",
            "topics": ["Docker", "Docker Compose", "DevOps"],
            "event_date": date(2025, 1, 1),
            "language": "fr",
            "is_featured": True,
        },
        {
            "slug": "atut-cicd-github-actions",
            "title_fr": "CI/CD avec GitHub Actions, Docker et déploiement continu",
            "title_en": "CI/CD with GitHub Actions, Docker and continuous deployment",
            "type": TalkType.WORKSHOP,
            "event_name": "Africa TechUp Tour — Sénégal",
            "org": "africa-techup-tour",
            "description_fr": (
                "De la Pull Request au serveur : workflows GitHub Actions, registre de "
                "conteneurs et déploiement continu d'une application réelle."
            ),
            "description_en": (
                "From pull request to server: GitHub Actions workflows, container registry and "
                "continuous deployment of a real application."
            ),
            "repo_url": f"{GITHUB}/Demo-CICD-With-Github-Actions-ATUT-SN",
            "topics": ["CI/CD", "GitHub Actions", "Docker", "MLOps"],
            "location": "Sénégal",
            "language": "fr",
            "is_featured": True,
        },
        {
            "slug": "atut-dashboard-streamlit",
            "title_fr": "Construire un dashboard avec Streamlit",
            "title_en": "Building a dashboard with Streamlit",
            "type": TalkType.WORKSHOP,
            "event_name": "Africa TechUp Tour",
            "org": "africa-techup-tour",
            "description_fr": (
                "Atelier pratique : de la donnée brute au tableau de bord interactif déployé, "
                "avec Pandas, Plotly et Streamlit."
            ),
            "description_en": (
                "Hands-on workshop: from raw data to a deployed interactive dashboard with "
                "Pandas, Plotly and Streamlit."
            ),
            "repo_url": f"{GITHUB}/Dashboard-Streamlit-ATUT",
            "event_url": "https://dashboard-app-atut.streamlit.app/",
            "topics": ["Streamlit", "Plotly", "Data Visualisation"],
            "language": "fr",
            "is_featured": False,
        },
        {
            "slug": "atut-devops-fondamentaux",
            "title_fr": "Fondamentaux DevOps : Bash, API, Kubernetes",
            "title_en": "DevOps fundamentals: Bash, APIs, Kubernetes",
            "type": TalkType.COURSE,
            "event_name": "Africa TechUp Tour",
            "org": "africa-techup-tour",
            "description_fr": (
                "Automatisation Bash, exposition d'un modèle via FastAPI, conteneurisation et "
                "premiers déploiements Kubernetes."
            ),
            "description_en": (
                "Bash automation, exposing a model through FastAPI, containerisation and first "
                "Kubernetes deployments."
            ),
            "repo_url": f"{GITHUB}/ATUT-DevOps",
            "topics": ["Bash", "FastAPI", "Kubernetes", "CI/CD"],
            "language": "fr",
            "is_featured": False,
        },
        {
            "slug": "growup-ai-python-data-analysis",
            "title_fr": "Python & analyse de données",
            "title_en": "Python & data analysis",
            "type": TalkType.COURSE,
            "event_name": "GrowUp AI",
            "org": "growup-ai",
            "description_fr": (
                "Parcours complet d'analyse de données en Python : manipulation, nettoyage, "
                "visualisation et restitution."
            ),
            "description_en": (
                "Complete Python data analysis track: manipulation, cleaning, visualisation and "
                "reporting."
            ),
            "repo_url": f"{GITHUB}/python-and-data-analysis-growup-ai",
            "topics": ["Python", "Pandas", "Data Analysis"],
            "language": "fr",
            "is_featured": False,
        },
        {
            "slug": "growup-ai-genai-data-science",
            "title_fr": "Python & IA générative pour la data science",
            "title_en": "Python & generative AI for data science",
            "type": TalkType.COURSE,
            "event_name": "GrowUp AI",
            "org": "growup-ai",
            "description_fr": (
                "Introduction pratique aux LLMs appliqués à la data science : prompting, "
                "embeddings et cas d'usage RAG."
            ),
            "description_en": (
                "Practical introduction to LLMs applied to data science: prompting, embeddings "
                "and RAG use cases."
            ),
            "repo_url": f"{GITHUB}/python-and-gen-ai-data-science-growup-ai",
            "topics": ["LLM", "RAG", "Python", "IA générative"],
            "language": "fr",
            "is_featured": True,
        },
        {
            "slug": "ensgmm-git-github",
            "title_fr": "Git & GitHub pour élèves ingénieurs",
            "title_en": "Git & GitHub for engineering students",
            "type": TalkType.WORKSHOP,
            "event_name": "ENSGMM — UNSTIM",
            "org": "ensgmm",
            "description_fr": (
                "Session d'initiation au versionnement et à la collaboration sur GitHub pour les "
                "élèves ingénieurs de l'ENSGMM."
            ),
            "description_en": (
                "Introductory session on version control and GitHub collaboration for ENSGMM "
                "engineering students."
            ),
            "repo_url": f"{GITHUB}/github-starter-ensgmm",
            "topics": ["Git", "GitHub", "Collaboration"],
            "location": "Abomey, Bénin",
            "language": "fr",
            "is_featured": False,
        },
        {
            "slug": "cours-streamlit",
            "title_fr": "Cours Streamlit — créer des applications data",
            "title_en": "Streamlit course — building data applications",
            "type": TalkType.COURSE,
            "event_name": "Cours en ligne",
            "org": None,
            "description_fr": (
                "Cours complet et gratuit sur Streamlit, publié en ligne : composants, mise en "
                "page, état, et déploiement."
            ),
            "description_en": (
                "A complete, free Streamlit course published online: components, layout, state "
                "and deployment."
            ),
            "repo_url": f"{GITHUB}/Cours-Streamlit",
            "event_url": "https://cours-str-abklb.streamlit.app/",
            "topics": ["Streamlit", "Python", "Data Apps"],
            "language": "fr",
            "is_featured": False,
        },
    ]

    for position, entry in enumerate(talks):
        slug = entry.pop("slug")
        org_slug = entry.pop("org", None)
        entry["organization_id"] = org_by_slug[org_slug].id if org_slug else None
        await upsert(db, Talk, {"slug": slug}, position=position, is_visible=True, **entry)

    playlists = [
        {
            "slug": "pythonbenin",
            "title_fr": "PythonBenin",
            "title_en": "PythonBenin",
            "description_fr": (
                "Sessions filmées de la communauté Python Bénin : SQL, Python et ingénierie de "
                "données, en français."
            ),
            "description_en": (
                "Recorded sessions from the Python Bénin community: SQL, Python and data "
                "engineering, in French."
            ),
            "url": PLAYLIST_PYTHONBENIN,
            "external_id": "PLqbY091OZLLCIQ1XIgz5YTvtlA0Vd-yQ5",
            "thumbnail_url": "https://i.ytimg.com/vi/8hRdEahbuLM/hqdefault.jpg",
            "level": "Débutant à intermédiaire",
            "topics": ["Python", "SQL", "Communauté"],
            "is_featured": True,
        },
        {
            "slug": "workshop-data-engineering",
            "title_fr": "Workshop Data Engineering",
            "title_en": "Data Engineering Workshop",
            "description_fr": (
                "Atelier d'ingénierie de données : pipelines, orchestration et outillage moderne."
            ),
            "description_en": (
                "Data engineering workshop: pipelines, orchestration and modern tooling."
            ),
            "url": PLAYLIST_WORKSHOP_DE,
            "external_id": "PL-Wrfjk3ZE__frLErCrX3_Z0XwAU9EXGC",
            "thumbnail_url": "https://i.ytimg.com/vi/ur_3Px02TKI/hqdefault.jpg",
            "level": "Intermédiaire",
            "topics": ["Data Engineering", "Pipelines", "Orchestration"],
            "is_featured": True,
        },
    ]
    for position, entry in enumerate(playlists):
        slug = entry.pop("slug")
        await upsert(
            db,
            Playlist,
            {"slug": slug},
            provider="youtube",
            position=position,
            is_visible=True,
            **entry,
        )


# ------------------------------------------------------------------------ main
async def run(reset: bool = False) -> None:
    configure_logging()
    if reset:
        logger.warning("seed.reset", message="Dropping and recreating every table")
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)
            await conn.run_sync(Base.metadata.create_all)

    async with SessionLocal() as db:
        await seed_users(db)
        await seed_settings(db)
        await seed_socials(db)
        await seed_nav(db)
        await seed_sections(db)
        await seed_stats(db)
        await seed_experiences(db)
        await seed_education(db)
        await seed_certifications(db)
        await seed_skills(db)
        await seed_languages(db)
        tags = await seed_tags(db)
        await seed_projects(db, tags)
        await seed_posts(db, tags)
        await seed_community(db)
        await db.commit()

    logger.info("seed.done", owner=settings.FIRST_SUPERUSER_EMAIL)
    await engine.dispose()


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed the portfolio database")
    parser.add_argument(
        "--reset", action="store_true", help="Drop and recreate all tables before seeding"
    )
    args = parser.parse_args()
    asyncio.run(run(reset=args.reset))


if __name__ == "__main__":
    main()
