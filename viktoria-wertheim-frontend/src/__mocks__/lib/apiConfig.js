// Mock für apiConfig.ts
export const getApiUrl = jest.fn(() => 'http://localhost:1337')

const apiConfig = {
  getApiUrl
}

export default apiConfig