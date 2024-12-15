# Task Manager Application

It allows users to manage tasks efficiently, with features like categorization, drag-and-drop organization, and is responsively designed for desktop and mobile devices.

## Tech Stack
- **Frontend**: Next.js with TypeScript
- **Backend**: Next.js API Routes
- **Database**: Neon Serverless PostgreSQL with Prisma ORM
- **Styling**: Tailwind CSS
- **State Management**: TanStack Query, Zustand

## Setup (WIP)
1. Clone the repository.
2. Install dependencies: `npm install`.
3. Create a `.env` file based on `.env.example`.
4. Run the development server: `npm run dev`.

## CI/CD
- **CI Pipeline**: GitHub Actions is configured to automatically run tests, linting, and type-checking on every push to the repository.
  - Tests: Runs unit and integration tests
  - Linting: Ensures code quality with ESLint.
  - Type Checking: Runs `tsc --noEmit` to ensure TypeScript type safety quickly during development.

## Features (Planned)
- Create, update, and delete tasks.
- Multi user profiles.
- Drag-and-drop task organization.
- Search and filter tasks.

**Status**: 🚧 Work in Progress 🚧
