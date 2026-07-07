# Excellenta GRC

Enterprise Cybersecurity Governance, Risk & Compliance platform powered by the **ExcelCyber Capability Model**.

## Architecture

```
Frontend (Next.js 16, Port 3000)  ←→  Backend API (FastAPI, Port 8000)  ←→  SQLite (file: backend/grc.db)
```

**No database server to install. No passwords. SQLite is built-in.**

### Capability Model: 3 Tiers / 41 L1 / 164 L2 / 820 Checklist Items

| Domain | L1 Capabilities | L2 Sub-Capabilities |
|--------|----------------|---------------------|
| **Govern, Risk & Assure** | 11 | 44 |
| **Protect & Defend** | 22 | 88 |
| **Identity & Data** | 8 | 32 |

---

## Quick Start (3 steps, ~2 minutes)

### 1. Backend

```bash
cd backend
pip install -r requirements.txt
python seed.py
uvicorn app.main:app --reload --port 8000
py -m uvicorn app.main:app --reload --port 8000
```

That's it. No database setup. No passwords. No config editing.

### 2. Frontend (new terminal)

```bash
cd frontend
npm install
npm run dev
npx next dev --webpack
```

### 3. Open in browser

Go to **http://localhost:3000** and login with:

- **admin@excellenta.com** / **Admin123!** (Admin)
- **assessor@excellenta.com** / **Assess123!** (Assessor)

---

## Project Structure

```
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI entry point
│   │   ├── core/                 # Config, DB, Auth, Dependencies
│   │   ├── models/               # SQLAlchemy models (User, Organization, Domain, L1, L2, ChecklistItem, AuditLog)
│   │   ├── schemas/              # Pydantic request/response schemas
│   │   ├── services/             # Business logic (Auth, Capability aggregation)
│   │   └── routers/              # API endpoints (auth, capabilities)
│   ├── seed.py                   # Database seeder (3 domains, 41 L1s, 164 L2s, 820 checklist items)
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── app/                  # Next.js App Router pages
│   │   │   ├── login/            # Premium login screen
│   │   │   ├── dashboard/        # Main dashboard with 3 domain cards
│   │   │   ├── domains/[id]/     # Domain drill-down (L1 capabilities)
│   │   │   ├── capabilities/[id]/ # Capability detail (L2 + checklists)
│   │   │   ├── sub-capabilities/[id]/ # Full checklist view
│   │   │   └── profile/          # User profile + theme toggle
│   │   ├── components/           # Navbar, DashboardCard, shadcn/ui
│   │   └── lib/                  # API client, Auth context, Theme context
│   └── package.json
└── README.md
```

## Key Features

- **3-tier capability hierarchy** with real-time progress rollup
- **Premium UI**: Glass-morphism cards, Framer Motion animations, dark mode
- **Multi-tenant** with RBAC (Admin, Assessor, Contributor, Viewer)
- **JWT auth** with bcrypt password hashing
- **Audit logging** for all status changes
- **Global search** across all hierarchy levels
- **Drill-down navigation** with breadcrumbs
- **5 statuses**: Not Started, In Progress, Complete, Blocked, N/A

## API Endpoints

Base: `http://localhost:8000/api/v1`

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/auth/login` | Sign in |
| GET | `/auth/me` | Current user |
| GET | `/capabilities/dashboard` | Dashboard aggregation |
| GET | `/capabilities/domains` | List domains |
| GET | `/capabilities/domains/{id}` | Domain + L1 capabilities |
| GET | `/capabilities/capabilities/{id}` | L1 + L2 + checklists |
| GET | `/capabilities/sub-capabilities/{id}` | Full checklist view |
| PUT | `/capabilities/checklist-items/{id}` | Update status |
| GET | `/capabilities/search?q=` | Global search |

Full API docs at `http://localhost:8000/docs`

## PostgreSQL (for production)

SQLite is for development. To use PostgreSQL, change `DATABASE_URL` in `backend/.env`:

```
DATABASE_URL=postgresql+asyncpg://postgres:YOUR_PASSWORD@localhost:5432/grc_db
```
