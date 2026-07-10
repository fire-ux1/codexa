# 🚀 Codexa (CodePilot AI)

<p align="center">
  <b>An AI-powered codebase intelligence and collaboration platform that helps developers understand, document, and collaborate on complex repositories using RAG, semantic search, AST-based symbol analysis, and real-time collaboration.</b>
</p>

<p align="center">

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![FastAPI](https://img.shields.io/badge/FastAPI-0.136-009688?logo=fastapi)
![Python](https://img.shields.io/badge/Python-3.11-3776AB?logo=python)
![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?logo=postgresql)
![Redis](https://img.shields.io/badge/Redis-7-DC382D?logo=redis)
![Qdrant](https://img.shields.io/badge/Qdrant-Vector%20Store-red?logo=qdrant)
![MinIO](https://img.shields.io/badge/MinIO-S3%20Storage-C92A3E?logo=minio)
![License](https://img.shields.io/badge/License-MIT-green)

</p>

---

## ⚡ Quick Links

| 🌐 **Live Demo** | 📚 **Docs** | 💬 **Community** | 🚀 **Deploy** |
|---|---|---|---|
| [Frontend](https://codepilot-ai-wine.vercel.app/) | [Getting Started](documentation/getting-started.md) | [Discussions](https://github.com/abhishek-s12/codepilot-ai/discussions) | [Railway](#-one-click-deploy) |
| [API Docs](https://codepilot-backend-wx7u.onrender.com/docs) | [Architecture](documentation/architecture.md) | [Issues](https://github.com/abhishek-s12/codepilot-ai/issues) | [Docker](#-docker-compose-deployment) |

---

## 🎯 Why CodePilot AI?

Understanding a large or unfamiliar codebase is a **significant challenge**:
- 🤔 **Joining a new team?** Spend weeks navigating hundreds of files
- 📚 **Reviewing open-source?** Struggle to understand the architecture
- 🔍 **Analyzing legacy code?** Manual reading is slow and error-prone
- 🏢 **Enterprise scale?** Multiple teams need codebase context

**CodePilot AI solves this** by combining:
- ✨ **Semantic Search** — Ask questions in natural language
- 🧠 **AI Chat with RAG** — Get instant answers with file citations
- 🗺️ **Architecture Analysis** — Automatic project structure insights
- 📊 **Call Graphs** — Interactive dependency visualization
- 🔄 **Real-time Collaboration** — Analyze together with your team

---

## ⭐ Key Features

| Feature | Status | What It Does |
|---------|--------|-------------|
| **Clone GitHub Repository** | ✅ | Import public repos directly into your workspace |
| **Repository Scanner & Parser** | ✅ | Recursive scanning with intelligent AST parsing |
| **Semantic Code Indexing** | ✅ | AI embeddings for lightning-fast similarity search |
| **AI Repository Chat (RAG)** | ✅ | Ask anything about your codebase with source citations |
| **Architecture Analysis** | ✅ | Auto-generate high-level architectural insights |
| **Interactive Call Graph** | ✅ | Visual mapping of component dependencies |
| **Execution Flow Tracer** | ✅ | Understand how requests flow through your app |
| **Auth & RBAC** | ✅ | JWT, OAuth (GitHub/Google), personal API keys |
| **Real-time Collaboration** | ✅ | WebSocket-powered team workspaces |
| **Redis Cache & Rate Limiting** | ✅ | Production-grade performance & safety |
| **S3 / MinIO Storage** | ✅ | Secure encrypted file storage |
| **PDF/Markdown Export** | ⏳ | Coming soon: Generate documentation |

---

## 🚀 One-Click Deploy

Deploy CodePilot AI to your favorite cloud platform:

<div align="center">

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/codepilot-ai)
[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com)
[![Deploy to Vercel](https://vercel.com/button)](https://vercel.com)

</div>

Or use **Docker Compose** for local development (see below).

---

## ⚡ 5-Minute Quickstart

### Option 1: Docker Compose (Recommended)
```bash
# Clone the repository
git clone https://github.com/abhishek-s12/codepilot-ai.git
cd codepilot-ai

# Copy environment file
cp .env.example .env

# Start all services (PostgreSQL, Redis, Qdrant, Backend, Frontend, etc.)
docker compose up -d

# Frontend: http://localhost:5173
# API Docs: http://localhost:8000/docs
```

### Option 2: Local Development
```bash
# Backend
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload  # http://127.0.0.1:8000/docs

# Frontend (in another terminal)
cd frontend
npm install
npm run dev  # http://localhost:5173
```

### Option 3: Try the Live Demo
Visit [https://codepilot-ai-wine.vercel.app/](https://codepilot-ai-wine.vercel.app/) to explore pre-indexed repositories without any setup!

---

## 📖 Complete Documentation

For detailed guides and architecture diagrams, see our **[documentation/](documentation/)** folder:

- **[Introduction](documentation/introduction.md)** — Overview and core capabilities
- **[Getting Started Guide](documentation/getting-started.md)** — Step-by-step local setup
- **[System Architecture](documentation/architecture.md)** — Component design and data flows
- **[Developer & Operations Guide](documentation/development-guide.md)** — Alembic, testing, troubleshooting
- **[Production Deployment Guide](documentation/production-deployment.md)** — Kubernetes & Helm
- **[Design System Guidelines](documentation/design-system.md)** — UI/UX standards

---

## 🏗 System Architecture

```
                              User / Team
                                   │
                      WebSocket ╱ ╲ Axios API
                               ↙     ↘
                      React + Vite Frontend
                                  │
                                  ▼
                           FastAPI Backend
                                  │
       ┌───────────┬────────────┬──┴───────┬────────────┬──────────┐
       ▼           ▼            ▼          ▼            ▼          ▼
   Repository   Redis      PostgreSQL    Qdrant     OpenRouter   S3/MinIO
    Scanner    (Rate Limit/ (RDBMS/      (Vector      LLM        (Storage/
    (AST/Git)   Caching)   SQLite)       Store)     (AI Engine)  Encryption)
```

---

## 🛠 Tech Stack

### Frontend
- **React 19 & Vite 8** — Lightning-fast dev server and builds
- **Tailwind CSS v4** — Utility-first styling
- **XYFlow React** — Interactive graph visualization
- **Monaco Editor** — In-browser code editing with syntax highlighting
- **Axios** — Promise-based HTTP client

### Backend
- **FastAPI** — High-performance async web framework
- **Python 3.11** — Modern typing and features
- **Celery + Redis** — Distributed task queue for heavy operations
- **PostgreSQL** — Relational database (SQLite fallback for dev)
- **GitPython** — Repository cloning and Git operations
- **Boto3** — S3/MinIO object storage

### AI & Vector Store
- **Qdrant** — Production-grade vector database
- **Sentence Transformers** — Local embeddings (`all-MiniLM-L6-v2`)
- **OpenRouter** — Unified LLM API (OpenAI GPT-4o by default)

---

## 📡 REST API Endpoints

### 🔐 Authentication
```
POST   /auth/sandbox-login          # Development login
POST   /auth/refresh                # Refresh JWT token
GET    /auth/github/login           # GitHub OAuth
POST   /auth/keys                   # Generate personal API keys
```

### 📂 Repository Management
```
POST   /repository/clone            # Clone from GitHub
POST   /indexer/index               # Index and analyze repository
GET    /repositories                # List your repositories
```

### 🤖 AI Intelligence
```
POST   /ai/ask                      # Ask codebase questions
POST   /repository/architecture     # Get architecture insights
POST   /repository/call-graph       # Generate call dependencies
POST   /repository/flow             # Trace execution flows
```

Full API documentation: [https://codepilot-backend-wx7u.onrender.com/docs](https://codepilot-backend-wx7u.onrender.com/docs)

---

## ⚙️ Environment Variables

Create a `.env` file in the root directory:

```env
# LLM Provider (OpenRouter)
LLM_BASE_URL=https://openrouter.ai/api/v1
LLM_API_KEY=your-openrouter-api-key
LLM_MODEL=openai/gpt-4o-mini
LLM_APP_NAME=CodePilot AI
LLM_SITE_URL=http://localhost:5173

# Database
DATABASE_URL=postgresql://codepilot:codepilot_pass_123@localhost:5435/codepilot
# (Optional: Falls back to SQLite if not set)

# Redis Cache & Rate Limiting
REDIS_URL=redis://localhost:6379/0

# Qdrant Vector Store
QDRANT_HOST=localhost
QDRANT_PORT=6333

# S3 / MinIO Object Storage
S3_ENDPOINT_URL=http://localhost:9000
S3_ACCESS_KEY=minio_user
S3_SECRET_KEY=minio_password_123
S3_BUCKET_NAME=codepilot-storage

# Authentication
JWT_SECRET_KEY=change-this-to-a-long-random-secret-in-production
ALLOW_DEV_SANDBOX_LOGIN=true
ENFORCE_STRICT_AUTH=false  # Set to true in production
```

---

## 🐳 Docker Compose Deployment

### Quick Start
```bash
docker compose up -d
```

This starts all services:
- **codepilot-postgres** (Port 5435)
- **codepilot-redis** (Port 6379)
- **codepilot-qdrant** (Port 6333)
- **codepilot-minio** (Ports 9000/9001)
- **codepilot-backend** (Port 8000)
- **codepilot-worker** (Background tasks)
- **codepilot-nginx** (Reverse proxy on port 80)

### View Logs
```bash
docker compose logs -f backend worker
docker compose down
```

---

## 🛣️ Roadmap

### ✅ Completed
- ✅ Repository cloning & recursive scanning
- ✅ Qdrant Vector database integration
- ✅ Local embeddings with Sentence Transformers
- ✅ AI repository chat (RAG)
- ✅ Architecture analysis & insights
- ✅ Interactive Call graph & Flow visualization
- ✅ OAuth & JWT authentication with RBAC
- ✅ Redis-backed rate limiting & caching
- ✅ S3/MinIO storage with AES256 encryption
- ✅ Real-time collaboration via WebSockets
- ✅ Background task worker

### 🚀 Coming Soon
- ⏳ Multi-repository workspace support
- ⏳ Private repository support (GitHub token auth)
- ⏳ VS Code extension
- ⏳ PDF/Markdown documentation export
- ⏳ Streaming AI responses in chat
- ⏳ JetBrains IDE plugin
- ⏳ Security vulnerability scanning
- ⏳ Automated test generation from codebase

### 💡 Future Ideas
- Self-hosted deployment on Kubernetes
- Enterprise SSO & SAML support
- Custom LLM model support
- GitHub/GitLab/Bitbucket integrations
- Slack/Discord bot integration
- Plugin marketplace for custom analyzers

---

## 🤝 Contributing

Contributions are welcome! Help us make CodePilot AI better:

1. **Fork** the repository
2. **Create a branch** (`git checkout -b feature/amazing-feature`)
3. **Make your changes** with clear commits
4. **Push to branch** (`git push origin feature/amazing-feature`)
5. **Open a Pull Request**

### Development Setup
```bash
# See CONTRIBUTING.md for detailed guidelines
git clone https://github.com/abhishek-s12/codepilot-ai.git
cd codepilot-ai
docker compose -f docker-compose.dev.yml up
```

### Good First Issues
Look for issues tagged with `good-first-issue` to get started!

---

## 📊 Project Structure

```
codepilot-ai/
├── backend/
│   ├── api/              # REST API routes
│   ├── services/         # Business logic
│   ├── models/           # Database models
│   ├── parsers/          # AST analysis & parsing
│   ├── vector_store/     # Qdrant integration
│   ├── main.py           # FastAPI app
│   └── requirements.txt   # Dependencies
├── frontend/
│   ├── src/
│   │   ├── components/   # Reusable UI components
│   │   ├── tabs/         # Workspace views
│   │   └── App.jsx       # Main application
│   └── vite.config.js    # Build configuration
├── documentation/        # Detailed guides
├── helm/                 # Kubernetes Helm charts
├── docker-compose.yml    # Production stack
└── README.md
```

---

## 🎓 Use Cases

### 👨‍💼 For Engineering Managers
- Onboard new developers in days, not weeks
- Generate architecture documentation automatically
- Identify knowledge gaps in the team

### 👨‍💻 For Developers
- Understand unfamiliar codebases instantly
- Find and trace specific functionality quickly
- Collaborate with teammates on analysis

### 🔒 For Security Teams
- Audit codebases for security patterns
- Find authentication/authorization vulnerabilities
- Map data flows for compliance analysis

### 📚 For Open Source
- Understand complex projects before contributing
- Generate contributor documentation
- Reduce onboarding friction

---

## 📞 Support & Community

- **🐛 Report Bugs** → [GitHub Issues](https://github.com/abhishek-s12/codepilot-ai/issues)
- **💬 Ask Questions** → [GitHub Discussions](https://github.com/abhishek-s12/codepilot-ai/discussions)
- **📧 Email** → [abhishek@example.com](mailto:abhishek@example.com)
- **🐦 Twitter** → [@CodePilotAI](https://twitter.com)

---

## 👨‍💻 Author

**Abhishek Kumar**

- GitHub: [@abhishek-s12](https://github.com/abhishek-s12)
- LinkedIn: [abhishek-s12](https://linkedin.com/in/abhishek-s12)

---

## 📄 License

This project is licensed under the **MIT License**. See [LICENSE](LICENSE) for details.

---

## 🌟 Show Your Support

If you find CodePilot AI useful, please:
- ⭐ **Star this repository** (it really helps!)
- 🍴 **Fork and contribute** new features
- 📢 **Share** with your network
- 💬 **Provide feedback** on GitHub Discussions

<p align="center">
  <b>Made with ❤️ by the CodePilot AI community</b>
</p>

<p align="center">
  <a href="https://github.com/abhishek-s12/codepilot-ai">⭐ Star us on GitHub</a>
</p>
