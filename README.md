# TUDU - Task Management Application

A modern task management application built with Next.js, Prisma, and TypeScript.

## Features
- ✅ Full CRUD task management with drag-and-drop organization
- 🔍 Search and filter tasks by title, description, status, and category
- 📱 Responsive design for mobile and desktop
- 🚀 Optimistic updates for smooth UX
- 👥 Multi-user support via Clerk authentication
- 📂 Category-based task organization

## Tech Stack
- Next.js 14 with Server Actions
- TypeScript (end-to-end type safety)
- Prisma with PostgreSQL
- TanStack Query for state management
- Tailwind CSS
- Clerk Authentication
- Jest & React Testing Library
- Hello Pangea DnD (maintained fork of react-beautiful-dnd)
- Headless UI for accessible components
- Zod for runtime type validation

## Getting Started
1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables:   ```env
   DATABASE_URL=your_db_url
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_key
   CLERK_SECRET_KEY=your_clerk_secret   ```
4. Run migrations: `npx prisma migrate dev`
5. Start development server: `npm run dev`

## Architecture
- Server Actions for API endpoints (eliminates need for separate API routes)
- React Query for client-state management and server-state caching
- Clerk for authentication and user management
- Prisma for type-safe database operations

## Security & Performance
- Server-side ownership verification on all operations
- Optimistic updates with error recovery
- Float-based positioning for efficient task reordering
- Ready for pagination/virtual scrolling

## Testing Coverage
- Unit tests for components and forms
- Integration tests for task management flows
- Mocked external services (Clerk, Prisma)
- Test utilities for common testing patterns

## Assumptions & Decisions
- Used Clerk over NextAuth for better TypeScript support
- Chose PostgreSQL for robust ordering capabilities
- Implemented categories as a required relationship
- Optimized for mobile-first development
