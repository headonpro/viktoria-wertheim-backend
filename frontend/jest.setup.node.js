// Jest setup for Node.js environment (service tests)

// Mock performance methods for performance tests
if (!global.performance.mark) {
  global.performance.mark = jest.fn()
}

if (!global.performance.measure) {
  global.performance.measure = jest.fn()
}

if (!global.performance.clearMarks) {
  global.performance.clearMarks = jest.fn()
}

if (!global.performance.clearMeasures) {
  global.performance.clearMeasures = jest.fn()
}

// Mock console methods to reduce noise in tests
const originalError = console.error
const originalWarn = console.warn

beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOM.render is deprecated') ||
       args[0].includes('Warning: componentWillReceiveProps') ||
       args[0].includes('act(...)'))
    ) {
      return
    }
    originalError.call(console, ...args)
  }

  console.warn = (...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('componentWillReceiveProps') ||
       args[0].includes('deprecated'))
    ) {
      return
    }
    originalWarn.call(console, ...args)
  }
})

afterAll(() => {
  console.error = originalError
  console.warn = originalWarn
})

// Global test timeout
jest.setTimeout(30000)