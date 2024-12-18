'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ClerkProvider } from '@clerk/nextjs'
import { DragDropContext } from '@hello-pangea/dnd'
import Navbar from '@/app/components/navigation/Navbar'
import { useState } from 'react'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())

  return (
    <ClerkProvider>
      <QueryClientProvider client={queryClient}>
        <DragDropContext onDragEnd={() => {}}>
          <Navbar />
          <main>{children}</main>
          <ToastContainer theme="dark" />
        </DragDropContext>
      </QueryClientProvider>
    </ClerkProvider>
  )
}
