// Jest setup file for NDL MCP Pipeline tests

// Global test configuration
beforeEach(() => {
  // Clear any mocks before each test
  jest.clearAllMocks();
});

afterEach(() => {
  // Clean up after each test
  jest.restoreAllMocks();
});

// Mock console methods in tests to avoid noise
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Set test timeout
jest.setTimeout(10000);

// Export test utilities if needed
export const createMockLLMResponse = (candidates: any[]) => ({
  choices: [{
    message: {
      content: JSON.stringify(candidates)
    }
  }]
});

export const createMockNDLResponse = (xml: string) => ({
  status: 200,
  data: xml,
  headers: { 'content-type': 'application/xml' }
});

export const createMockMCPResponse = (recordCount: number) => ({
  success: true,
  results: Array.from({ length: recordCount }, (_, i) => ({
    id: `ndl:${i}`,
    status: 201,
    message: 'Created'
  }))
});