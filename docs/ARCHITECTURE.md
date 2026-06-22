# StarkEd Architecture

This document gives a high-level overview of how StarkEd is structured, how the major
components interact, and where responsibilities live. It is intended to help new
contributors orient themselves before diving into a specific package.

## Overview

StarkEd is a decentralized learning and credential verification platform. It combines a
blockchain layer (Soroban smart contracts on Stellar) for tamper-proof credentials, a
Node.js API for application logic and off-chain data, and a Next.js web client for users.

The codebase is a **pnpm monorepo** with three primary workspaces:

| Package      | Stack                                   | Responsibility                                  |
|--------------|-----------------------------------------|-------------------------------------------------|
| `contracts/` | Rust, Soroban SDK                       | On-chain credentials, courses, achievements     |
| `backend/`   | Node.js, Express, TypeScript            | API, auth, off-chain data, IPFS, integrations   |
| `frontend/`  | Next.js 14, TypeScript, TailwindCSS     | Web UI, wallet integration, learner experience  |

## System Diagram

```
                         ┌──────────────────────────────┐
                         │          Users               │
                         │  (Students, Educators, Orgs)  │
                         └───────────────┬──────────────┘
                                         │ HTTPS
                                         ▼
                         ┌──────────────────────────────┐
                         │        Frontend (Next.js)     │
                         │  App Router · React · Tailwind │
                         │  Stellar Wallets (Freighter…) │
                         └───────┬───────────────┬───────┘
                                 │ REST/WS       │ Wallet signing
                                 ▼               │
              ┌────────────────────────────┐     │
              │      Backend (Express)      │     │
              │  Routes · Middleware · Auth │     │
              │  Services · Validation (Joi)│     │
              └───┬───────┬───────┬─────────┘     │
                  │       │       │               │
       ┌──────────┘       │       └──────────┐    │
       ▼                  ▼                  ▼    ▼
┌─────────────┐   ┌─────────────┐    ┌─────────────────────┐
│  Database   │   │   Redis     │    │  Stellar / Soroban  │
│ (Postgres / │   │  (cache,    │    │   Smart Contracts   │
│  Mongo)     │   │   sessions) │    │  Credentials·Courses│
└─────────────┘   └─────────────┘    │  Achievements·Profile│
                                     └──────────┬──────────┘
       ┌─────────────────────────────┐          │
       │            IPFS             │◄─────────┘
       │ (decentralized content/CIDs)│   content hashes
       └─────────────────────────────┘
```

## Components

### Smart Contracts (`contracts/`)

Soroban contracts written in Rust provide the trust layer. The core contracts are:

- **CredentialRegistry** — stores and verifies educational credentials.
- **CourseManager** — manages course creation and enrollment.
- **AchievementIssuer** — issues NFT-style achievement badges.
- **ProfileManager** — manages on-chain learning profiles.

Contracts emphasize **storage optimization** (bit packing, hash-based storage, tiered
state, packed timestamps) to reduce gas and deployment cost. See the README for the gas
savings summary and benchmarking commands.

Build with `cargo build --release`; test with `cargo test`.

### Backend (`backend/`)

A TypeScript Express server that acts as the application layer between clients and the
chain. Its `src/` is organized into:

- `routes/` — REST API endpoints (auth, courses, credentials, profiles, content,
  holographic storage, gas reporting).
- `middleware/` — authentication (JWT), request validation (Joi), rate limiting, security
  headers (Helmet).
- `models/` — data models for off-chain persistence.
- `utils/`/services — IPFS client, Stellar SDK integration, caching, and supporting logic.

The backend handles concerns that do not belong on-chain: authentication, off-chain
metadata, caching, file/IPFS handling, real-time updates over WebSockets, and third-party
integrations.

### Frontend (`frontend/`)

A Next.js 14 application using the App Router. Its `src/` contains:

- `app/` — App Router pages and layouts.
- `components/` — reusable UI components (TailwindCSS).
- `lib/` — utilities, API clients, and the IPFS helper.

The frontend integrates Stellar wallets (Freighter, Albedo, and others via the Stellar
Wallets Kit) so users can sign transactions client-side, and talks to the backend over
REST and WebSockets.

## Data Stores & External Services

- **Database** — relational (PostgreSQL) and/or document (MongoDB) persistence for
  off-chain data.
- **Redis** — caching, sessions, and rate-limiting state.
- **IPFS** — decentralized storage for educational content; the chain and database store
  content identifiers (CIDs) rather than raw files.
- **Stellar network** — testnet during development; transactions are signed by user
  wallets and submitted via the Stellar SDK.

## Request Lifecycle (example)

A typical "issue a credential" flow:

1. An educator signs in through the frontend; the backend issues a JWT.
2. The educator submits credential data; the frontend posts it to the backend.
3. The backend validates the payload, stores off-chain metadata, and pins associated
   content to IPFS, receiving a CID.
4. The backend (or the user's wallet) invokes the **CredentialRegistry** contract,
   recording the credential and its content hash on-chain.
5. Verification requests later read directly from the contract, guaranteeing the record
   has not been tampered with.

## Continuous Integration

CI is defined in `.github/workflows/ci.yml` and runs three independent jobs — contracts,
backend, and frontend — plus a security scan. Each job builds, type-checks, lints, and
tests its package. See [DEVELOPMENT.md](DEVELOPMENT.md) and [TESTING.md](TESTING.md) for
how to reproduce these locally.

## Further Reading

- [DEVELOPMENT.md](DEVELOPMENT.md) — local setup for all three packages.
- [TESTING.md](TESTING.md) — testing conventions.
- [../CONTRIBUTING.md](../CONTRIBUTING.md) — contribution workflow.
