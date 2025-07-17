import '@testing-library/jest-dom'

// Mock Web APIs for testing
global.fetch = jest.fn()
global.localStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  clear: jest.fn(),
}

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    pathname: '/',
    query: {},
    asPath: '/',
  }),
}))

// Mock react-hot-toast
jest.mock('react-hot-toast', () => ({
  toast: jest.fn(),
  success: jest.fn(),
  error: jest.fn(),
}))