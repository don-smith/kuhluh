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
    │  db.addColor("PapayaWhip", cb) ... 2s delay ... callback(null)
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
| `index.js` | 12 | Entry point. Creates React 18 root with `createRoot()`, wraps app in `<QueryClientProvider>`. No Redux provider, no middleware composition, no devtools wiring. |
| `store.js` | 8 | Zustand store. One field (`isColorFormVisible`), one action (`toggleColorForm`). That's the entire client-state layer. |
| `components/App.jsx` | 10 | Stateless shell. Renders an `<h1>` and `<ColorViewer />`. |
| `components/ColorViewer.jsx` | 47 | **The main component.** Uses `useQuery` with `enabled: false` so the query sits idle until the user clicks. `refetch()` triggers the fetch; `isFetching` drives the loading spinner; `data.name` drives the colour swatch. `hasRequested` (local `useState`) controls whether we show the initial empty swatch or not — a distinction TanStack Query doesn't handle because the query itself determines "has data ever been loaded?". |
| `components/AddColor.jsx` | 38 | Form toggle via `useStore()` (Zustand). Colour submission via `useMutation` (TanStack Query). Uses `useRef` for the input value instead of the old module-level `let colorName = null`. `mutation.isPending` hides the form/link while the POST is in flight. |

### Server (`server/`)

| File | What it does |
|---|---|
| `index.js` | Starts Express on port 3000 |
| `server.js` | Configures Express: `express.json()`, `cors()`, serves `server/static/`, mounts `/color` routes |
| `routes/colors.js` | Three routes: `GET /color` (random), `GET /color/all`, `POST /color` |
| `db.js` | In-memory colour store with 2-second artificial `setTimeout` delays. Returns callbacks so the API feels realistic. |

### Tests (`tests/`)

| File | What it does |
|---|---|
| `setup.js` | Empty placeholder — `@testing-library/jest-dom` is imported directly in test files |
| `index.test.js` | One test: renders `<App />` inside a QueryClientProvider wrapper and asserts the heading is "Kuhluhs". Uses `render()` and `screen.getByRole()` from React Testing Library instead of enzyme's `shallow()` + `.find()`. |

### Config

| File | What it does |
|---|---|
| `webpack.config.js` | Webpack 5. Single entry (`client/index.js`), Babel-loader for JSX, bundles to `server/static/bundle.js`. |
| `package.json` | React 18, TanStack Query 5, Zustand 5, Express 4. Babel 7 presets with `runtime: "automatic"` (no `import React` needed). Jest 29 with `jsdom` environment. |

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

The old code used `let colorName = null` at module scope and assigned it via a callback ref. This is fragile — it breaks if the component ever renders more than once. `useRef(null)` gives each component instance its own stable reference.

---

## What this app doesn't show (on purpose)

- **Caching / stale-while-revalidate** — the colour endpoint returns a random result each time, so caching wouldn't make sense. TanStack Query's caching shines when you *want* to reuse results.
- **Error handling** — the server always succeeds. A real app would check `isError` and render an error boundary.
- **Optimistic updates** — the POST mutation waits for the server response before closing the form. In a real app you might close the form immediately and roll back on failure.
- **Real-time sync** — no WebSockets or Server-Sent Events. State changes are purely request-response.
