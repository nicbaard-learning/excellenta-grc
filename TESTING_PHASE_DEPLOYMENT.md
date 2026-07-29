# Excellenta GRC - Testing Phase Deployment Plan

## Purpose

This document defines the recommended deployment approach for client testing (UAT) so users can:
- Access the application online
- Annotate screenshots in-app
- Send feedback to the development team via Discord

## Recommended Hosting Architecture (Testing Phase)

- Frontend: Vercel (Next.js)
- Backend API: Render Web Service (FastAPI)
- Database: Render PostgreSQL

Why this is the best fit for current project state:
- Minimal setup time with your existing accounts
- Native support for Next.js on Vercel
- Simple Python API hosting on Render
- More reliable than SQLite for hosted testing

## Why Not SQLite for Hosted Testing

SQLite is suitable for local development but not ideal for internet-facing testing because:
- It is file-based
- It is less resilient to service restarts/deploy cycles
- It does not scale well for concurrent usage

Use PostgreSQL for test environments that include real client activity.

## Current Code Considerations Before Go-Live

The following items must be addressed before publishing the test environment:

1. CORS is currently localhost-only in backend/app/main.py.
2. SECRET_KEY defaults to a non-production value in backend/app/core/config.py.
3. Discord webhook is hardcoded in backend/app/routers/feedback.py.
4. Frontend must use NEXT_PUBLIC_API_URL to call hosted backend.

## Environment Variables

### Backend (Render)

Set these in Render service environment variables:

- DATABASE_URL
  - Use Render PostgreSQL connection string
  - Example format:
    - postgresql+asyncpg://USER:PASSWORD@HOST:PORT/DBNAME
- SECRET_KEY
  - Generate a long random secret
- ENVIRONMENT
  - production
- DEBUG
  - false
- ALGORITHM
  - HS256
- ACCESS_TOKEN_EXPIRE_MINUTES
  - 480 (or your preferred test value)
- DISCORD_WEBHOOK_URL
  - Move webhook value out of code and into env var

### Frontend (Vercel)

Set in Vercel project environment variables:

- NEXT_PUBLIC_API_URL
  - Example:
    - https://YOUR-RENDER-BACKEND.onrender.com/api/v1

## Deployment Steps

## 1. Deploy Database (Render)

1. Create a new PostgreSQL instance in Render.
2. Copy internal/external DATABASE_URL values.
3. Use this value for backend service env vars.

## 2. Deploy Backend (Render)

1. Create a new Web Service from repository.
2. Root directory: backend
3. Build command:
   - pip install -r requirements.txt
4. Start command:
   - uvicorn app.main:app --host 0.0.0.0 --port $PORT
5. Add backend environment variables listed above.
6. Deploy.

## 3. Seed Production-Test Data

After backend is deployed and DB is connected, run seed once:

- python seed.py

Run this via Render shell/job or one-off command process.

## 4. Deploy Frontend (Vercel)

1. Create/import project in Vercel.
2. Root directory: frontend
3. Framework: Next.js (auto-detected)
4. Add NEXT_PUBLIC_API_URL env var.
5. Deploy.

## 5. Configure Backend CORS

Update allowed origins to include your Vercel frontend domain(s), for example:
- https://your-app.vercel.app
- https://your-custom-domain.com

Without this, frontend API requests will fail in browser.

## 6. Configure Trusted Hosts

Ensure backend trusted hosts include:
- Render backend host
- Vercel/custom frontend hosts where appropriate

## UAT Smoke Test Checklist

After deployment, verify:

1. User can open frontend URL.
2. Login works with seeded users.
3. Dashboard and drill-down pages load.
4. Status updates persist to PostgreSQL.
5. Screenshot capture opens feedback editor.
6. Annotation tools work:
   - Draw
   - Line
   - Arrow
   - Rectangle
   - Circle
   - Text
7. Feedback submission succeeds.
8. Discord receives annotated screenshot and notes.
9. Browser refresh does not break sessions unexpectedly.
10. API health endpoint returns healthy.

## Operational Notes for Testing Phase

- Keep this environment separate from production.
- Use clearly labeled test accounts.
- Back up PostgreSQL before major test rounds.
- Track deployment timestamps and commit SHA for every release.

## Suggested Rollout Sequence

1. Internal QA (same day)
2. Small client pilot group (1-3 users)
3. Broader client testing group
4. Weekly fix/redeploy cadence based on feedback

## Optional Next Step (After UAT)

If long-term hosting moves to Hetzner:
- Engage IT to provision infrastructure
- Reuse same env variable model
- Keep PostgreSQL and API/Frontend separation
- Add CI/CD and TLS/backup monitoring standards

## Summary

For immediate client testing, deploy:
- Frontend on Vercel
- Backend on Render
- Database on Render PostgreSQL

This is the fastest and lowest-friction path for your current codebase while preserving a clean transition path to a future Hetzner-managed environment.