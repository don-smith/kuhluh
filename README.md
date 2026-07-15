# Kuhluhs

A small TypeScript + React state management demo showing how to handle server state and client state with modern tooling:

- **[TanStack Query](https://tanstack.com/query)** — server state (fetching random colours, posting new ones)
- **[Zustand](https://github.com/pmndrs/zustand)** — client-only UI state (toggling the colour form)
- **[Bun](https://bun.sh)** — runtime, bundler, test runner, and package manager (one tool replaces Node, webpack, babel, Jest, and npm)

It's the same silly colour picker it always was — but the Redux action creators, reducers, thunks, enzyme tests, JavaScript, CJS, webpack, and babel have been replaced by about half the code.

## Run it

```sh
bun install
bun start
```

Then open [http://localhost:3000](http://localhost:3000).

`bun start` builds the client with Bun's bundler in watch mode and starts the Express API server. The server serves both the API routes (`/color`) and the bundled frontend from the same port — no CORS needed.

## How it works

- **`client/store.ts`** — a tiny typed [Zustand](https://github.com/pmndrs/zustand) store holding only `isColorFormVisible`
- **`client/components/ColorViewer.tsx`** — [TanStack `useQuery<Color>`](https://tanstack.com/query/latest/docs/react/reference/useQuery) manages the `GET /color` call. Clicking the link calls `refetch()`. Loading state comes from `isFetching`.
- **`client/components/AddColor.tsx`** — [TanStack `useMutation`](https://tanstack.com/query/latest/docs/react/reference/useMutation) handles the `POST /color` call. `useRef<HTMLInputElement>` for typed DOM access. Form toggle via Zustand's `useStore()`.
- **`server/`** — a plain Express API with a 2-second artificial delay so you can see the loading states. Three routes: `GET /color` (random), `GET /color/all`, `POST /color`. Callbacks replaced with `Promise` + `async/await`.
- **`types.ts`** — shared `Color` interface used across server, client, and tests.
- **`tests/`** — [React Testing Library](https://testing-library.com/docs/react-testing-library/intro) with Bun's native test runner and a `happy-dom` preload for DOM globals. No Jest, no enzyme, no `jest-dom`.

## Scripts

| Command | What it does |
|---|---|
| `bun start` | Build client + start server, both in watch mode |
| `bun run build` | Bundle client only (Bun's built-in bundler) |
| `bun test` | Run tests with Bun's native test runner |

## What changed from the Redux version

```diff
- connect(mapStateToProps, mapDispatchToProps)(ColorViewer)
- dispatch(requestingColor())  →  superagent.get(...)  →  dispatch(receivingColor(data))
+ useQuery<Color>({ queryKey: ['color'], queryFn: fetch('/color').then(r => r.json()) })

- redux store: { color, isWaitingOnApi, isColorFormVisible }
+ tanstack query:  { data: Color, isFetching }     ← typed server state
+ zustand store:   { isColorFormVisible }          ← typed client state
```

## Prior art

The original Redux + JavaScript version taught action creators, thunks, and `connect()`. That commit history is still here — scroll back to `64f8179`.
