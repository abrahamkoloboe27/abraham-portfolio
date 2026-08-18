# Déploiement

Deux chemins sont fournis. Le **VPS** donne un seul endroit à administrer pour
un coût fixe ; le **PaaS** évite toute administration serveur.

---

## 1. Base de données — Supabase

1. Créez un projet sur <https://supabase.com>.
2. **Project Settings → Database → Connection string → URI**, puis copiez la
   chaîne *Session pooler* (port `5432`) :
   ```
   postgresql://postgres.<ref>:<mot-de-passe>@aws-0-<region>.pooler.supabase.com:5432/postgres
   ```
   Le préfixe est normalisé automatiquement en `postgresql+asyncpg://` par
   l'application : collez la chaîne telle quelle dans `DATABASE_URL`.
3. **Storage → Create bucket** : nom `portfolio-media`, coché **Public**.
4. **Project Settings → Storage → S3 Connection** : générez une clé d'accès et
   notez l'endpoint. Renseignez ensuite :

   ```bash
   STORAGE_BACKEND=s3
   S3_ENDPOINT_URL=https://<ref>.supabase.co/storage/v1/s3
   S3_PUBLIC_BASE_URL=https://<ref>.supabase.co/storage/v1/object/public
   S3_BUCKET=portfolio-media
   S3_ACCESS_KEY_ID=<clé>
   S3_SECRET_ACCESS_KEY=<secret>
   S3_REGION=<region>
   ```

> **Neon** fonctionne à l'identique pour la base. Le stockage doit alors être
> assuré par un autre service S3 (MinIO auto-hébergé, Cloudflare R2, AWS S3) :
> seules les variables `S3_*` changent.

### Appliquer le schéma

```bash
cd backend
DATABASE_URL="postgresql+asyncpg://…" .venv/bin/alembic upgrade head
DATABASE_URL="postgresql+asyncpg://…" .venv/bin/python -m app.db.seed
```

Le seed est **idempotent** : il crée ce qui manque et met à jour le reste, sans
jamais dupliquer. En production, le conteneur applique les migrations au
démarrage (`RUN_MIGRATIONS=true`) ; le seed reste désactivé (`RUN_SEED=false`).

---

## 2. Déploiement VPS (Docker Compose + Caddy)

### 2.1 Préparer le serveur

Un serveur Ubuntu 22.04+ avec 2 Go de RAM suffit.

```bash
# Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker "$USER" && newgrp docker

# Dossier applicatif
mkdir -p ~/abraham-portfolio && cd ~/abraham-portfolio
```

Faites pointer trois enregistrements DNS de type `A` vers l'IP du serveur :

| Nom | Usage |
| --- | --- |
| `abrahamkoloboe.dev` | site public |
| `admin.abrahamkoloboe.dev` | console d'administration |
| `api.abrahamkoloboe.dev` | API |

### 2.2 Configurer l'environnement

Créez `~/abraham-portfolio/.env` :

```bash
DOMAIN=abrahamkoloboe.dev
ADMIN_DOMAIN=admin.abrahamkoloboe.dev
API_DOMAIN=api.abrahamkoloboe.dev
ACME_EMAIL=abklb27@gmail.com

DATABASE_URL=postgresql+asyncpg://postgres.<ref>:<mdp>@aws-0-<region>.pooler.supabase.com:5432/postgres
SECRET_KEY=<openssl rand -hex 32>

FIRST_SUPERUSER_EMAIL=abklb27@gmail.com
FIRST_SUPERUSER_PASSWORD=<mot de passe fort>

STORAGE_BACKEND=s3
S3_ENDPOINT_URL=https://<ref>.supabase.co/storage/v1/s3
S3_PUBLIC_BASE_URL=https://<ref>.supabase.co/storage/v1/object/public
S3_BUCKET=portfolio-media
S3_ACCESS_KEY_ID=<clé>
S3_SECRET_ACCESS_KEY=<secret>

SMTP_HOST=smtp.example.com
SMTP_USER=<utilisateur>
SMTP_PASSWORD=<mot de passe>
EMAILS_FROM_EMAIL=no-reply@abrahamkoloboe.dev
CONTACT_NOTIFY_EMAIL=abklb27@gmail.com

REGISTRY=ghcr.io/abrahamkoloboe27/abraham-portfolio
TAG=latest
```

```bash
chmod 600 .env
```

### 2.3 Premier démarrage

```bash
# Les images sont privées par défaut : authentifiez-vous une fois.
echo "<votre-token-github>" | docker login ghcr.io -u abrahamkoloboe27 --password-stdin

docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml logs -f
```

Caddy obtient les certificats TLS automatiquement en quelques secondes.

Créez le compte propriétaire une seule fois :

```bash
docker compose -f docker-compose.prod.yml run --rm -e RUN_SEED=true api \
  python -m app.db.seed
```

### 2.4 Déploiements suivants

Ils sont automatiques : chaque push sur `main` publie les images puis déclenche
`deploy-vps.yml`. Secrets à créer dans **Settings → Secrets and variables →
Actions** :

| Secret | Valeur |
| --- | --- |
| `VPS_HOST` | IP ou nom d'hôte du serveur |
| `VPS_USER` | utilisateur SSH |
| `VPS_SSH_KEY` | clé privée SSH (format OpenSSH complet) |
| `VPS_PORT` | port SSH, si différent de 22 |
| `VPS_APP_DIR` | chemin applicatif, si différent de `~/abraham-portfolio` |

Variables (onglet *Variables*, pas *Secrets*) — elles sont inlinées dans les
bundles frontend au moment du build :

