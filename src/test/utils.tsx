import { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, RenderResult } from '@testing-library/react'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

interface RenderWithProvidersOptions {
  queryClientConfig?: {
    defaultOptions?: {
      queries?: {
        enabled?: boolean
      }
    }
  }
}

export function renderWithProviders(
  ui: ReactNode,
  options: RenderWithProvidersOptions = {}
): RenderResult {
  void options;
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
      <ToastContainer position="bottom-right" />
    </QueryClientProvider>
  )
} 