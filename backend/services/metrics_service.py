"""
CodePilot AI — Custom Prometheus Metrics
Defines all application-level Prometheus counters, histograms, and gauges.
Import and update these from anywhere in the codebase.
"""

from prometheus_client import Counter, Histogram, Gauge

# ── HTTP Request Metrics ───────────────────────────────────────────────────────
http_requests_total = Counter(
    "codepilot_ai_http_requests_total",
    "Total HTTP requests",
    ["method", "path", "status_code"],
)

http_request_duration_seconds = Histogram(
    "codepilot_ai_http_request_duration_seconds",
    "HTTP request duration in seconds",
    ["method", "path"],
    buckets=[0.01, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0],
)

# ── LLM / AI Metrics ─────────────────────────────────────────────────────────
llm_requests_total = Counter(
    "codepilot_ai_llm_requests_total",
    "Total LLM API calls made",
    ["status"],  # success | error
)

llm_tokens_total = Counter(
    "codepilot_ai_llm_tokens_total",
    "Total tokens consumed by LLM responses",
)

llm_latency_seconds = Histogram(
    "codepilot_ai_llm_latency_seconds",
    "LLM API response latency in seconds",
    buckets=[0.5, 1.0, 2.0, 5.0, 10.0, 30.0, 60.0, 120.0],
)

# ── Cache Metrics ─────────────────────────────────────────────────────────────
cache_hits_total = Counter(
    "codepilot_ai_cache_hits_total",
    "Total LLM cache hits",
)

cache_misses_total = Counter(
    "codepilot_ai_cache_misses_total",
    "Total LLM cache misses",
)

# ── WebSocket Metrics ─────────────────────────────────────────────────────────
active_ws_connections = Gauge(
    "codepilot_ai_active_ws_connections",
    "Currently active WebSocket connections",
)

ws_messages_total = Counter(
    "codepilot_ai_ws_messages_total",
    "Total WebSocket messages sent",
    ["direction"],  # inbound | outbound
)

# ── Celery / Queue Metrics ────────────────────────────────────────────────────
celery_tasks_total = Counter(
    "codepilot_ai_celery_tasks_total",
    "Total Celery tasks dispatched",
    ["queue", "status"],  # queue: indexing|default, status: enqueued|success|failure
)

celery_queue_depth = Gauge(
    "codepilot_ai_celery_queue_depth",
    "Number of pending tasks in each Celery queue",
    ["queue"],
)

# ── Repository Indexing Metrics ───────────────────────────────────────────────
indexing_duration_seconds = Histogram(
    "codepilot_ai_indexing_duration_seconds",
    "Time taken to fully index a repository",
    buckets=[5.0, 15.0, 30.0, 60.0, 120.0, 300.0, 600.0],
)

repositories_indexed_total = Counter(
    "codepilot_ai_repositories_indexed_total",
    "Total repositories successfully indexed",
)
