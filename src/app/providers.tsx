'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ClerkProvider } from '@clerk/nextjs'
import { DragDropContext } from '@hello-pangea/dnd'
import Navbar from '@/app/components/navigation/Navbar'

const queryClient = new QueryClient()

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <QueryClientProvider client={queryClient}>
        <DragDropContext onDragEnd={() => {}}>
          <Navbar />
          <main>{children}</main>
        </DragDropContext>
      </QueryClientProvider>
    </ClerkProvider>
  )
}
