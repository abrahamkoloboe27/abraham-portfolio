# Architecture

Les décisions structurantes du projet et ce qui les motive.

---

## Principe directeur

Le portfolio doit évoluer **sans redéploiement**. Ajouter une réalisation,
publier un article, réordonner la page d'accueil, voire créer une section
entière : tout passe par l'administration. Le code ne contient donc aucun
contenu — seulement la manière de le rendre.

Conséquence directe : la page d'accueil n'est pas une composition figée, mais
la projection d'une table `sections` ordonnée.

---

## Bilinguisme : deux colonnes plutôt que deux lignes

Chaque champ traduisible existe en deux colonnes (`title_fr`, `title_en`)
plutôt qu'en lignes séparées dans une table de traductions.

**Pourquoi.** Une table de traductions impose une jointure sur presque toutes
les requêtes et complique l'édition (créer une ligne par langue avant de
pouvoir saisir un titre). Deux colonnes gardent les requêtes plates et rendent
l'état « traduit / pas encore traduit » lisible d'un coup d'œil dans l'admin.

**L'API renvoie les deux langues à la fois.** Une seule entrée de cache sert
les deux versions du site, et la bascule de langue côté client ne déclenche
aucune requête. Le surcoût de charge utile est négligeable à cette échelle ; le
gain en simplicité de cache ne l'est pas.

Côté frontend, un helper unique résout la langue avec repli automatique :

```ts
pick(project, "title", "en")  // title_en, ou title_fr s'il est vide
```

Un contenu partiellement traduit reste donc toujours affichable.

---

## Une fabrique de routes plutôt que dix-huit routers

`backend/app/api/v1/admin/factory.py` génère, pour chaque entité, la liste
paginée avec recherche et filtres, la création, la lecture, la mise à jour, la
suppression et le réordonnancement.

**Pourquoi.** Dix-huit routers manuscrits, c'est dix-huit occasions d'oublier un
contrôle de rôle, une entrée d'audit ou un contrôle d'unicité. Une fabrique
applique les mêmes garanties partout, et une correction profite immédiatement à
toutes les entités.

Le registre des ressources vit dans `admin/__init__.py` :

```python
dict(
    prefix="/projects",
    model=Project,
    create_schema=schemas.ProjectCreate,
    search_fields=("slug", "title_fr", "title_en"),
    filter_fields=("status", "category", "is_featured"),
    unique_fields=("slug",),
    on_create=_sync_tags,
)
```

Des points d'extension (`on_create`, `on_update`) couvrent les cas particuliers —
synchroniser les tags, recalculer le temps de lecture — sans casser le moule.

> `factory.py` n'utilise volontairement pas `from __future__ import annotations` :
> les routes générées annotent leur corps avec les *variables* de schéma, ce qui
> exige une évaluation des annotations à la définition.

La console d'administration applique la même idée côté client :
`admin/src/lib/resources.ts` décrit colonnes et champs, et un formulaire
générique en dérive l'interface. Ajouter une entité gérée demande une entrée
dans chacun des deux registres — pas une nouvelle page.

---

## Authentification

- **Access token** JWT de 30 minutes, porté par l'en-tête `Authorization`.
- **Refresh token** de 30 jours, **rotatif** : chaque rafraîchissement révoque
  le précédent, ce qui rend tout rejeu détectable et inopérant.
- Seul le **SHA-256** du refresh token est stocké : une fuite de la base ne
  permet pas de rejouer une session.
- Changer de mot de passe révoque toutes les autres sessions.
- La connexion vérifie un hash de référence même quand le compte n'existe pas,
  pour que succès et échec prennent le même temps — pas d'énumération de comptes
  par mesure de latence.

Les jetons sont conservés dans `localStorage`. Ce choix expose au XSS, mais
l'administration ne rend jamais de HTML brut (`react-markdown` sans
`rehype-raw`) et n'affiche que du contenu saisi par des comptes authentifiés.
Un cookie `HttpOnly` serait plus strict au prix d'un couplage de domaines
incompatible avec le déploiement PaaS où l'API vit sur un hôte distinct.

