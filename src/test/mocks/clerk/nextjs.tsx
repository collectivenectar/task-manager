import React, { Fragment, createElement } from 'react'

export const auth = jest.fn().mockReturnValue({
  userId: 'test-user-id',
  sessionId: 'test-session-id',
  getToken: jest.fn().mockResolvedValue('test-token')
})

export const currentUser = jest.fn().mockResolvedValue({
  id: 'test-user-id',
  emailAddresses: [{ emailAddress: 'test@example.com' }],
  firstName: 'Test',
  lastName: 'User'
})

export const MockClerkProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <div data-testid="clerk-provider">{children}</div>
  )
}

export const useAuth = jest.fn().mockReturnValue({
  isLoaded: true,
  isSignedIn: true,
  userId: 'test-user-id'
})

export const useUser = jest.fn().mockReturnValue({
  isLoaded: true,
  isSignedIn: true,
  user: {
    id: 'test-user-id',
    emailAddresses: [{ emailAddress: 'test@example.com' }],
    firstName: 'Test',
    lastName: 'User'
  }
})

export const SignIn = () => null
export const SignUp = () => null
export const SignedIn = ({ children }: { children: React.ReactNode }) => children
export const SignedOut = () => null 