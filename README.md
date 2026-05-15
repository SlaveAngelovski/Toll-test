# Toll Fee System

A monorepo containing a toll fee calculation backend (Express + TypeScript) and a frontend UI (Next.js + React).

---

## Setup and Run Instructions

### Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [pnpm](https://pnpm.io/) v8+ (`npm install -g pnpm`)

### Install dependencies

```bash
pnpm install
```

### Run both services in development mode

```bash
pnpm dev
```

This starts the backend on `http://localhost:4000` and the frontend on `http://localhost:3000` in parallel.

### Run services individually

```bash
pnpm dev:backend    # Express API on port 4000
pnpm dev:frontend   # Next.js UI on port 3000
```

### Run tests

```bash
pnpm test           # all packages
pnpm test:backend   # backend unit tests only (Vitest)
```

---

### Assumptions

- **Timezone is Europe/Copenhagen** — all toll-free day/holiday logic runs in that timezone regardless of where the server is hosted.
- **Holiday tables are hardcoded** — the frontend has static lists for 2025 and 2026 (`passagesRules.ts`); the backend only covers 2024 and 2025 (`datetime.ts`). Dates outside those ranges are treated as non-holidays. The backend is therefore missing 2026 holidays and both sides need a dynamic solution.
- **Charge calculation lives in the frontend** — `passagesLogic.ts` re-implements the hourly window and daily cap rules client-side for display purposes. This is intentional for responsiveness but means the two implementations must be kept in sync.
- **Single-toll-station model** — there is no concept of multiple gates or corridors; every passage is treated as a single chargeable event at one station.
- **Vehicle ID is a free-form string** — no registration-plate validation is performed; callers are trusted to supply consistent identifiers.
- **Passages are immutable after creation** — the API supports create and delete only; editing a passage requires delete + re-create.

---

### Tradeoffs

| Decision | Benefit | Cost |
|---|---|---|

- **Hardcoded fee schedule array**
- **Business logic duplicated in the frontend**
- **Flat error state in the frontend**
- **Possibly unoptimized React rendering performance**

---

### Improvements and Scalability Notes

- **Dynamic configurable public holidays** — replace the hardcoded year arrays in both the frontend (`passagesRules.ts`) and backend (`datetime.ts`) with a shared config file or an external calendar API. The backend is currently also missing the 2026 holiday table entirely.
- **Externalise the fee schedule** — move it to a config file or database table so operators can update tariffs without a code change.
- **Frontend: vehicle ID search** — add a text input above the passages table to filter by vehicle ID.
- **Frontend: vehicle type filter** — add a multi-select or checkbox group to show only passages for selected vehicle types.
- **Frontend: date range filter** — add from/to date pickers on the passages table so operators can narrow the view without loading all records.
- **Frontend: structured error handling with severity levels** — replace the single `string | null` error state with an error queue typed as `{ message: string; severity: 'info' | 'warn' | 'error' }[]`. This lets multiple concurrent errors coexist and allows the UI to style them differently (toast vs. modal vs. inline banner).
- **Add pagination** to `GET /getPassages` — returning all passages in one response will not scale.
- **Multi-day query support** — add `from`/`to` query parameters so callers can request passages for a specific date range without loading everything.

---

### What I Would Do Next With More Time

1. **Add the 2026 holiday table to the backend** — `packages/backend/src/utils/datetime.ts` only covers 2024 and 2025; passages in 2026 are treated as non-holidays.
2. **Dynamic configurable holidays** — replace both the frontend and backend hardcoded year arrays with a shared, versioned config (JSON file or database table) that can be updated without a deployment.
3. **Frontend: vehicle ID search, vehicle type filter, date range filter** — add filter controls above the passages table so operators can narrow the view efficiently.
4. **Frontend tests** — add unit tests for `dateUtils.ts` (timezone edge cases, holiday detection, DST boundaries) and for the time-window grouping logic in `passagesLogic.ts`.
6. **Add an OpenAPI spec** — using `zod-to-openapi` or similar, generated from the existing Zod schemas so documentation stays in sync automatically.
7. **CI pipeline** — lint, type-check, and test on every PR.
8. **Frontend error state** — currently a single `string | null` managed in `page.tsx`. This is lossy: concurrent errors overwrite each other and there is no severity signal. The improvement is a typed error queue: `{ id: string; message: string; severity: 'info' | 'warn' | 'error'; timestamp: number }[]`. This lets the UI display multiple errors simultaneously, auto-dismiss `info`-level toasts while keeping `error`-level messages until dismissed, and report severity visually.

---

## Tests

### Frontend test strategy

The priority test areas are:

**`dateUtils.ts` — unit tests (Vitest)**

