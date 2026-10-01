# Contributing to this fork

This is an upstream-contribution fork of [chwoerz/reporelay](https://github.com/chwoerz/reporelay), not an independent release channel. Keep upstream attribution/license and scope local patches narrowly. Propose changes upstream when appropriate; do not publish upstream-named packages from this fork.

## Setup and checks

Node 22.12+, pnpm 10.6.5, and Docker for integration tests:

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm test:unit
pnpm test:integration
```

Unit tests use fixtures and mocked services. Database integration tests start disposable ParadeDB containers through Testcontainers; they do not need a developer database or credentials. Docker must be running and able to pull the test image. `test/setup/postgres.ts` pins the multi-platform ParadeDB digest resolved from the official `paradedb/paradedb` Docker Hub repository; update it deliberately and validate the full database integration suite. Missing Docker is a failed prerequisite, not a passing test.

`pnpm test:live` is deliberately separate: it requires a running Ollama with `nomic-embed-text` and Docker. It must fail when prerequisites are missing. Do not describe offline checks as evidence that live embeddings work. `pnpm test` runs unit and database integration projects only.

The upstream `AGENTS.md` documents architecture, test seams and generated-code boundaries. Source changes to `openapi.yaml` require regeneration via `pnpm generate:api`; storage changes require migrations. Before syncing upstream, fetch it into a separate branch, inspect the diff, run verification and submit a PR. Never reset local patches or automatically merge upstream.

## Contribution workflow

- Work from the remote default branch in a separate checkout. With the maintainer's `wt` tool, run `git fetch origin` then `wt new chore/<task> origin/main`; it creates `<repo>/.worktrees/chore/<task>`. Contributors without `wt` can use a separate clone and feature branch. Never modify another task's working tree.
- Use Conventional Commits: imperative lower-case subject, at most 72 characters, no trailing full stop, one change per commit. Explain why in the body only when needed; link issues with `Refs: #N` or `Closes: #N`.
- Open a PR against `main` with the problem, resulting behavior, verification command/results and any limitations. Agents never merge PRs, push directly to protected branches, deploy, or publish releases.
- A required check or administrator-only branch rule is not an agent permission boundary: administrator credentials can bypass rules. Keep publication credentials out of ordinary development.
- Tasks need an observable acceptance criterion, affected area, constraints and a verification command. Use synthetic fixtures; do not include credentials or personal data in issues, logs or tests.

The fork workflow exposes `verify`, which succeeds only after build, unit tests and database integration all pass. Cancelled or skipped correctness jobs fail the aggregate. Publishing and the Pages deployment workflow are outside this gate. No private handbook, secret manager or publication credentials are required.
