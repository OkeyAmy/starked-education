# Development Setup

This guide walks you through setting up a complete local development environment for
StarkEd's three packages: **contracts** (Rust/Soroban), **backend** (Node/Express), and
**frontend** (Next.js).

## Prerequisites

Install the following before you begin:

| Tool                 | Version          | Notes                                          |
|----------------------|------------------|------------------------------------------------|
| Node.js              | v18+             | LTS recommended; CI runs on Node 18            |
| pnpm                 | latest           | Workspace package manager (`npm i -g pnpm`)    |
| Rust + Cargo         | stable           | Install via [rustup](https://rustup.rs)        |
| Stellar / Soroban CLI| latest           | `cargo install --locked stellar-cli`           |
| PostgreSQL           | 15+              | Or MongoDB, depending on your config           |
| Redis                | 7+               | Caching and sessions                           |
| Git                  | latest           | Version control                                |

You will also want a Stellar wallet such as **Freighter** for interacting with the
frontend.

Add the WebAssembly target used by Soroban contracts:

```bash
rustup target add wasm32-unknown-unknown
```

## 1. Clone and Install

```bash
# Fork the repo on GitHub, then clone your fork
git clone https://github.com/<your-username>/starked-education.git
cd starked-education

# Add the upstream remote so you can sync later
git remote add upstream https://github.com/jobbykings/starked-education.git

# Install every workspace's dependencies and build contracts
pnpm install:all
```

`pnpm install:all` installs the JavaScript workspaces and runs `cargo build` for the
contracts.

## 2. Configure Environment Variables

There are environment files at the repo root and in the backend:

```bash
cp .env.example .env
cp backend/.env.example backend/.env
```

Edit each file with your local values. Key backend variables include:

- `DATABASE_URL` — connection string for PostgreSQL (or your Mongo URI).
- `REDIS_URL` — e.g. `redis://localhost:6379`.
- `JWT_SECRET` — any sufficiently random string for local development.
- IPFS and Stellar settings — see `backend/.env.example` for the full list.

## 3. Start Supporting Services

Make sure PostgreSQL and Redis are running locally (via your OS package manager, a service
manager, or Docker):

```bash
# Example with Docker
docker run -d --name starked-postgres -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=starked_dev -p 5432:5432 postgres:15
docker run -d --name starked-redis -p 6379:6379 redis:7
```

## 4. Run Each Package

### Everything at once

From the repo root, run the backend and frontend together:

```bash
pnpm dev
```

This uses `concurrently` to start `dev:backend` and `dev:frontend`.

### Backend only

```bash
cd backend
pnpm dev          # nodemon + ts-node, hot reload on src/
```

Useful backend scripts:

| Command                  | Description                          |
|--------------------------|--------------------------------------|
| `pnpm run build`         | Compile TypeScript to `dist/`        |
| `pnpm run typecheck`     | Type-check without emitting          |
| `pnpm run lint`          | Run ESLint                           |
| `pnpm run lint:fix`      | Auto-fix lint issues                 |
| `pnpm test`              | Run the Jest test suite              |

### Frontend only

```bash
cd frontend
pnpm dev          # Next.js dev server at http://localhost:3000
```

Useful frontend scripts:

| Command                  | Description                          |
|--------------------------|--------------------------------------|
| `pnpm run build`         | Production build                     |
| `pnpm run type-check`    | Type-check without emitting          |
| `pnpm run lint`          | Run Next.js / ESLint                 |
| `pnpm test`              | Run the Jest test suite              |

### Smart contracts

```bash
cd contracts

cargo build              # debug build
cargo build --release    # optimized build for deployment
cargo test               # run contract tests
cargo fmt                # format code
cargo clippy             # lint
```

To run a local Stellar network and deploy contracts:

```bash
# Start a local standalone network
stellar standalone start

# Build and deploy (see scripts/ for project-specific helpers)
cd contracts
cargo build --release
```

## 5. Verify Your Setup

Before starting work, confirm everything builds and passes:

```bash
# From the repo root
pnpm build

# Per-package checks
cd backend && pnpm run typecheck && pnpm test
cd ../frontend && pnpm run type-check && pnpm test
cd ../contracts && cargo test
```

## Keeping Your Fork in Sync

```bash
git checkout main
git fetch upstream
git merge upstream/main
git push origin main
```

## Troubleshooting

- **`wasm32-unknown-unknown` target missing** — run
  `rustup target add wasm32-unknown-unknown`.
- **Backend cannot connect to the database/Redis** — confirm the services are running and
  that `DATABASE_URL` / `REDIS_URL` in `backend/.env` are correct.
- **Frontend build runs out of memory** — increase the Node heap, e.g.
  `NODE_OPTIONS="--max-old-space-size=4096" pnpm run build` (this is what CI uses).
- **Type errors after pulling** — reinstall dependencies with `pnpm install` in the
  affected workspace.

## Next Steps

- Read [ARCHITECTURE.md](ARCHITECTURE.md) to understand how the packages fit together.
- Read [TESTING.md](TESTING.md) before writing tests.
- Read [../CONTRIBUTING.md](../CONTRIBUTING.md) for the contribution workflow.
