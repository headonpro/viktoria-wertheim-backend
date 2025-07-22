// Mock für strapi.ts
export const strapi = {
  get: jest.fn(() => Promise.resolve({ data: { data: [], meta: { pagination: { total: 0 } } } })),
  post: jest.fn(() => Promise.resolve({ data: {} })),
  put: jest.fn(() => Promise.resolve({ data: {} })),
  delete: jest.fn(() => Promise.resolve({ data: {} }))
}

export const API_ENDPOINTS = {
  mitglieder: '/mitglieder',
  mannschaften: '/mannschaften',
  spielers: '/spielers',
  spiele: '/spiele',
  trainings: '/trainings',
  kategorien: '/kategorien',
  newsArtikel: '/news-artikels'
}

export const apiRequest = {
  get: jest.fn(() => Promise.resolve({ data: { data: [] } })),
  post: jest.fn(() => Promise.resolve({ data: {} })),
  put: jest.fn(() => Promise.resolve({ data: {} })),
  delete: jest.fn(() => Promise.resolve({ data: {} })),
  customGet: jest.fn(() => Promise.resolve({})),
  customPost: jest.fn(() => Promise.resolve({})),
  customPut: jest.fn(() => Promise.resolve({}))
}