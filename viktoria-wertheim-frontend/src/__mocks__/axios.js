// Mock axios for tests
const mockAxios = {
  get: jest.fn(() => Promise.resolve({ data: { data: [], meta: { pagination: { total: 0 } } } })),
  post: jest.fn(() => Promise.resolve({ data: {} })),
  put: jest.fn(() => Promise.resolve({ data: {} })),
  delete: jest.fn(() => Promise.resolve({ data: {} })),
  create: jest.fn(() => mockAxios),
  defaults: {
    headers: {
      common: {}
    }
  }
}

export default mockAxios