### Rôles

Quatre niveaux ordonnés (`owner` 40, `admin` 30, `editor` 20, `viewer` 10).
Une dépendance FastAPI compare le niveau requis à celui de l'appelant. Deux
invariants sont vérifiés côté serveur, pas seulement dans l'interface :

- personne n'attribue un rôle supérieur au sien ;
- le dernier propriétaire ne peut être ni supprimé ni rétrogradé.

---

## Stockage des fichiers

`app/services/storage.py` expose une interface à trois méthodes avec deux
implémentations : disque local et S3. Supabase Storage, MinIO et AWS S3
partagent la même API S3 — seules les variables d'environnement changent entre
le poste de développement et la production.

Les fichiers sont dédupliqués par empreinte SHA-256 : téléverser deux fois la
même image réutilise l'entrée existante au lieu de la dupliquer.

---

## Analytics sans cookie

Chaque vue enregistre un hash de `IP + User-Agent + date du jour + SECRET_KEY`.
Il permet de compter des visiteurs uniques par jour sans jamais stocker
d'identifiant stable ni déposer de cookie : le hash change chaque nuit et n'est
pas réversible. Aucune bannière de consentement n'est donc requise.

---

## Rendu du site public

Next.js en App Router avec ISR (`revalidate = 300`). Les pages sont générées
statiquement et rafraîchies en arrière-plan toutes les cinq minutes : le
visiteur reçoit du HTML pré-rendu, et une publication apparaît sans
redéploiement.

`GET /api/v1/site` renvoie en une requête tout ce dont la page d'accueil a
besoin — paramètres, sections, parcours, compétences, projets à la une,
derniers articles, formations, playlists. Une seule entrée de cache, un seul
aller-retour.

Un éditeur connecté voit les brouillons : les endpoints publics acceptent un
jeton d'accès et basculent en prévisualisation, ce qui évite un environnement de
préproduction séparé.

Le Markdown est rendu sans `rehype-raw` : le HTML brut stocké en base n'est
jamais exécuté.

---

## Migrations

Alembic pilote le schéma, avec le driver synchrone `psycopg` — l'application
utilise `asyncpg`, la migration n'a pas besoin d'asynchrone.

La CI exécute `alembic check` après `upgrade head` : un modèle modifié sans
migration correspondante fait échouer la CI. `env.py` ignore les schémas gérés
par Supabase (`auth`, `storage`, `realtime`) pour qu'ils n'apparaissent jamais
dans une autogénération.

---

## Tests

43 tests sur SQLite en mémoire (`aiosqlite`), sans base externe : le suite
complète tourne en quelques secondes en local comme en CI. Les colonnes UUID
utilisent `sqlalchemy.Uuid` (natif sur PostgreSQL, `CHAR(32)` ailleurs) et les
colonnes JSON une variante `JSONB` côté PostgreSQL.

La compatibilité PostgreSQL réelle est couverte séparément : la CI applique les
migrations et rejoue le seed sur un vrai PostgreSQL, et `docker-smoke.yml`
démarre la stack complète pour vérifier l'API, le seed et l'authentification.

---

## Ce qui a été écarté

| Option | Raison |
| --- | --- |
| CMS headless (Strapi, Directus) | Le modèle de données est spécifique — sections ordonnables, talks liés à des organisations, playlists. Un CMS générique aurait imposé ses contraintes sans supprimer le besoin d'une API dédiée. |
| GraphQL | Peu de consommateurs, requêtes prévisibles. REST reste plus simple à mettre en cache au niveau HTTP. |
| Monorepo outillé (Turborepo, Nx) | Trois services indépendants aux cycles de vie distincts. Un `Makefile` et des workflows CI par service suffisent. |
| Redis | Le cache ISR de Next.js et les en-têtes HTTP couvrent le besoin. Un service de plus à exploiter pour un gain nul à cette échelle. |
| Table de traductions | Voir plus haut : jointures systématiques et édition plus lourde. |
