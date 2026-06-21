# Contributing to StarkEd

First off, thank you for taking the time to contribute! StarkEd is a decentralized
learning and credential verification platform built on the Stellar blockchain, and it
grows through community contributions of every size — from typo fixes to new smart
contracts.

This guide explains how to set up your environment, the standards we follow, and how to
get a change merged.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Ways to Contribute](#ways-to-contribute)
- [Project Layout](#project-layout)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Commit Conventions](#commit-conventions)
- [Testing Requirements](#testing-requirements)
- [Pull Request Process](#pull-request-process)
- [Review Process](#review-process)
- [Reporting Bugs & Requesting Features](#reporting-bugs--requesting-features)
- [Security Issues](#security-issues)

## Code of Conduct

This project and everyone participating in it is governed by a shared expectation of
respectful, inclusive collaboration. By participating, you are expected to uphold these
principles:

- **Be respectful.** Disagreement is fine; personal attacks, harassment, and
  discriminatory language are not.
- **Be constructive.** Critique ideas and code, not people. Offer actionable feedback.
- **Be welcoming.** Assume good intent and help newcomers get oriented.
- **Be collaborative.** Share knowledge, document decisions, and credit others' work.

Unacceptable behavior may be reported to the maintainers at
`security@starked-education.org`. Maintainers are responsible for clarifying standards and
may remove, edit, or reject contributions that violate this code of conduct.

## Ways to Contribute

- **Report bugs** using the bug report issue template.
- **Suggest features** using the feature request issue template.
- **Improve documentation** — fix typos, clarify steps, add examples.
- **Write code** — pick up an open issue, especially ones labeled `good first issue`.
- **Review pull requests** — thoughtful review is a high-value contribution.

If you plan to work on something substantial, please open or comment on an issue first so
we can avoid duplicated effort and align on the approach.

## Project Layout

StarkEd is a monorepo with three primary packages, orchestrated with pnpm workspaces:

```
starked-education/
├── contracts/   # Soroban smart contracts (Rust)
├── backend/     # Node.js + Express + TypeScript API
├── frontend/    # Next.js 14 + TypeScript web app
├── docs/        # Project documentation
└── scripts/     # Deployment and utility scripts
```

For a deeper explanation of how these fit together, see
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Getting Started

A complete, step-by-step setup for all three packages lives in
[docs/DEVELOPMENT.md](docs/DEVELOPMENT.md). In short:

```bash
# Fork, then clone your fork
git clone https://github.com/<your-username>/starked-education.git
cd starked-education

# Install dependencies for every workspace
pnpm install:all

# Configure environment
cp .env.example .env
cp backend/.env.example backend/.env
# Edit the .env files with your local values

# Run backend + frontend together
pnpm dev
```

Prerequisites: Node.js v18+, pnpm, Rust + the Stellar/Soroban CLI, and a running database
and Redis instance. See [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) for versions and
installation details.

## Development Workflow

1. **Find or open an issue.** Make sure the work is tracked and not already in progress.
2. **Fork and branch.** Create a topic branch off the latest `main`:

   ```bash
   git checkout main
   git pull upstream main
   git checkout -b <type>/issue-<number>-short-description
   ```

   Use a branch prefix that matches the change type, e.g. `feat/`, `fix/`, `docs/`,
   `refactor/`, `test/`, or `chore/`.
3. **Make focused changes.** Keep each pull request scoped to a single concern.
4. **Write and run tests.** See [Testing Requirements](#testing-requirements).
5. **Run the linters and type checks** for any package you touched.
6. **Commit** using the [commit conventions](#commit-conventions).
7. **Open a pull request** against `main` and fill out the template.

## Coding Standards

### General

- Keep changes minimal and focused; avoid unrelated refactors in the same PR.
- Match the style and idioms of the surrounding code.
- Prefer clear names over comments, and document the *why* when behavior is non-obvious.

### Backend & Frontend (TypeScript / JavaScript)

- Code is written in **TypeScript**. Avoid `any` where a precise type is feasible.
- Linting is enforced with **ESLint**; the frontend additionally uses **Prettier**.
- Before committing, run the checks for each package you changed:

  ```bash
  # Backend
  cd backend && pnpm run lint && pnpm run typecheck

  # Frontend
  cd frontend && pnpm run lint && pnpm run type-check
  ```

- Fix auto-fixable issues with `pnpm run lint:fix` (backend) or `pnpm run lint:fix`
  (frontend).

### Smart Contracts (Rust / Soroban)

- Follow standard Rust conventions and keep contracts `no_std`-friendly per the Soroban
  SDK.
- Format and lint before committing:

  ```bash
  cd contracts
  cargo fmt
  cargo clippy
  ```

- Be mindful of storage costs — see the storage optimization notes in the README and keep
  new state packed and tiered where possible.

## Commit Conventions

We follow [Conventional Commits](https://www.conventionalcommits.org/). Each commit
message has the form:

```
<type>(<optional scope>): <short summary>
```

Common types:

| Type       | Use for                                              |
|------------|------------------------------------------------------|
| `feat`     | A new feature                                        |
| `fix`      | A bug fix                                             |
| `docs`     | Documentation only changes                           |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `test`     | Adding or correcting tests                           |
| `chore`    | Tooling, build, or dependency changes                |
| `perf`     | A performance improvement                            |

Examples:

```
feat(contracts): add credential revocation entry point
fix(backend): restore Joi validation on smart-wallet routes
docs: add contribution and developer setup guides
```

Keep the summary in the imperative mood and under ~72 characters. Reference the issue in
the body or footer (e.g. `Closes #78`).

## Testing Requirements

Every behavioral change should be covered by tests, and the full suite must pass before a
pull request is merged. The conventions for unit, integration, and end-to-end tests are
documented in [docs/TESTING.md](docs/TESTING.md).

Quick reference:

```bash
# Backend tests
cd backend && pnpm test

# Backend integration tests only
cd backend && pnpm run test:integration

# Frontend tests
cd frontend && pnpm test

# Contract tests
cd contracts && cargo test
```

The CI pipeline (`.github/workflows/ci.yml`) runs type checks, lint, tests, and builds for
all three packages on every pull request. Please make sure these pass locally first.

## Pull Request Process

1. Ensure your branch is up to date with `main` and that all checks pass locally.
2. Push your branch and open a pull request against `main`.
3. Fill out the [pull request template](.github/PULL_REQUEST_TEMPLATE.md) completely,
   including the checklist for tests, documentation, and breaking changes.
4. Link the issue your PR resolves using a closing keyword, e.g. `Closes #123`.
5. Keep the PR focused; large PRs are harder to review and slower to merge.
6. Respond to review feedback by pushing additional commits (avoid force-pushing during
   active review so reviewers can see incremental changes).

## Review Process

- At least one maintainer review is required before merging.
- Reviewers look for correctness, test coverage, adherence to the coding standards, and
  clarity. CI must be green.
- Address all review comments or explain why a suggestion does not apply.
- Once approved and green, a maintainer will merge — typically using **squash and merge**
  to keep a clean history.
- Be patient and responsive; maintainers review on a best-effort basis.

## Reporting Bugs & Requesting Features

- **Bugs:** [open a bug report](https://github.com/jobbykings/starked-education/issues/new?labels=bug&template=bug_report.md).
  Include reproduction steps, expected vs. actual behavior, and environment details.
- **Features:** [suggest a feature](https://github.com/jobbykings/starked-education/issues/new?labels=enhancement&template=feature_request.md).
  Describe the problem you are solving, not only the solution.

## Security Issues

Please **do not** open public issues for security vulnerabilities. Instead, email
`security@starked-education.org` with details. See the security issue template for the
information to include.

---

Thank you for helping build decentralized education on Stellar! ⭐
