from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi.middleware.cors import CORSMiddleware
import time
from collections import defaultdict

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
from api.observability import router as observability_router
from settings import get_settings
from services.db_service import init_db

class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, limit_seconds: int = 60, max_requests: int = 200):
        super().__init__(app)
        self.limit_seconds = limit_seconds
        self.max_requests = max_requests
        self.request_history = defaultdict(list)

    async def dispatch(self, request: Request, call_next):
        if request.url.path in {"/health", "/"}:
            return await call_next(request)
        client_ip = request.client.host if request.client else "unknown"
        current_time = time.time()
        
        self.request_history[client_ip] = [
            t for t in self.request_history[client_ip]
            if current_time - t < self.limit_seconds
        ]
        
        if len(self.request_history[client_ip]) >= self.max_requests:
            return JSONResponse(
                status_code=429,
                content={"detail": "Too many requests. Please try again later."}
            )
            
        self.request_history[client_ip].append(current_time)
        return await call_next(request)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["Content-Security-Policy"] = (
            "default-src 'self' 'unsafe-inline' 'unsafe-eval' https:; "
            "img-src 'self' data: https:;"
        )
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        return response


settings = get_settings()

app = FastAPI(title=settings.api_title, version=settings.api_version)

# Initialize the SQLite database on app load
init_db()

# Apply rate limiting and security headers
app.add_middleware(RateLimitMiddleware)
app.add_middleware(SecurityHeadersMiddleware)

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
app.include_router(
    collaboration_router, prefix="/collaboration", tags=["Team Collaboration"]
)
app.include_router(devops_router, prefix="/devops", tags=["AI DevOps & Documentation"])
app.include_router(observability_router, prefix="/observability", tags=["Observability Telemetry & Metrics"])
