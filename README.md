# Shape Games Web Challenge

This repository contains a technical assignment for potential hires.

The goal is to evaluate engineering quality and decision making, not just output speed. The exercise shall be completed by implementing a frontend that utilises the provided Node backend. It also includes a physical follow-up discussion where you present your solution and improvement/scalability thinking.

See [docs/assignment.md](docs/assignment.md) for the full specification and [docs/scenarios.md](docs/scenarios.md) for test scenarios.

## Prerequisites

- **Node.js** ≥ 18
- **pnpm** ≥ 8 (`npm install -g pnpm` if not installed)
- **NextJS** Implement using NextJS together with
- **React** 

## Getting Started

```bash
# Install all dependencies (backend + frontend)
pnpm install

# Start both backend and frontend in parallel
pnpm dev
```

This runs:

- **Backend** at [http://localhost:4000](http://localhost:4000)
- **Frontend** at [http://localhost:3000](http://localhost:3000)

You can also start them individually:

```bash
pnpm dev:backend   # backend only
pnpm dev:frontend  # frontend only
```

## Running Tests

```bash
pnpm test            # run all tests
pnpm test:backend    # backend tests only (vitest)
```

## Project Structure

```
packages/
  backend/    # Express API — provided, ready to use
  frontend/   # Next.js app — your implementation goes here
docs/
  assignment.md   # Full specification
  scenarios.md    # Test scenarios with expected results
```

Run `pnpm help` for a full list of available workspace commands.
