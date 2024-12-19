import '@testing-library/jest-dom'
import 'whatwg-fetch'

// Mock console methods
const originalConsole = { ...console }
beforeAll(() => {
  console.log = jest.fn()
  console.error = jest.fn()
})

afterAll(() => {
  console.log = originalConsole.log
  console.error = originalConsole.error
})

class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

global.ResizeObserver = MockResizeObserver

// Add any other global mocks needed for tests
global.DOMRect = class DOMRect {
  bottom = 0
  height = 0
  left = 0
  right = 0
  top = 0
  width = 0
  x = 0
  y = 0
  static fromRect(other?: DOMRectInit): DOMRect {
    return new DOMRect()
  }
  toJSON() {
    return this
  }
}

// Mock Clerk
jest.mock('@clerk/nextjs')

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
    }
  },
  useSearchParams() {
    return {
      get: jest.fn(),
    }
  },
}))

// Mock OpenAI for all tests
jest.mock('openai', () => {
  return jest.fn(() => ({
    chat: {
      completions: {
        create: jest.fn()
      }
    }
  }))
}) 