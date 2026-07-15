import { test, expect } from 'bun:test'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import App from '../client/components/App.js'

function renderWithProviders (ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  })
  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  )
}

test('<App /> renders heading', () => {
  renderWithProviders(<App />)
  expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Kuhluhs')
})