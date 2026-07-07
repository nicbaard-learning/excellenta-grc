# PROJECT_DETAILS_GRC

Excellenta GRC is a multi-tenant cybersecurity governance, risk, and compliance platform built from the ground up around the ExcelCyber Capability Model. It provides organisations with a structured framework to assess, track, and improve their cybersecurity posture across three top-level domains: Govern, Risk & Assure; Protect & Defend; and Identity & Data.

The system supports a three-tier capability hierarchy — 41 L1 capabilities, 164 L2 sub-capabilities, and configurable lowest-level checklist items under each L2 — with real-time progress rollup from individual checklist items all the way up to the organisational dashboard. Each checklist item supports status tracking (Not Started, In Progress, Complete, Blocked, Not Applicable), owner assignment, due dates, notes, and evidence attachment placeholders.

The application is in **early development**. It is not yet feature-complete, has not been user-tested, and has no deployment or production path defined. The current build is a functional prototype suitable for demonstration and local evaluation.

## Tech Stack and Requirements

- Backend: FastAPI (Python 3.12+), SQLAlchemy 2.0, JWT-based authentication
- Frontend: Next.js 16, React 19, TypeScript, Tailwind CSS 4, shadcn/ui, Framer Motion
- Database: SQLite for local development, PostgreSQL for production
- Auth: Local email/password with bcrypt hashing; architecture ready for SSO/MFA later
- Security: RBAC (Admin, Assessor, Contributor, Viewer), audit logging, CSRF/XSS protections

### Runtime and Setup Requirements

- Python 3.12+
- Node.js 20+ (tested with v24)
- No database server required for local development (SQLite is file-based)
- Environment variable configuration via `backend/.env`:
  - `DATABASE_URL` — Connection string (defaults to SQLite for dev)
  - `SECRET_KEY` — JWT signing secret
  - `ALGORITHM` — JWT algorithm (HS256)
  - `ACCESS_TOKEN_EXPIRE_MINUTES` — Token lifetime

## Current State (Early Development)

This project is at the very beginning of its lifecycle. The following have been implemented:

- ✅ Full backend API with models, services, and routers
- ✅ Complete capability hierarchy seeded (41 L1 × 4 L2 each = 164 sub-capabilities, 5 checklist items per L2 = 820 total)
- ✅ Login, dashboard, and drill-down views (domain → L1 → L2 → checklist)
- ✅ Status management with real-time progress aggregation
- ✅ Global search, dark mode, user profile
- ✅ Frontend builds and is navigable

The following are **not yet built or are placeholder only**:
- ❌ SSO / MFA integration (placeholder on login screen)
- ❌ Evidence file upload (placeholder markup only)
- ❌ Email notifications
- ❌ Export / reporting (PDF, CSV)
- ❌ User invitation flow
- ❌ Audit log viewer UI
- ❌ Custom capability builder
- ❌ Advanced permission granularity beyond RBAC roles
- ❌ Any form of deployment pipeline or hosting

## Deployment

There is currently no deployment path. The project runs locally only.

When deployment is eventually pursued, the intended architecture will follow a similar pattern to other Excellenta services:

- Source control in Git.
- Backend deployed as a Python ASGI service (uvicorn/gunicorn).
- Frontend built as static assets or served via Next.js standalone mode.
- Database migrated to PostgreSQL for production.
- Environment configured via environment variables rather than a `.env` file.

No cloud provider, CI/CD pipeline, or infrastructure has been selected or provisioned.
