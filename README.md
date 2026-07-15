# Kuhluhs

A small React state management demo showing how to handle server state and client state with modern tooling:

- **[TanStack Query](https://tanstack.com/query)** — server state (fetching random colours, posting new ones)
- **[Zustand](https://github.com/pmndrs/zustand)** — client-only UI state (toggling the colour form)

It's the same silly colour picker it always was — but the Redux action creators, reducers, thunks, and enzyme tests have been replaced by about half the code.

## Run it

```sh
npm install
npm start
```

Then open [http://localhost:3000](http://localhost:3000).

`npm start` boots the Express API server and runs webpack in watch mode. The server serves both the API routes (`/color`) and the bundled frontend from the same port — no CORS needed.

## How it works

- **`client/store.js`** — a tiny [Zustand](https://github.com/pmndrs/zustand) store holding only `isColorFormVisible` (8 lines)
- **`client/components/ColorViewer.jsx`** — [TanStack useQuery](https://tanstack.com/query/latest/docs/react/reference/useQuery) manages the GET `/color` call. Clicking the link calls `refetch()`. Loading state comes from `isFetching` — no manual flag required.
- **`client/components/AddColor.jsx`** — [TanStack useMutation](https://tanstack.com/query/latest/docs/react/reference/useMutation) handles the POST `/color` call. The form toggle is read from the Zustand store via `useStore()`.
- **`server/`** — a plain Express API with a 2-second artificial delay so you can see the loading states. Three routes: `GET /color` (random), `GET /color/all`, `POST /color`.
- **`tests/`** — [React Testing Library](https://testing-library.com/docs/react-testing-library/intro) with `@testing-library/jest-dom` matchers. No more enzyme.

## Scripts

| Command | What it does |
|---|---|
| `npm start` | Start server + webpack watch (development) |
| `npm run build` | Webpack bundle only |
| `npm test` | Run Jest tests |

## What changed from the Redux version

The diff shows the pattern shift clearly:

```diff
- connect(mapStateToProps, mapDispatchToProps)(ColorViewer)
- dispatch(requestingColor())  →  superagent.get(...)  →  dispatch(receivingColor(data))
+ useQuery({ queryKey: ['color'], queryFn: fetch('/color').then(r => r.json()) })

- redux store: { color, isWaitingOnApi, isColorFormVisible }
+ tanstack query:  { data, isFetching }        ← handles colour + loading
+ zustand store:   { isColorFormVisible }      ← only UI state
```

## Prior art

The original Redux version taught action creators, thunks, and `connect()`. That commit history is still here — scroll back to `64f8179`.
