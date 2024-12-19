# TUDU - Task Management Application

A modern task management application built with Next.js, Prisma, and TypeScript.

## Features
- Real-time task management with drag-and-drop functionality
- Category organization with flexible task grouping
- Responsive design for mobile and desktop
- Optimistic updates for smooth UX
- Efficient task reordering system

## Tech Stack
- Next.js 15
- TypeScript
- Prisma with PostgreSQL
- TanStack Query
- Tailwind CSS
- Clerk Authentication
- Jest & React Testing Library

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
- `/app` - Next.js app router components and pages
- `/components` - Reusable React components
- `/lib` - Utility functions and shared logic
- `/hooks` - Custom React hooks
- `/prisma` - Database schema and migrations
