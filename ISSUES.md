# Codexa Current Problems & Limitations

This document lists the architectural shortcomings, security gaps, and unintegrated features that need to be resolved to transition **Codexa (CodePilot AI)** from a high-fidelity prototype to an enterprise production environment.

---

## 🔒 Security & Identity Gaps

### 1. Mocked Enterprise Integrations

- **SAML SSO / Identity Federation**: The user interface displays indicators for SAML SSO and Enterprise login setups, but the backend lacks the logic to integrate with real Enterprise Identity Providers (IdPs) like Okta or Azure AD.
- **MFA (Multi-Factor Authentication)**: Modals are fully styled, but they represent UI placeholders and lack backend TOTP token generation, QR code pairing, and validation checks.

### 2. Hardcoded Configuration Secrets

- Connection strings, CORS origins, and JWT keys fall back to hardcoded defaults (e.g., `jwt_secret = "codepilot_secret_key_12345"` in [settings.py](file:///d:/codepilot-ai/backend/settings.py)). These must be injected strictly via environment variables, KMS, or Vault systems.

---

## 🛠️ Architectural & Platform Limitations

### 1. In-Memory Rate Limiting Fallbacks

- The `RateLimitMiddleware` (in [main.py](file:///d:/codepilot-ai/backend/main.py)) falls back to a local Python `defaultdict(list)` if Redis connection issues arise. Under high client volume, this will result in server memory bloat and will bypass rate limit configurations across multi-pod deployment environments.

### 2. Single-Worker Celery Constraint on Windows

- Standard Celery multitasking (prefork pool) is unsupported on Windows natively, requiring the worker to run with `-P solo` (single-task execution). This restricts concurrent codebase indexing runs during local dev sessions.

### 3. Limited Test Coverage

- Although Vite/Vitest is configured for unit testing, there is low components/routing code coverage. Continuous Integration (CI) test validations are not fully implemented.

### 4. Cold Database / Startup Error Display

- When services are warming up or the backend fails to load a file, the editor displays connection errors or raw HTTP logs. Codexa needs a retry queue or graceful offline caching fallback inside the client hooks.
