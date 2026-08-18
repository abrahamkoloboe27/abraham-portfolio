# Portfolio — Sèdjro Abraham Zacharie KOLOBOE

Portfolio bilingue (FR/EN) piloté par une base de données, avec une console
d'administration complète : réalisations, blog, formations données, playlists
vidéo, sections de page, paramètres du site et partage d'accès.

**Aucun contenu n'est codé en dur** : tout se modifie depuis l'administration,
y compris l'ajout de nouvelles sections sur la page d'accueil.

---

## Sommaire

- [Architecture](#architecture)
- [Ce que couvre le projet](#ce-que-couvre-le-projet)
- [Démarrage rapide](#démarrage-rapide)
- [Développement sans Docker](#développement-sans-docker)
- [Structure du dépôt](#structure-du-dépôt)
- [Modèle de données](#modèle-de-données)
- [Rôles et partage d'accès](#rôles-et-partage-daccès)
- [API](#api)
- [Déploiement](#déploiement)
- [CI/CD](#cicd)
- [Documentation détaillée](#documentation-détaillée)

---

## Architecture

```
                        ┌──────────────────────┐
   Visiteurs ──────────▶│  web  (Next.js 16)   │  SSR + ISR, i18n FR/EN, SEO
                        │  site public         │  sitemap, RSS, JSON-LD
                        └──────────┬───────────┘
                                   │  REST (JSON bilingue, mis en cache)
                        ┌──────────▼───────────┐
   Administrateurs ────▶│  api  (FastAPI)      │  JWT + refresh rotatif, RBAC
                        │  publique + admin    │  audit, uploads, analytics
                        └──────────┬───────────┘
                                   │  SQLAlchemy 2.0 async
                        ┌──────────▼───────────┐      ┌──────────────────┐
                        │  PostgreSQL          │      │  Stockage S3     │
                        │  (Supabase / Neon)   │      │  (Supabase/MinIO)│
                        └──────────────────────┘      └──────────────────┘
                                   ▲
                        ┌──────────┴───────────┐
                        │  admin (React/Vite)  │  CRUD générique, éditeur
                        │  console SPA         │  Markdown bilingue, médias
                        └──────────────────────┘
```

| Service | Stack | Rôle |
| --- | --- | --- |
| `backend` | FastAPI · SQLAlchemy 2.0 async · Alembic · Pydantic v2 | API publique et API d'administration |
| `web` | Next.js 16 (App Router) · React 19 · Tailwind v4 | Site public, rendu serveur, SEO |
| `admin` | React 19 · Vite 6 · TanStack Query · Tailwind v4 | Console d'administration |
| `infra` | Docker · Docker Compose · Caddy | Développement local et production |

---

## Ce que couvre le projet

**Site public**
- Bilingue FR/EN avec détection de langue et bascule instantanée
- Page d'accueil composée de **sections ordonnables** définies en base
- Réalisations filtrables (catégorie, tag, techno) avec pages de détail Markdown
- Blog avec tags, temps de lecture calculé, articles liés et flux RSS
- Formations & interventions, organisations, playlists YouTube intégrées
- Thème clair/sombre/système sans flash au chargement
- SEO : métadonnées par page, OpenGraph, `hreflang`, JSON-LD (`Person`,
  `BlogPosting`, `CreativeWork`, `Event`), `sitemap.xml`, `robots.txt`
- Formulaire de contact avec honeypot anti-spam
- Compteur de vues sans cookie (empreinte visiteur régénérée chaque jour)

**Console d'administration**
- Tableau de bord : contenus, audience 30 jours, pages et sources de trafic
- CRUD complet sur **18 entités**, généré depuis un registre déclaratif
- Édition bilingue par onglets FR/EN sur chaque champ traduisible
- Éditeur Markdown avec aperçu, bibliothèque de médias, sélecteur d'image
- Réordonnancement par glisser-déposer, recherche et filtres
- Paramètres du site (identité, contact, visuels, SEO, thème, options)
- Boîte de réception des messages : lecture, archivage, spam, notes
- Partage d'accès par invitation, gestion des rôles, révocation de sessions
- Journal d'activité horodaté de toutes les modifications

**Plateforme**
- Migrations Alembic vérifiées en CI (`alembic check`)
- Seed idempotent reprenant le parcours réel (Gozem, OpenSI/KKIAPAY, METEO-BENIN,
  ENSGMM, certifications, projets GitHub, playlists, Python Bénin, ATUT, GrowUp AI)
- Images Docker multi-étapes, non-root, avec healthchecks
- CI par service, publication GHCR, déploiement VPS **et** PaaS
- CodeQL et Dependabot

---

## Démarrage rapide

Prérequis : Docker et Docker Compose.

```bash
git clone https://github.com/abrahamkoloboe27/abraham-portfolio.git
cd abraham-portfolio
cp .env.example .env          # ajustez SECRET_KEY et FIRST_SUPERUSER_PASSWORD
make dev
```

| Service | URL |
| --- | --- |
| Site public | <http://localhost:3000> |
| Administration | <http://localhost:5173> |
| API + documentation | <http://localhost:8000/docs> |
| MinIO (stockage) | <http://localhost:9001> |
| Mailpit (emails) | <http://localhost:8025> |

La base est migrée et remplie automatiquement au premier démarrage.
Connectez-vous à l'administration avec `FIRST_SUPERUSER_EMAIL` /
`FIRST_SUPERUSER_PASSWORD`, puis **changez immédiatement le mot de passe**
(_Profil → Changer le mot de passe_).

---

## Développement sans Docker

Prérequis : Python 3.12 (via [uv](https://docs.astral.sh/uv/)), Node 22, PostgreSQL.

```bash
make install          # venv Python + npm ci pour web et admin

# Terminal 1 — API
make migrate && make seed
make dev-api          # http://localhost:8000

# Terminal 2 — site public
make dev-web          # http://localhost:3000

# Terminal 3 — administration
make dev-admin        # http://localhost:5173
```

Commandes utiles :

```bash
make check            # lint + tests des trois services
make test             # pytest
make migration m="ajout du champ x"
make seed-reset       # recrée le schéma puis réinjecte les données
make help             # toutes les cibles disponibles
```

---

## Structure du dépôt

```
.
├── backend/                 API FastAPI
│   ├── app/
│   │   ├── api/
│   │   │   ├── deps.py          session DB, utilisateur courant, garde-fous de rôle
│   │   │   └── v1/
│   │   │       ├── public/      endpoints non authentifiés (site, contenus, flux)
│   │   │       └── admin/       auth, équipe, médias, messages, tableau de bord
│   │   │           └── factory.py   fabrique de routes CRUD
│   │   ├── core/            configuration, sécurité, logs structurés
│   │   ├── db/              base déclarative, session, seed
│   │   ├── models/          20 tables SQLAlchemy
│   │   ├── schemas/         entrées/sorties Pydantic v2
│   │   ├── services/        stockage S3/local, email, audit
│   │   └── utils/           slugs, temps de lecture, helpers Markdown
│   ├── alembic/             migrations
│   └── tests/               43 tests (SQLite en mémoire)
│
├── web/                     Site public Next.js
│   └── src/
│       ├── app/[locale]/    pages : accueil, parcours, réalisations, blog, formations, contact
│       ├── components/      layout, sections, cartes, formulaire de contact
│       └── lib/             client API typé, i18n, utilitaires
│
├── admin/                   Console d'administration React/Vite
│   └── src/
│       ├── lib/resources.ts registre déclaratif des 18 entités gérées
│       ├── components/      formulaire générique, champs bilingues, médias
│       └── pages/           tableau de bord, CRUD, paramètres, équipe, journal
│
├── infra/caddy/             reverse-proxy et TLS automatique
├── docs/                    architecture, déploiement, guide d'administration
├── .github/workflows/       CI, publication d'images, déploiements
├── docker-compose.yml       stack de développement complète
├── docker-compose.prod.yml  stack de production (images GHCR + Caddy)
└── Makefile                 raccourcis de développement
```

---

## Modèle de données

29 tables. Les champs traduisibles existent en deux colonnes (`titre_fr`,
`titre_en`) : l'API renvoie les deux langues dans une seule réponse, donc une
même entrée de cache sert les deux versions du site.

| Domaine | Tables |
| --- | --- |
| Comptes | `users`, `refresh_tokens`, `invitations`, `audit_logs` |
| Site | `site_settings`, `sections`, `nav_items`, `social_links`, `stats`, `testimonials` |
| Parcours | `experiences`, `education`, `certifications`, `skill_categories`, `skills`, `languages` |
| Contenus | `projects`, `posts`, `tags`, `project_tags`, `post_tags` |
| Communauté | `organizations`, `talks`, `playlists`, `videos` |
| Exploitation | `media_assets`, `contact_messages`, `page_views` |

---

## Rôles et partage d'accès

| Rôle | Droits |
| --- | --- |
| `owner` | Tout, y compris révoquer des accès. Le dernier propriétaire ne peut être ni supprimé ni rétrogradé. |
| `admin` | Gère les contenus **et** invite des membres — jamais à un rôle supérieur au sien. |
| `editor` | Crée, modifie, supprime et réordonne tous les contenus. |
| `viewer` | Consultation seule de l'administration. |

L'invitation envoie un lien signé valable 7 jours. Sans SMTP configuré, le lien
s'affiche une fois dans l'interface pour être transmis manuellement.

---

## API

Documentation interactive : `/docs` (Swagger) et `/redoc`.

**Public** — `GET /api/v1/…`

| Endpoint | Description |
| --- | --- |
| `/site` | Bundle complet de la page d'accueil en un appel |
| `/projects`, `/projects/{slug}` | Réalisations, filtrables et paginées |
| `/posts`, `/posts/{slug}` | Articles de blog |
| `/talks`, `/talks/{slug}` | Formations et interventions |
| `/playlists`, `/tags`, `/skills`, `/experiences`, … | Contenus par domaine |
| `/rss.xml`, `/sitemap.xml` | Flux et plan du site |
| `POST /contact` | Formulaire de contact |
| `POST /track` | Compteur de vues sans cookie |

**Administration** — `…/api/v1/admin/…`, authentification Bearer requise.
Chaque ressource expose `GET`, `POST`, `GET/{id}`, `PATCH/{id}`,
`DELETE/{id}` et `POST /reorder`.

Un éditeur connecté voit les brouillons sur le site public : les pages
publiques acceptent le jeton d'accès et basculent en mode prévisualisation.

---

## Déploiement

Deux chemins sont fournis et testés, au choix.

**1. VPS auto-hébergé** — `docker-compose.prod.yml` + Caddy (HTTPS automatique).
GitHub Actions construit les images, les pousse sur GHCR, puis se connecte en
SSH pour les tirer et redémarrer la stack.

**2. PaaS** — site et administration sur Vercel, API sur Render ou Fly.io,
base sur Supabase ou Neon. Chaque étape du workflow s'ignore proprement si ses
secrets ne sont pas renseignés.

Procédure complète, secrets à créer et configuration Supabase :
**[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)**.

---

## CI/CD

| Workflow | Déclencheur | Rôle |
| --- | --- | --- |
| `backend-ci.yml` | push / PR sur `backend/**` | Ruff, pytest + couverture, migrations sur PostgreSQL, `alembic check`, seed idempotent |
| `frontend-ci.yml` | push / PR sur `web/**` ou `admin/**` | Typecheck, ESLint, build de production, audit npm |
| `docker-smoke.yml` | PR touchant Docker ou le backend | Démarre la stack et vérifie API, seed et authentification |
| `docker-publish.yml` | push sur `main`, tags `v*` | Construit et publie les 3 images sur GHCR |
| `deploy-vps.yml` | après publication des images | Déploiement SSH + contrôle de santé |
| `deploy-paas.yml` | push sur `main` | Vercel, Render/Fly, migrations |
| `codeql.yml` | push / PR / hebdomadaire | Analyse de sécurité Python et TypeScript |

---

## Documentation détaillée

- **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** — décisions techniques et leur justification
- **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)** — mise en production pas à pas
- **[docs/ADMIN.md](docs/ADMIN.md)** — guide d'utilisation de l'administration
- **[backend/README.md](backend/README.md)** — détails de l'API

---

## Licence

MIT — voir [LICENSE](LICENSE).

## Contact

**Sèdjro Abraham Zacharie KOLOBOE** — Cloud Data Engineer · ML Engineer
[LinkedIn](https://www.linkedin.com/in/abraham-zacharie-koloboe-data-science-ia-generative-llms-machine-learning/) ·
[GitHub](https://github.com/abrahamkoloboe27) ·
[YouTube](https://www.youtube.com/@abrahamkoloboe978) ·
abklb27@gmail.com
