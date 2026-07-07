# ══════════════════════════════════════════════════════════════════
# CodePilot AI — Makefile
# Common developer convenience targets.
# Usage: make <target>
# ══════════════════════════════════════════════════════════════════

.PHONY: help up down dev logs lint test build migrate clean

BACKEND_DIR = backend
COMPOSE     = docker-compose
COMPOSE_DEV = docker-compose -f docker-compose.yml -f docker-compose.dev.yml

help: ## Show this help message
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
	  awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

# ── Docker ──────────────────────────────────────────────────────────
up: ## Start all production services in detached mode
	$(COMPOSE) up -d

down: ## Stop all services and remove containers
	$(COMPOSE) down

dev: ## Start in development mode (hot reload, bind-mounted source)
	$(COMPOSE_DEV) up

logs: ## Tail logs for backend and worker
	$(COMPOSE) logs -f backend worker

build: ## Build backend and worker Docker images
	docker build -t codepilot-backend:latest -f $(BACKEND_DIR)/Dockerfile $(BACKEND_DIR)
	docker build -t codepilot-worker:latest  -f $(BACKEND_DIR)/Dockerfile.worker $(BACKEND_DIR)

# ── Code Quality ────────────────────────────────────────────────────
lint: ## Run ruff lint + format check
	cd $(BACKEND_DIR) && ruff check .
	cd $(BACKEND_DIR) && ruff format --check .

format: ## Auto-format all Python files
	cd $(BACKEND_DIR) && ruff format .

# ── Testing ─────────────────────────────────────────────────────────
test: ## Run all unit tests
	cd $(BACKEND_DIR) && python -m pytest --ignore=repos -v

# ── Database ────────────────────────────────────────────────────────
migrate: ## Initialize / migrate the database
	cd $(BACKEND_DIR) && python -c "from services.db_service import init_db; init_db(); print('DB ready')"

# ── Cleanup ─────────────────────────────────────────────────────────
clean: ## Remove __pycache__, .pytest_cache, and .ruff_cache
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name ".ruff_cache" -exec rm -rf {} + 2>/dev/null || true
	@echo "Clean done."
