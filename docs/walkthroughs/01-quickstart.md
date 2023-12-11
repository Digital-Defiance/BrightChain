---
title: "Quickstart"
parent: "Walkthroughs"
nav_order: 2
permalink: /walkthroughs/01-quickstart/
---
# Quickstart

| Field          | Value                                  |
|----------------|----------------------------------------|
| Prerequisites  | Git, Node.js 20+, Yarn                |
| Estimated Time | 15 minutes                             |
| Difficulty     | Beginner                               |

## Introduction

This guide takes you from zero to a working BrightChain development environment. By the end you will have the repository cloned, dependencies installed, tests passing, and your first BrightDB query executed. Two installation paths are provided — pick whichever suits your setup.

> **Terminology note:** "BrightDB" is the product name for the `@brightchain/db` package. You will see `BrightDb` in code examples (it is the class name), but in conversation and documentation we refer to the product as BrightDB.

## Prerequisites

- **Git** — any recent version ([git-scm.com](https://git-scm.com/))
- **Node.js 20+** — required runtime ([nodejs.org](https://nodejs.org/))
- **Yarn** — package manager ([yarnpkg.com](https://yarnpkg.com/))
- **Docker** (optional) — only needed for the Docker-based path ([docker.com](https://www.docker.com/))

## Steps

### Step 1: Clone the Repository

```bash
git clone https://github.com/Digital-Defiance/BrightChain.git
cd BrightChain
```

From here, choose either the **non-Docker path** (Step 2a) or the **Docker-based path** (Step 2b).

---

### Step 2a: Non-Docker Installation

#### Install Node.js 20+

Download and install Node.js 20 or later from [nodejs.org](https://nodejs.org/). Verify the version:

```bash
node --version
# Expected: v20.x.x or higher
```

#### Install Yarn

If you do not already have Yarn installed:

```bash
npm install -g yarn
```

Verify:

```bash
yarn --version
```

#### Install Dependencies

From the repository root, run:

```bash
yarn install
```

This installs all workspace dependencies across every package in the Nx monorepo.

#### Verify the Installation

Run the core library test suite to confirm everything is working:

```bash
npx nx test brightchain-lib
```

All tests should pass. If they do not, see the [Troubleshooting](#troubleshooting) section below.

---

### Step 2b: Docker-Based Installation

The repository includes a Dev Container configuration in `.devcontainer/`. You can use it with VS Code, GitHub Codespaces, or any Dev Container-compatible tool.

#### Using VS Code Dev Containers

1. Install the [Dev Containers extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers).
2. Open the cloned repository in VS Code.
3. When prompted, click **Reopen in Container** (or run the command **Dev Containers: Reopen in Container** from the command palette).
4. The container builds and installs all dependencies automatically.

#### Using Docker Compose Directly

```bash
docker compose -f .devcontainer/docker-compose.yml up -d
docker compose -f .devcontainer/docker-compose.yml exec app bash
```

Once inside the container, verify the installation:

```bash
npx nx test brightchain-lib
```

---

### Step 3: Run Your First BrightDB Query

Create a file called `hello-brightdb.ts` in the repository root (or anywhere convenient) with the following content:

```typescript
import { BrightDb, InMemoryDatabase } from '@brightchain/db';

async function main() {
  // Create an in-memory block store
  const blockStore = new InMemoryDatabase();

  // Instantiate BrightDb backed by the in-memory store
  const db = new BrightDb(blockStore);
  await db.connect();

  // Get a collection and insert a document
  const users = db.collection('users');
  await users.insertOne({ name: 'Alice', role: 'developer' });

  // Query it back
  const alice = await users.findOne({ name: 'Alice' });
  console.log(alice); // { _id: '...', name: 'Alice', role: 'developer' }
}

main().catch(console.error);
```

This example creates an `InMemoryDatabase` (a lightweight block store that lives in memory), wraps it with BrightDB, inserts a document into a `users` collection, and queries it back — all using the familiar MongoDB-like API that BrightDB provides.

## Troubleshooting

### Node.js version too old

If you see errors about unsupported syntax or missing APIs, verify your Node.js version:

```bash
node --version
```

BrightChain requires Node.js 20 or later. If your version is older, upgrade via [nodejs.org](https://nodejs.org/) or a version manager like [nvm](https://github.com/nvm-sh/nvm).

### Yarn dependency resolution failures

If `yarn install` fails with dependency conflicts:

1. Delete `node_modules` and any lock file artifacts.
2. Run `yarn install` again.
3. If the issue persists, try clearing the Nx cache: `npx nx reset`.

### `npx nx test brightchain-lib` fails

- Ensure dependencies are fully installed (`yarn install` completed without errors).
- Clear the Nx cache and retry: `npx nx reset && npx nx test brightchain-lib`.
- Check that no other process is occupying required ports.

### Docker container fails to build

- Ensure Docker is running and you have sufficient disk space.
- Try rebuilding without cache: `docker compose -f .devcontainer/docker-compose.yml build --no-cache`.

For more detailed troubleshooting, see the [Troubleshooting & FAQ](./06-troubleshooting-faq) guide.

## Next Steps

- [Architecture Overview](./00-architecture-overview) — Understand how BrightChain's layers fit together.
- [Node Setup](./02-node-setup) — Configure and start a BrightChain node.
- [Docker Node Setup](../guides/docker-node-setup) — Run a production node with Docker.
- [BrightDB Usage](./04-brightdb-usage) — Deep dive into the document database API.
