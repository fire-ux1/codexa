from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.repository import router as repo_router
from api.scanner import router as scanner_router
from api.indexer import router as indexer_router
from api.search import router as search_router
from api.ask import router as ask_router
from api.architecture import router as architecture_router
from api.review import router as review_router
from api.graph import router as graph_router
from api.call_graph import router as call_graph_router
from api.flow import router as flow_router
from api.auth import router as auth_router
from api.repositories import router as repositories_router
from api.symbols import router as symbols_router
from api.analytics import router as analytics_router
from api.workspace import router as workspace_router
from api.patch import router as patch_router
from api.git import router as git_router
from api.agents import router as agents_router
from api.knowledge import router as knowledge_router
from api.planner import router as planner_router
from api.collaboration import router as collaboration_router
from api.devops import router as devops_router
from settings import get_settings
from services.db_service import init_db

settings = get_settings()

app = FastAPI(title=settings.api_title, version=settings.api_version)

# Initialize the SQLite database on app load
init_db()

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(repo_router, prefix="/repository", tags=["Repository"])
app.include_router(auth_router, prefix="/auth", tags=["Authentication"])
app.include_router(repositories_router, prefix="/repositories", tags=["Repositories"])


@app.get("/")
def root():
    return {"message": "CodePilot AI Running"}


@app.get("/health")
def health():
    return {
        "status": "healthy",
        "service": "CodePilot AI",
        "version": settings.api_version,
    }


app.include_router(scanner_router, prefix="/scanner", tags=["Scanner"])

app.include_router(indexer_router, prefix="/indexer", tags=["Indexer"])

app.include_router(search_router, prefix="/search", tags=["Search"])

app.include_router(ask_router, prefix="/ai", tags=["AI Assistant"])

app.include_router(architecture_router, prefix="/repository", tags=["Architecture"])

app.include_router(review_router, prefix="/review", tags=["Review"])

app.include_router(graph_router, prefix="/repository", tags=["Graph"])

app.include_router(call_graph_router, prefix="/repository", tags=["Call Graph"])

app.include_router(flow_router, prefix="/repository", tags=["Flow"])
app.include_router(symbols_router, prefix="/symbols", tags=["Symbols"])
app.include_router(analytics_router, prefix="/repository", tags=["Analytics"])
app.include_router(workspace_router, prefix="/workspace", tags=["AI Workspace"])
app.include_router(patch_router, prefix="/ai", tags=["AI Patch Generation"])
app.include_router(git_router, prefix="/git", tags=["Git Intelligence"])
app.include_router(agents_router, prefix="/ai", tags=["AI Agents"])
app.include_router(knowledge_router, prefix="/knowledge", tags=["AI Knowledge Graph"])
app.include_router(planner_router, prefix="/planner", tags=["Autonomous Task Planner"])
app.include_router(collaboration_router, prefix="/collaboration", tags=["Team Collaboration"])
app.include_router(devops_router, prefix="/devops", tags=["AI DevOps & Documentation"])

