# Excellenta GRC - SFR Integration Implementation Plan

## Objective

Integrate the Shared Framework Repository (SFR) into Excellenta GRC to enrich capabilities with:
- Framework recommendations
- Cross-framework control equivalents
- Evidence checklist guidance
- Framework comparison insights

while preserving Excellenta GRC as the source of truth and explicitly handling the South Africa (SA) framework coverage gap.

## Guiding Principles

1. Excellenta data remains authoritative.
2. SFR is an external enrichment source, not a replacement model.
3. No direct browser-to-SFR calls; all integration goes through backend.
4. External dependency failures must not break core GRC workflows.
5. SA framework gaps are first-class and visible to users.

## Scope

## In Scope (Phase 1 to 3)

- Backend SFR client and proxy endpoints
- Normalized response contracts for frontend use
- UI integration in capability and sub-capability views
- Local persistence for selected SFR insights
- SA coverage gap detection and reporting

## Out of Scope (for this implementation cycle)

- Full migration of existing data model to SCF/SFR canonical model
- Real-time two-way synchronization with SFR
- Automatic write-back to SFR
- Advanced analytics warehouse and BI pipelines

## Target Architecture

- Frontend (Next.js) calls Excellenta Backend only.
- Backend (FastAPI) calls SFR endpoints and normalizes responses.
- PostgreSQL stores:
  - Cached SFR responses
  - Local mapping records
  - SA local framework overlays
  - Gap-analysis results

## Integration Modules

## Module A: SFR API Client (Backend)

Create a dedicated service layer:
- app/services/sfr_client.py
- app/services/sfr_mapping_service.py
- app/services/sfr_cache_service.py

Responsibilities:
- Typed request builders
- Response normalization
- Timeout/retry/backoff
- Circuit-breaker style fallback behavior
- Structured logging and trace IDs

## Module B: Internal SFR Proxy Endpoints (Backend)

