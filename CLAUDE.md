# Liftoff

Graph-based cohort launch automation. When an instructor is confirmed, one event fans out across a workflow graph: calendar event, learning-platform environment, marketing notice, CRM (Salesforce) record and welcome email. Each step has its own state, retries, an audit trail and a human approval before anything visible to the outside world.

## Rules
- No external LLM API and no real third-party credentials: the five integrations are mocks behind an interface, with configurable failures. Nothing secret goes in this public repo.
- The workflow engine runs on the Node server process (long-lived, state in `node:sqlite`); steps run in parallel and must be idempotent (a duplicate trigger or a retry never repeats a side effect).
- Drafting text (welcome email) goes through a `Drafter` interface with a deterministic template implementation.
- Next.js here is 16.x and differs from what you may remember: before writing Next code, read the relevant guide in `node_modules/next/dist/docs/`. See `AGENTS.md`.
- UI: Tailwind 4, readable and responsive. The main screen shows each cohort as a graph with the live state of every step.
- Lint and format with Biome (`npm run lint`). Tests: `npm test` (`node --test`, TypeScript runs natively on Node 24). Commits in English: `type: imperative description`.
- Keep it small: no abstraction the task does not need.
