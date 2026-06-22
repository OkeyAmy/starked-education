# Testing Guide

StarkEd aims for confidence at every layer: fast unit tests for logic, integration tests
for components working together, and end-to-end (E2E) tests for critical user flows. This
document describes the tools and conventions for each package.

## Principles

- **Every behavioral change ships with tests.** Bug fixes include a regression test that
  fails before the fix and passes after.
- **Tests are deterministic.** No reliance on real network calls, wall-clock timing, or
  shared mutable state. Mock external services (Stellar, IPFS, third-party APIs).
- **Tests are isolated.** Each test sets up and tears down its own state.
- **Name tests by behavior.** Describe what the code should do, not how it does it.

## Test Types

| Type        | Scope                                              | Where                          |
|-------------|----------------------------------------------------|--------------------------------|
| Unit        | A single function, module, or component in isolation | `backend/`, `frontend/`, `contracts/` |
| Integration | Multiple units together (e.g. route + middleware + service) | `backend/` (`*integration*`)   |
| E2E         | A full user flow across the running app            | `frontend/` (browser-level)    |

## Backend (Jest)

The backend uses **Jest** with `ts-jest`, plus **Supertest** for HTTP-level tests and
`mongodb-memory-server` for an in-memory database during tests.

```bash
cd backend

pnpm test                 # run the full suite
pnpm run test:watch       # watch mode
pnpm run test:coverage    # with coverage report
pnpm run test:ci          # CI mode (coverage, no watch)
pnpm run test:integration # integration tests only
pnpm run test:api         # route/API tests only
```

Conventions:

- Place test files next to the code under test or in a `__tests__/` directory, named
  `*.test.ts` or `*.spec.ts`.
- **Unit tests** mock collaborators (database, Redis, IPFS, Stellar SDK) so only the unit
  under test runs.
- **Integration tests** use file/path patterns matched by `test:integration` (paths
  containing `integration`). They may use the in-memory database but should still mock
  external networks.
- Use Supertest to exercise Express routes:

  ```ts
  import request from 'supertest';
  import app from '../src/app';

  describe('GET /api/courses', () => {
    it('returns the list of courses', async () => {
      const res = await request(app).get('/api/courses');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });
  ```

## Frontend (Jest + Testing Library)

The frontend uses **Jest** with **React Testing Library** and `@testing-library/jest-dom`.

```bash
cd frontend

pnpm test                 # run the full suite
pnpm run test:watch       # watch mode
pnpm run test:coverage    # with coverage report
pnpm run test:ci          # CI mode (coverage, no watch)
```

Conventions:

- Name test files `*.test.tsx` / `*.test.ts`, co-located with the component or in
  `__tests__/`.
- Test components from the **user's perspective** — query by role, label, or text rather
  than implementation details.

  ```tsx
  import { render, screen } from '@testing-library/react';
  import userEvent from '@testing-library/user-event';
  import { EnrollButton } from '../components/EnrollButton';

  it('disables the button while enrolling', async () => {
    render(<EnrollButton courseId="math101" />);
    await userEvent.click(screen.getByRole('button', { name: /enroll/i }));
    expect(screen.getByRole('button', { name: /enrolling/i })).toBeDisabled();
  });
  ```

- Mock network requests and wallet interactions; do not hit real endpoints or sign real
  transactions in tests.

### End-to-End Tests

E2E tests exercise full flows (sign in → enroll → receive credential) against a running
build. When adding E2E coverage:

- Run against a local build (`pnpm run build && pnpm start`) with backend services
  available.
- Keep E2E tests focused on **critical paths** — they are slower and more brittle than
  unit tests, so reserve them for high-value flows.
- Stub blockchain and external services where possible to keep runs deterministic.

## Smart Contracts (Cargo)

Soroban contracts are tested with Rust's built-in test harness and the Soroban SDK's
`testutils` feature.

```bash
cd contracts

cargo test                                  # run all contract tests
cargo test --release -- --nocapture test_gas_benchmarks   # gas benchmarks
```

Conventions:

- Place unit tests in a `test.rs` module (or `#[cfg(test)]` modules) alongside the
  contract logic.
- Use the Soroban test environment (`Env`) to register contracts and simulate invocations.
- Cover both success paths and failure/authorization paths.
- When changing storage layout, update or add gas benchmark tests so regressions are
  visible.

## Coverage Expectations

- New code should come with meaningful tests; aim to cover both happy paths and edge
  cases.
- Run `pnpm run test:coverage` (backend/frontend) to inspect coverage locally.
- Do not chase a coverage number with trivial tests — prioritize behavior that matters.

## Continuous Integration

`.github/workflows/ci.yml` runs tests for all three packages on every push and pull
request to `main` and `develop`, alongside type checks, linting, builds, and a security
scan. Make sure the suite passes locally before opening a PR:

```bash
cd backend && pnpm run test:ci
cd ../frontend && pnpm run test:ci
cd ../contracts && cargo test
```

## See Also

- [DEVELOPMENT.md](DEVELOPMENT.md) — environment setup.
- [ARCHITECTURE.md](ARCHITECTURE.md) — how the packages fit together.
- [../CONTRIBUTING.md](../CONTRIBUTING.md) — contribution workflow.
