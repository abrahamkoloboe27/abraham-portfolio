.DEFAULT_GOAL := help
SHELL := /bin/bash

PY := backend/.venv/bin
COMPOSE := docker compose

.PHONY: help
help: ## Affiche cette aide
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-22s\033[0m %s\n", $$1, $$2}'

# ---------------------------------------------------------------- install
.PHONY: install
install: install-backend install-web install-admin ## Installe toutes les dépendances

.PHONY: install-backend
install-backend: ## Crée le venv Python et installe le backend
	cd backend && uv venv --python 3.14 .venv && uv pip install --python .venv/bin/python -e ".[dev]"

.PHONY: install-web
install-web: ## Installe les dépendances du site public
	cd web && npm ci

.PHONY: install-admin
install-admin: ## Installe les dépendances de l'administration
	cd admin && npm ci

# -------------------------------------------------------------------- dev
.PHONY: dev
dev: ## Lance toute la stack avec Docker Compose
	$(COMPOSE) up -d --build
	@echo "Site   : http://localhost:3000"
	@echo "Admin  : http://localhost:5173"
	@echo "API    : http://localhost:8000/docs"
	@echo "Mail   : http://localhost:8025"

.PHONY: down
down: ## Arrête la stack
	$(COMPOSE) down

.PHONY: reset
reset: ## Arrête la stack ET supprime les volumes (données perdues)
	$(COMPOSE) down -v

.PHONY: logs
logs: ## Suit les logs de tous les services
	$(COMPOSE) logs -f

.PHONY: dev-api
dev-api: ## Lance l'API en rechargement à chaud
	cd backend && .venv/bin/uvicorn app.main:app --reload --port 8000

.PHONY: dev-web
dev-web: ## Lance le site public en mode développement
	cd web && npm run dev

.PHONY: dev-admin
dev-admin: ## Lance l'administration en mode développement
	cd admin && npm run dev

# --------------------------------------------------------------- database
.PHONY: migrate
migrate: ## Applique les migrations Alembic
	cd backend && .venv/bin/alembic upgrade head

.PHONY: migration
migration: ## Génère une migration (make migration m="ajout du champ x")
	cd backend && .venv/bin/alembic revision --autogenerate -m "$(m)"

.PHONY: downgrade
downgrade: ## Revient d'une migration en arrière
	cd backend && .venv/bin/alembic downgrade -1

.PHONY: seed
seed: ## Remplit la base avec les données de référence
	cd backend && .venv/bin/python -m app.db.seed

.PHONY: seed-reset
seed-reset: ## Recrée le schéma puis réinjecte les données (destructif)
	cd backend && .venv/bin/python -m app.db.seed --reset

# ------------------------------------------------------------------ tests
.PHONY: test
test: ## Lance la suite de tests du backend
	cd backend && .venv/bin/pytest

.PHONY: test-cov
test-cov: ## Tests avec rapport de couverture
	cd backend && .venv/bin/pytest --cov=app --cov-report=term-missing

.PHONY: lint
lint: ## Vérifie le style des trois services
	cd backend && .venv/bin/ruff check . && .venv/bin/ruff format --check .
	cd web && npm run lint && npm run typecheck
	cd admin && npm run lint && npm run typecheck

.PHONY: format
format: ## Formate le code du backend
	cd backend && .venv/bin/ruff check . --fix && .venv/bin/ruff format .

.PHONY: build
build: ## Construit le site public et l'administration
	cd web && npm run build
	cd admin && npm run build

.PHONY: check
check: lint test ## Lint + tests (à lancer avant de pousser)

# ------------------------------------------------------------- production
.PHONY: prod-up
prod-up: ## Démarre la stack de production (images GHCR + Caddy)
	$(COMPOSE) -f docker-compose.prod.yml up -d

.PHONY: prod-pull
prod-pull: ## Récupère les dernières images et redémarre
	$(COMPOSE) -f docker-compose.prod.yml pull
	$(COMPOSE) -f docker-compose.prod.yml up -d

.PHONY: prod-logs
prod-logs: ## Suit les logs de production
	$(COMPOSE) -f docker-compose.prod.yml logs -f
