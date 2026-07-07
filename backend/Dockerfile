# ════════════════════════════════════════════════════════════════════════════
# Stage 1 — builder
# Install all Python dependencies into /opt/venv so only the clean venv
# is copied to the final image (no pip cache, no download artefacts).
# ════════════════════════════════════════════════════════════════════════════
FROM python:3.11-slim AS builder

WORKDIR /build

# Create an isolated virtual environment
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# ── CPU-only PyTorch ──────────────────────────────────────────────────────────
RUN pip install --no-cache-dir \
    "torch>=2.4,<2.6" \
    --index-url https://download.pytorch.org/whl/cpu

# ── Application dependencies ──────────────────────────────────────────────────
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ── Remove packages that are provably unused at runtime ───────────────────────
RUN pip uninstall -y kubernetes networkx pip setuptools wheel 2>/dev/null || true

# ════════════════════════════════════════════════════════════════════════════
# Stage 2 — final runtime image
# ════════════════════════════════════════════════════════════════════════════
FROM python:3.11-slim AS final

# ── OCI image metadata ────────────────────────────────────────────────────────
LABEL org.opencontainers.image.title="CodePilot AI"
LABEL org.opencontainers.image.description="AI-powered repository understanding platform"
LABEL org.opencontainers.image.source="https://github.com/abhishek-s12/codepilot-ai"
LABEL org.opencontainers.image.licenses="MIT"
LABEL org.opencontainers.image.vendor="CodePilot AI"

WORKDIR /app

# git + curl required at runtime (GitPython + healthcheck)
RUN apt-get update \
    && apt-get install -y --no-install-recommends git curl \
    && git --version \
    && rm -rf /var/lib/apt/lists/*

# Create a non-root user for security
RUN groupadd --gid 1001 appgroup \
    && useradd --uid 1001 --gid appgroup --shell /bin/bash --create-home appuser

# Copy only the venv from the builder
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copy application source
COPY . .

# Pre-create writable directories
RUN mkdir -p /app/repos /app/embeddings /app/vector_store \
    && chown -R appuser:appgroup /app

ENV GIT_PYTHON_REFRESH=quiet

# Switch to non-root user
USER appuser

EXPOSE 8000

# ENTRYPOINT allows CMD to be overridden at runtime.
# API server: docker run ... (uses CMD below)
# Worker:     docker run ... python worker.py
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:8000/health/live || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]