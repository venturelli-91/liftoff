# Liftoff

Graph-orchestrated cohort launch: one instructor-confirmed trigger, five idempotent workflow steps (calendar, LMS, marketing, CRM, welcome email), retries, audit trail and human approval.

Built end to end by an automated delivery pipeline as a test of its workflow graph.

## Run
```
npm ci
npm run dev
npm test
```

## Configuration (env)
- `LIFTOFF_WEBHOOK_SECRET`: required for the webhook (requests rejected if unset).
- `LIFTOFF_DB`: sqlite path (default `liftoff.db`).
- `LIFTOFF_MOCK_FAILURES`: e.g. `calendar:2,salesforce:99` makes the first N calls of a mock fail.

## Try it
1. `LIFTOFF_WEBHOOK_SECRET=s npm run dev`, open http://localhost:3000, submit the form. Calendar, LMS and Salesforce complete; the email and landing notice wait for **Approve**.
2. Webhook: `POST /api/webhook/cohort-confirmed` with header `x-liftoff-secret: s` (optional `Idempotency-Key`) and JSON `{cohort, course?, startDate, endDate, instructor:{name,email}, seats, materials[]}`. Invalid payload: 422 with field errors; repeat key: 200 and no new side effects.
3. With `LIFTOFF_MOCK_FAILURES=salesforce:99` the step retries with backoff, then shows "needs attention"; use **Retry**. The audit log is under each cohort.

## Health check
`GET /api/health` runs a trivial query on the sqlite store.
- 200: `{"status":"ok","db":"ok","uptime_s":<number>}`
- 503: `{"status":"degraded","db":"error"}` when the query throws.

## Security note
The ops UI and the `/api/cohorts` routes have no authentication and show instructor personal data (name, email). Run Liftoff only on a trusted network or behind an authenticating proxy. The webhook (`/api/webhook/cohort-confirmed`) is protected by a shared secret.
