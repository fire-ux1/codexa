# Codexa Project Features & Tech Stack

This document lists the active capabilities, functional features, and technology stack currently implemented in the **Codexa (CodePilot AI)** platform.

---

## 🛠️ Technology Stack

### Frontend

- **Framework**: React 19
- **Build Tool**: Vite
- **Styling**: TailwindCSS (v4) with Vanilla CSS tokens
- **Code Editor**: Monaco Editor (`@monaco-editor/react`)
- **Graph Visualization**: React Flow (`@xyflow/react`) for module dependency maps and call graphs
- **Icons**: Lucide React

### Backend

- **Framework**: FastAPI (Python 3.11)
- **Task Queue**: Celery (with Redis as the message broker)
- **Database**: PostgreSQL (with SQLAlchemy ORM & Alembic migrations)
- **Vector Database**: Qdrant (for semantic code search and AST embeddings)
- **Object Storage**: MinIO (S3-compatible bucket storage for repository caching)
- **Authentication**: JWT (JSON Web Tokens), OAuth2 placeholders (Google, GitHub)

### Observability & Telemetry

- **Metrics**: Prometheus & Prometheus FastAPI Instrumentator
- **Logging**: Grafana Loki & Promtail
- **APM**: OpenTelemetry (OTEL) Collector
- **Dashboards**: Grafana

---

## 🚀 Implemented Features

### 1. Workspace Codebase Indexing

- Background scanning of repositories using Celery task runners.
- AST parsing to extract classes, functions, modules, and dependencies.
- Vector database embedding generation and indexing in Qdrant.

### 2. Multi-Agent AI Assistant

- Interactive Chat pane with customizable AI system agents (e.g., Auto Coordinator, Code Architect, Security Auditor).
- Code Intelligence commands:
  - Collaborative Code Reviews
  - Bug Analysis
  - Refactoring Assistance
  - Automated Unit Test Generation
  - Documentation Generation

### 3. Visual Dependency Mapping

- Interactive module dependency graph showing import structures, references, and circular loops.
- File-level call graph mapping.

### 4. Collaborative Engineering Workspaces

- WebSocket-based real-time workspace collaboration.
- Shared bookmarks, developer notes, session profiles, and context pins.

### 5. Enterprise Trust & Administration Panel

- Role-Based Access Control (RBAC) select options (Owner, Admin, Member, Viewer).
- IP-tracked security audit trails with custom CSV exporting.
- Interactive permissions capability matrix.
- MFA (Multi-Factor Authentication) configuration modals.

### 6. Analytics Telemetry

- Doughnut charts displaying codebase language composition.
- LLM Token consumption graphs (Input vs. Output context usage).
- Calendar heatmap tracking developer workspace activity logs.
