import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import App from './components/App.js'

const queryClient = new QueryClient()

const rootEl = document.getElementById('app')
if (!rootEl) throw new Error('Missing #app element')

const root = createRoot(rootEl)
root.render(
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>
)