Create API routes under:
- /api/v1/integrations/sfr/*

Proposed endpoints:
1. GET /frameworks
2. POST /recommend
3. GET /controls/{control_id}/equivalents
4. GET /evidence/checklist
5. POST /compare
6. GET /health

Behavior:
- Validate inputs before calling SFR
- Return normalized payloads to frontend
- Use cache where appropriate
- Include metadata: source, timestamp, freshness

## Module C: Mapping and Persistence

Add database tables:
1. sfr_framework_cache
2. sfr_control_cache
3. capability_sfr_mapping
4. sa_framework_catalog
5. sa_framework_control
6. sa_gap_result

Minimal schema fields:
- external_id / external_code
- payload_json
- fetched_at
- source_version
- confidence_score
- mapping_status

## Module D: Frontend Integration

Add an "External Insights" panel on:
- capability detail page
- sub-capability detail page

Panel sections:
1. Recommended frameworks (SFR)
2. Equivalent controls
3. Evidence checklist suggestions
4. SA coverage status badge

UX rules:
- Never block existing checklist workflow
- Show loading, stale-cache, and unavailable states
- Show "Data source: SFR" on enrichment widgets

## Module E: SA Framework Gap Handling

Implement local SA overlay:
- Seed SA frameworks and controls that are not represented in SFR
- Maintain explicit mapping status per control:
  - mapped_to_sfr
  - partially_mapped
  - unmapped

Gap engine:
- Input: selected SA framework + current mapped controls
- Output:
  - missing controls
  - coverage percentage
  - priority recommendations

## Phased Delivery Plan

## Phase 0 - Foundation Hardening (1-2 days)

Tasks:
1. Add environment variable support for SFR base URL.
2. Add environment variable support for SFR auth if needed later.
3. Add feature flag: ENABLE_SFR_INTEGRATION.
4. Add centralized outbound HTTP settings (timeout/retry).

Deliverables:
- Config changes merged
- Health endpoint can report SFR integration readiness

Acceptance Criteria:
- App runs with integration disabled by default
- No runtime impact to existing routes

## Phase 1 - Read-Only Enrichment MVP (3-5 days)

Tasks:
1. Implement SFR client methods for:
   - list frameworks
   - recommend frameworks
   - control equivalents
   - evidence checklist
2. Add backend proxy endpoints.
3. Add frontend "External Insights" panel.
4. Add basic response caching (TTL-based).

Deliverables:
- End-to-end read-only enrichment visible in UI

Acceptance Criteria:
- User can open a capability page and see SFR insights
- If SFR is down, user sees graceful fallback state
- Existing workflows (status updates, feedback) are unaffected

## Phase 2 - Mapping Persistence and SA Gap v1 (4-6 days)

Tasks:
1. Add mapping tables and ORM models.
2. Persist selected/approved mappings.
3. Seed initial SA framework/control dataset.
4. Implement SA gap calculation endpoint.
5. Add SA Coverage UI badge and detail drawer.

Deliverables:
- Persistent mapping layer
- First version SA gap report

Acceptance Criteria:
- Admin can view mapped/unmapped SA controls
- Coverage percentage is reproducible and auditable

## Phase 3 - Compare, Maturity, and Roadmap Integration (4-7 days)

Tasks:
1. Integrate SFR compare endpoint.
2. Integrate maturity assessment endpoint.
3. Integrate roadmap generation endpoint.
4. Add a "Planning Insights" page or section.

Deliverables:
- Framework comparison and roadmap guidance surfaced in product

Acceptance Criteria:
- User can run compare and view differences/intersection
- User can generate maturity-informed roadmap recommendations

## Phase 4 - Operational Readiness (2-3 days)

Tasks:
1. Add observability dashboards for SFR request success/latency.
2. Add alerting for sustained SFR failures.
3. Add admin cache-refresh controls.
4. Write runbook and support notes.

Deliverables:
- Production-ready operational controls

Acceptance Criteria:
- Team can detect and respond to SFR outages quickly
- Cache can be manually invalidated from admin flow

## Data Contracts and Normalization Strategy

Normalize SFR responses into internal DTOs:
- FrameworkSummaryDTO
- FrameworkRecommendationDTO
- ControlEquivalentDTO
- EvidenceChecklistDTO
- FrameworkComparisonDTO
- SAGapSummaryDTO

Normalization rules:
1. Keep raw source payload for traceability.
2. Map only required fields for frontend rendering.
3. Include source metadata on every object.

## Security and Compliance Considerations

1. Restrict outbound requests to approved SFR base URL.
2. Sanitize and validate all query/body parameters.
3. Rate-limit integration endpoints if exposed to many users.
4. Log minimal sensitive data (avoid full payload logging where unnecessary).
5. Keep integration credentials in environment variables only.

## Performance and Reliability

1. Cache framework/reference endpoints with medium TTL (e.g., 6-24h).
2. Cache control/evidence lookups with shorter TTL (e.g., 1-6h).
3. Use retries with jitter for transient network errors.
4. Use fail-open behavior for enrichment (core app still works).

## Testing Strategy

## Unit Tests

- SFR client request/response handling
- DTO normalization logic
- SA gap computation rules

## Integration Tests

- Backend proxy endpoint behavior with mocked SFR
- Timeout/retry/fallback logic
- Persistence of selected mappings

## UI Tests

- External Insights rendering states (success/loading/error/stale)
- SA badge accuracy per mocked data

## UAT Test Cases

1. Load capability page with SFR enabled and data present.
2. Load capability page with SFR unavailable.
3. Confirm annotation/feedback flow remains functional.
4. Validate SA missing control report for a selected framework.

## Risks and Mitigations

1. Risk: SFR schema changes without notice.
   - Mitigation: DTO normalization + contract tests + raw payload retention.

2. Risk: SFR latency/outage impacts UX.
   - Mitigation: Caching + fallback states + async enrichment loading.

3. Risk: SA framework incompleteness creates false confidence.
   - Mitigation: Explicit SA gap badge and unmapped-control reporting.

4. Risk: Scope creep into full control model redesign.
   - Mitigation: Phase gates and strict in-scope controls.

## Suggested Timeline (Working Estimate)

- Phase 0: Week 1 (early)
- Phase 1: Week 1 (late) to Week 2
- Phase 2: Week 2 to Week 3
- Phase 3: Week 3 to Week 4
- Phase 4: Week 4

Total estimate: 3-4 weeks for a robust test-ready integration, depending on team capacity and SA data preparation.

## Delivery Checklist

1. Feature flag in place
2. Backend SFR client implemented
3. Proxy endpoints added
4. Caching and fallback complete
5. Frontend External Insights added
6. SA framework seed added
7. SA gap engine and UI complete
8. Tests and runbook completed

## Recommended First Build Slice (Start Here)

Implement this exact slice first:
1. Phase 0 configuration
2. Phase 1 endpoints: frameworks, recommend, equivalents, evidence
3. Capability page External Insights panel
4. Basic SA gap badge (placeholder computation)

This gives immediate value with limited risk and creates a clean foundation for deeper mapping and roadmap features.