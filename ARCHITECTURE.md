# Architecture — Kuhluhs

A walkthrough of how this small React app is built, what each piece does, and why it's structured this way.

---

## The big idea: two kinds of state

The original Redux version of this app put **everything** into one global store — server data, loading flags, UI toggles. The modern approach splits that into two concerns:

| Concern | Tool | What it owns |
|---|---|---|
| **Server state** | [TanStack Query](https://tanstack.com/query) | Colour data from the API, loading/error states, mutation lifecycle |
| **Client state** | [Zustand](https://github.com/pmndrs/zustand) | `isColorFormVisible` — a UI toggle that only matters to the browser |

Server state is **data the server owns the source of truth for**. Client state is **ephemeral UI state that the server doesn't know or care about**. Treating them differently eliminates about half the boilerplate.

---

## Component tree

```
createRoot(document.getElementById('app'))
└── QueryClientProvider           ← TanStack Query context
    └── App                       ← "Kuhluhs" title
        └── ColorViewer          ← GET /color via useQuery
            └── AddColor         ← POST /color via useMutation
                └── useStore()   ← Zustand for form toggle
```

No Redux `<Provider>`. No `connect()` HOCs. Every component reads what it needs directly through hooks.

---

## Data flow

### 1. Fetching a random colour

```
User clicks "Get uh kuhluh"
    │
    ▼
ColorViewer.handleGetColor()
    │  setHasRequested(true)        ← so we show something after the first fetch
    │  refetch()
    ▼
useQuery({ enabled: false, refetchOnWindowFocus: false })
    │  queryFn: () => fetch('/color').then(r => r.json())
    │  TanStack Query: fetchStatus → 'fetching', isFetching → true
    ▼
Express GET /color
    │  db.getColor() returns a random { id, name } after 2s
    ▼
TanStack Query: data = { id: 7, name: 'Goldenrod' }, isFetching → false
    │
    ▼
ColorViewer renders <div className='swatch' style={{ backgroundColor: 'Goldenrod' }}>
```

The entire `REQUESTING_COLOR` → `UPDATE_COLOR` action/reducer cycle from Redux collapses into `isFetching` and `data`.

### 2. Adding a new colour

```
User clicks "Add uh kuhluh"
    │
    ▼
AddColor: toggleColorForm()               ← Zustand: isColorFormVisible → true
    │
    ▼
User types "PapayaWhip", clicks "Add"
    │
    ▼
mutation.mutate("PapayaWhip")             ← TanStack useMutation
    │  mutationFn: POST /color { color: "PapayaWhip" }
    │  mutation.isPending → true          ← hide form/button
    ▼
Express POST /color
    │  await db.addColor("PapayaWhip") ... 2s delay ... resolved
    │  res.sendStatus(201)
    ▼
TanStack Query: onSuccess fires
    │  toggleColorForm()                  ← Zustand: hide form, show link again
    │  mutation.isPending → false
```

The old `SAVING_NEW_COLOR` → `SAVED_NEW_COLOR` thunk/reducer pair becomes a single `useMutation` call with an `onSuccess` callback.

---

## File-by-file guide

### Client (`client/`)

| File | Lines | What it does |
|---|---|---|
| `index.tsx` | Entry point. `createRoot()` with a null-check on `getElementById`. Wraps app in `<QueryClientProvider>`. No Redux, no CJS `require()`. |
| `store.ts` | Zustand store typed with `StoreState` interface. One field (`isColorFormVisible`), one action (`toggleColorForm`). |
| `components/App.tsx` | Stateless shell. Renders an `<h1>` and `<ColorViewer />`. No explicit React import needed (JSX automatic runtime). |
| `components/ColorViewer.tsx` | **The main component.** Uses `useQuery<Color>` typed with the shared `Color` interface. `enabled: false` + `refetch()` for on-demand fetching. `handleGetColor` typed as `React.MouseEvent`. |
| `components/AddColor.tsx` | Form toggle via typed `useStore()`. Colour submission via `useMutation` with typed `mutationFn: (colorName: string)`. `useRef<HTMLInputElement>` for the input instead of the old module-level `let colorName = null`. `mutation.isPending` hides the form/link while the POST is in flight. |

### Server (`server/`)

| File | What it does |
|---|---|
| `index.ts` | Starts Express on port 3000. `import.meta.dir` replaces CJS `__dirname`. |
| `server.ts` | Configures Express: `express.json()`, `cors()`, serves `server/static/`, mounts `/color` routes. ESM with `import path from 'node:path'`. |
| `routes/colors.ts` | Three routes: `GET /color` (random), `GET /color/all`, `POST /color`. Uses `async/await` instead of callbacks. Typed `Request`/`Response` from Express. |
| `db.ts` | In-memory colour store with 2-second artificial `setTimeout` delays. Returns **Promises** instead of the old Node callback pattern. Exports typed `Color` interface.

### Tests (`tests/`)

| File | What it does |
|---|---|
| `setup.ts` | Creates a `happy-dom` `Window` and registers its DOM globals (`document`, `window`, etc.) so `@testing-library/react` can render components in Bun's test runner. Configured via `bunfig.toml` → `[test].preload`. |
| `index.test.tsx` | One test: renders `<App />` inside a `QueryClientProvider` wrapper and asserts the heading is "Kuhluhs". Uses Bun's `test`/`expect` from `bun:test` and React Testing Library's `render()`/`screen`. No `jest-dom` — plain `.textContent` assertion. |

### Config

| File | What it does |
|---|---|
| `tsconfig.json` | TypeScript configuration for editor support (Bun doesn't need it to run). `strict: true`, `jsx: "react-jsx"` (automatic runtime), `moduleResolution: "bundler"`. |
| `bunfig.toml` | Bun project config. Configures `[test].preload` to load `tests/setup.ts` (DOM environment) before tests. |
| `bun.lock` | Lockfile for Bun (text format, replaces `package-lock.json`). Commit this. |
| `package.json` | React 18, TanStack Query 5, Zustand 5, Express 4. `"type": "module"` for ESM. `devDependencies` only needs `@testing-library/react`, `@types/*`, `happy-dom`, and `bun-types`. No webpack, babel, jest, or CSS loaders — Bun handles all of that natively. |
| `types.ts` | Shared `Color` interface (`{ id: number, name: string }`). Imported by server, client, and tests.

---

## API contract

The Express server exposes three endpoints, all under `http://localhost:3000`:

| Method | Path | Response | Delay |
|---|---|---|---|
| `GET` | `/color` | `{ id: number, name: string }` — random | 2s |
| `GET` | `/color/all` | `[{ id, name }, ...]` — all colours | 0s |
| `POST` | `/color` | `201 Created` — adds `{ color: string }` from body | 2s |

The client uses **relative URLs** (`/color`) because both the frontend bundle and API are served from the same Express process on port 3000. No CORS headers are needed in the normal flow — the `cors({ origin: 'http://localhost:8080' })` middleware is vestigial from when webpack-dev-server ran on a different port.

---

## Patterns worth pointing out

### `enabled: false` + `refetch()` for on-demand queries

TanStack Query is designed for data that loads automatically. But the colour picker is a *manual* fetch — click to load, with an artificial delay. The pattern:

```js
const { data, isFetching, refetch } = useQuery({
  queryKey: ['color'],
  queryFn: () => fetch('/color').then(r => r.json()),
  enabled: false,          // don't fetch on mount
  refetchOnWindowFocus: false,  // don't refetch on tab switch
})

// user clicks → refetch()
```

This gives us `isFetching` (true during the 2s server delay) without the query auto-firing on mount or on window focus.

### `hasRequested` for the empty-state problem

Before the user ever clicks, `data` is `undefined`. We don't want to show an empty swatch. `hasRequested` (local `useState`) tracks whether the user has ever clicked. Only after the first click do we render the swatch area.

This is a genuine design decision: TanStack Query doesn't distinguish "never fetched" from "fetched but empty result". A local flag is the cleanest fix.

### Why Zustand exists at all

You could argue that `isColorFormVisible` should just be local `useState` in `AddColor`. And you'd be right — for *this* app. Zustand is here to demonstrate the pattern for when client state *does* need to be shared across components (themes, filters, user preferences). In a real app, `isColorFormVisible` would stay local, and Zustand would hold something like `{ sidebarOpen, activeFilters, theme }`.

### `useRef` instead of module-level mutables

The old code used `let colorName = null` at module scope and assigned it via a callback ref. This is fragile — it breaks if the component ever renders more than once. `useRef<HTMLInputElement>(null)` gives each component instance its own stable, typed reference.

### Bun: one tool instead of five

Bun replaces five separate tools this project previously needed:

| Instead of | Bun provides |
|---|---|
| Node.js | `bun run` (runs TS/TSX natively) |
| npm / yarn | `bun install` (and `bun.lock` lockfile) |
| webpack + babel | `bun build` (bundles TSX→JS in 26ms) |
| Jest + jsdom | `bun test` (native test runner, happy-dom preload) |
| tsc | built-in transpiler (no emit step needed) |

The dev script (`bun start`) runs the bundler in watch mode and the server concurrently — no webpack-dev-server, no babel config.

---

## What this app doesn't show (on purpose)

- **Caching / stale-while-revalidate** — the colour endpoint returns a random result each time, so caching wouldn't make sense. TanStack Query's caching shines when you *want* to reuse results.
- **Error handling** — the server always succeeds. A real app would check `isError` and render an error boundary.
- **Optimistic updates** — the POST mutation waits for the server response before closing the form. In a real app you might close the form immediately and roll back on failure.
- **Real-time sync** — no WebSockets or Server-Sent Events. State changes are purely request-response.
