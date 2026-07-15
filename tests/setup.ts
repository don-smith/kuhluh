import { Window } from 'happy-dom'

const win = new Window({ url: 'http://localhost:3000' })

// Register DOM globals that @testing-library/react needs
for (const key of Object.getOwnPropertyNames(win)) {
  if (!(key in globalThis)) {
    ;(globalThis as Record<string, unknown>)[key] =
      (win as Record<string, unknown>)[key]
  }
}