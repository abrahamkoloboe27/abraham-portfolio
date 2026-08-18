# Portfolio API — FastAPI

Backend du portfolio de **Sèdjro Abraham Zacharie KOLOBOE**.
Il sert à la fois le site public (contenus bilingues, RSS, sitemap) et la console
d'administration (CRUD complet, médias, partage d'accès, statistiques).

## Stack

| Rôle | Choix |
| --- | --- |
| Framework | FastAPI (Python 3.12) |
| ORM | SQLAlchemy 2.0 (async, `asyncpg`) |
| Migrations | Alembic (driver sync `psycopg`) |
| Base de données | PostgreSQL — Supabase / Neon / local |
| Stockage fichiers | Supabase Storage, MinIO ou disque local (S3-compatible) |
| Auth | JWT access + refresh rotatif, RBAC 4 rôles |

## Démarrage local

```bash
uv venv --python 3.12 .venv
uv pip install --python .venv/bin/python -e ".[dev]"
cp ../.env.example ../.env      # puis renseigner DATABASE_URL
.venv/bin/alembic upgrade head
.venv/bin/python -m app.db.seed
.venv/bin/uvicorn app.main:app --reload
```

Documentation interactive : <http://localhost:8000/docs>

## Rôles

| Rôle | Peut |
| --- | --- |
| `owner` | tout, y compris supprimer des accès — compte protégé, jamais supprimable s'il est le dernier |
| `admin` | gérer les contenus **et** inviter/modifier des membres (jamais au-dessus de son propre rôle) |
| `editor` | créer, modifier, supprimer et réordonner tous les contenus |
| `viewer` | lecture seule de l'administration (statistiques, contenus, messages) |

## Structure

```
app/
├── api/
│   ├── deps.py            # session DB, utilisateur courant, garde-fous de rôle
│   └── v1/
│       ├── public/        # endpoints non authentifiés (site, contenus, flux)
│       └── admin/         # auth, équipe, médias, messages, tableau de bord
│           └── factory.py # fabrique de routes CRUD (liste/créer/lire/modifier/supprimer/réordonner)
├── core/                  # configuration, sécurité, logs structurés
├── db/                    # base déclarative, session, seed
├── models/                # 20 tables SQLAlchemy
├── schemas/               # entrées/sorties Pydantic v2
├── services/              # stockage, email, audit
└── utils/                 # slugs, temps de lecture, helpers Markdown
```

## Tests

```bash
.venv/bin/pytest
```

Les tests tournent sur SQLite en mémoire (`aiosqlite`) : aucune base externe requise.