| Variable | Valeur |
| --- | --- |
| `PUBLIC_SITE_URL` | `https://abrahamkoloboe.dev` |
| `API_PUBLIC_URL` | `https://api.abrahamkoloboe.dev` |

Déploiement manuel : `make prod-pull` sur le serveur.

---

## 3. Déploiement PaaS

### 3.1 Site public sur Vercel

1. **Add New → Project**, importez le dépôt.
2. **Root Directory** : `web`. Le framework est détecté automatiquement.
3. Variables d'environnement :
   ```
   NEXT_PUBLIC_API_URL=https://<votre-api>
   NEXT_PUBLIC_SITE_URL=https://<votre-domaine>
   ```

### 3.2 Console d'administration sur Vercel

Second projet, **Root Directory** : `admin`.

| Réglage | Valeur |
| --- | --- |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Variables | `VITE_API_URL`, `VITE_SITE_URL` |

Ajoutez `admin/vercel.json` pour le routage SPA :

```json
{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
```

### 3.3 API sur Render

1. **New → Web Service**, dépôt connecté, **Root Directory** `backend`,
   runtime **Docker**.
2. Variables : `DATABASE_URL`, `SECRET_KEY`, `PUBLIC_SITE_URL`,
   `ADMIN_SITE_URL`, `API_PUBLIC_URL`, `CORS_ORIGINS`, les `S3_*` et les `SMTP_*`.
3. Health check path : `/health`.
4. Copiez le **Deploy Hook** dans le secret GitHub `RENDER_DEPLOY_HOOK`.

### 3.4 API sur Fly.io (alternative)

```bash
cd backend
fly launch --no-deploy            # génère fly.toml
fly secrets set DATABASE_URL="…" SECRET_KEY="…" S3_ACCESS_KEY_ID="…"
fly deploy
```

Puis créez le secret GitHub `FLY_API_TOKEN` (`fly tokens create deploy`).

### 3.5 Secrets GitHub pour le PaaS

| Secret | Utilisé par |
| --- | --- |
| `VERCEL_TOKEN`, `VERCEL_ORG_ID` | les deux projets Vercel |
| `VERCEL_PROJECT_ID_WEB` | site public |
| `VERCEL_PROJECT_ID_ADMIN` | console d'administration |
| `RENDER_DEPLOY_HOOK` | API sur Render |
| `FLY_API_TOKEN` | API sur Fly.io |
| `DATABASE_URL`, `SECRET_KEY` | migrations en CI |

Un secret absent fait simplement passer l'étape correspondante : activez ce que
vous utilisez, ignorez le reste.

---

## 4. Après la mise en ligne

- [ ] Changer le mot de passe du compte propriétaire depuis l'administration.
- [ ] Vérifier `https://<domaine>/sitemap.xml` et `robots.txt`.
- [ ] Soumettre le sitemap dans Google Search Console.
- [ ] Tester le formulaire de contact de bout en bout.
- [ ] Téléverser une photo de profil et une image de partage (OpenGraph).
- [ ] Renseigner les URL de CV dans _Paramètres → Visuels & CV_.
- [ ] Inviter d'éventuels collaborateurs avec le rôle minimal nécessaire.

---

## 5. Exploitation

```bash
# Journaux
docker compose -f docker-compose.prod.yml logs -f api

# Sauvegarde de la base (Supabase gère aussi ses propres sauvegardes)
pg_dump "$DATABASE_URL" | gzip > backup-$(date +%F).sql.gz

# Restauration
gunzip -c backup-2026-08-18.sql.gz | psql "$DATABASE_URL"

# Revenir à une version précédente
TAG=v1.2.0 docker compose -f docker-compose.prod.yml up -d

# Annuler une migration
docker compose -f docker-compose.prod.yml exec api alembic downgrade -1
```

### Diagnostic

| Symptôme | Cause probable |
| --- | --- |
| `failed to resolve host '…@…'` | le mot de passe de la base contient un caractère spécial non encodé — voir ci-dessous |
| `503` sur `/api/v1/site` | la base est vide — lancez le seed |
| Erreur CORS dans le navigateur | `PUBLIC_SITE_URL` / `ADMIN_SITE_URL` ne correspondent pas aux domaines réels |
| Le site affiche « API injoignable » | conteneur `api` arrêté ou `DATABASE_URL` invalide |
| Images non affichées | `S3_PUBLIC_BASE_URL` incorrect ou bucket non public |
| Le certificat TLS n'est pas émis | DNS non propagé, ou ports 80/443 fermés |

### Mot de passe contenant un caractère spécial

libpq découpe les identifiants au **premier** `@`. Un mot de passe qui en
contient un pousse donc le reste dans le nom d'hôte, et l'erreur ne se manifeste
que bien plus tard, sous une forme trompeuse :

```
failed to resolve host 'Suffixe@aws-0-eu-central-1.pooler.supabase.com'
```

L'application refuse désormais une URL ambiguë au démarrage, avec le remède.
Pour construire l'URL correcte sans exposer le mot de passe dans l'historique :

```bash
python3 -c "import urllib.parse,getpass;p=getpass.getpass('Mot de passe: ');print(urllib.parse.quote(p,safe=''))"
```

Caractères à encoder : `@` → `%40`, `:` → `%3A`, `/` → `%2F`, `#` → `%23`,
`?` → `%3F`, `%` → `%25`.

Plus simple encore : régénérez un mot de passe long et alphanumérique depuis
*Project Settings → Database → Reset database password*.
