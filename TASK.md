# Tasks - Phase 8: Enterprise Security, Private Repositories & PDF Audit Reporting

## Dependencies & Infrastructure
- [x] Add `reportlab` and `python3-saml` to [requirements.txt](file:///d:/codepilot-ai/backend/requirements.txt)
- [x] Install dependencies locally

## 1. Private Repository Scanning & Token Management
- [x] Update `RepositoryCloneRequest` schema in [schemas.py](file:///d:/codepilot-ai/backend/api/schemas.py)
- [x] Update `clone_repository` in [repo_service.py](file:///d:/codepilot-ai/backend/services/repo_service.py) to securely inject tokens into Git URLs
- [x] Update frontend clone modal in [OnboardingPanel.tsx](file:///d:/codepilot-ai/frontend/src/components/workspace/OnboardingPanel.tsx) to support passing token

## 2. Security Audit & Compliance Reports (PDF & Markdown)
- [x] Implement reports table schema migration or SQLite/Postgres model definition
- [x] Create report compilation service in [report_service.py](file:///d:/codepilot-ai/backend/services/report_service.py) using `reportlab`
- [x] Create backend API router in [reports.py](file:///d:/codepilot-ai/backend/api/reports.py) with `/reports/generate`, `/reports/history`, and download endpoints
- [x] Update main application router in [main.py](file:///d:/codepilot-ai/backend/main.py) to register the reports router
- [x] Update/Replace [ReportGenerator.tsx](file:///d:/codepilot-ai/frontend/src/components/workspace/ReportGenerator.tsx) UI to trigger and display report download history

## 3. SAML 2.0 Identity Provider Integration (Enterprise SSO)
- [x] Add SAML SP routes to [auth.py](file:///d:/codepilot-ai/backend/api/auth.py) (`/saml/metadata`, `/saml/login`, `/saml/callback`)
- [x] Add SAML authentication option to frontend [LoginScreen.tsx](file:///d:/codepilot-ai/frontend/src/components/auth/LoginScreen.tsx)

## 4. Verification & Testing
- [x] Create report unit tests `test_reports.py`
- [x] Create private repository clone unit tests `test_private_clone.py`
- [x] Run test suite and check TypeScript compilation
- [ ] Verify UI flows with local docker-compose setup