| Function | Cases to cover |
|---|---|
| `toDateKey` | UTC midnight boundary (a timestamp just before and just after midnight Copenhagen time should produce different date keys) |
| `isTollFreeHoliday` | Known 2025 and 2026 holidays return `true`; adjacent non-holiday dates return `false` |
| `isTollFreeWeekday` | Saturday and Sunday in Copenhagen time return `true`; Friday returns `false` |
| `isTollFreeDate` | A holiday that falls on a weekday, a weekend that is not a holiday |
| `localMinutesSinceMidnight` | Timestamps across a DST transition produce correct local minutes |
| `formatDateTime` / `formatTime` | Output matches expected locale string for a fixed Copenhagen timestamp |
| `annotatePassages` — window grouping | Two passages within 60 min → same window; passage at exactly 60 min → new window |
| `annotatePassages` — highest-fee rule | Within a window, only the passage with the highest base fee is marked `charged`; ties broken by earliest timestamp |
| `annotatePassages` — daily cap | Charges stop (or are partial) once the 120 DKK cap is reached for a vehicle on a given calendar day |
| `annotatePassages` — toll-free vehicle | All passages for a toll-free vehicle type have `chargedFee = 0` |
| `annotatePassages` — toll-free date | All passages on a weekend/holiday have `chargedFee = 0` regardless of vehicle type |
| `annotatePassages` — multi-day | Passages spanning midnight are grouped into separate calendar days with independent caps |
| `getBaseFee` | Each fee-schedule interval boundary returns the correct fee; off-peak returns 0 |
| `groupIntoWindows` | Toll-free passages (no `windowStart`) are each placed in their own group keyed by calendar date |
| `groupIntoWindows` | Multiple windows on the same day produce distinct groups in chronological order |
| `perDayTotals` | Totals are scoped per `(vehicleId, dateKey)` and do not bleed across vehicles or days |

---

## Architecture

### Components and boundaries

```
┌──────────────────────────────────────────────────────────────────┐
│  Frontend (Next.js / React)                                      │
│                                                                  │
│  src/app/page.tsx              – root page, state, event wiring  │
│  src/app/components/           – presentational React components │
│    PassagesTable.tsx           – grouped table with annotations  │
│    AddPassageModal.tsx         – create-passage form             │
│    VehicleTypePicker.tsx       – vehicle type selector           │
│    ErrorModal.tsx              – error display                   │
│  src/passageBusiness/          – client-side charge logic        │
│    passagesRules.ts            – fee schedule, holiday lists     │
│    passagesLogic.ts            – window grouping, annotation     │
│  src/app/utils/dateUtils.ts    – Copenhagen timezone helpers     │
│  src/lib/api.ts                – HTTP client, all fetch calls    │
│  src/types/index.ts            – shared TypeScript types         │
└──────────────────────────────────┬───────────────────────────────┘
```

**Key design principle:** `tollCalculator.ts` is a pure module — it takes arrays of `TollPassage` objects and returns a `Map` of charges. It has no side effects and no imports from Express or the store. This makes it trivially testable and easy to swap the surrounding infrastructure without touching business logic.

**Frontend business logic layer (`passageBusiness/`):** The frontend re-implements the hourly-window and daily-cap rules in `passagesLogic.ts` so that the table can annotate each passage with its charge reason and window membership without waiting for the backend. `passagesRules.ts` holds the constants (fee schedule, holiday lists, daily cap) that both the display logic and tests depend on. This layer is framework-agnostic — no React imports — which keeps it unit-testable.

**Business logic layer (`src/app/hooks/useAnnotatedPassages.ts`):** `groupIntoWindows`, `groupByVehicleId`, `perDayTotals`, and the `annotatePassages` call have been extracted from `PassagesTable` into a `useAnnotatedPassages` hook. The hook accepts a flat `Passage[]` and returns a `Map<vehicleId, VehicleData>` containing pre-sorted passages, annotations, per-day totals, and window groups. `PassagesTable` is now a pure rendering component.

### Key tradeoff: recalculate-on-read vs. store-on-write

The current design recalculates charges for every passage on every `GET /getPassages` call.

### How the design could evolve

- **Configurable rules** — extract `FEE_SCHEDULE`, `DAILY_CAP`, and `TOLL_FREE_VEHICLE_TYPES` into a `RulesConfig` object that is passed into `calculateCharges`. Different toll stations or future tariff changes only need a new config, not a code change.
- **More traffic** — partition the store by `(vehicleId, dateKey)` and process each partition concurrently (e.g. using `Promise.all`). Long-term, move to a database with an index on those columns.
- **Multi-day requests** — add a date-range filter to `listPassages` so the calculator only processes relevant passages instead of the full dataset.
- **Multiple toll stations** — add a `stationId` field to `TollPassage`. The hourly-window rule would apply per vehicle per station, or globally depending on the business requirement; the grouping key in `calculateCharges` would change accordingly.

---

## Observability and Error Reporting

### Log levels

| Level | What to log |
|---|---|
| `info` | Server start (port, environment), each inbound request (method, path, status, latency) |
| `warn` | Validation failures (invalid vehicle type, malformed timestamp), requests for unknown passage IDs on delete |
| `error` | Unhandled exceptions, unexpected internal errors (e.g. `calculateCharges` throws on a bad timestamp) |
| **never log** | Personally Identifiable Information, vehicle IDs in plain text in production or similar.
