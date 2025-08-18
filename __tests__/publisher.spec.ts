import nock from 'nock';
import { publishToMCP } from '../src/adapters/publisher.http';
import { MCPRecord } from '../src/types/contracts';

// Mock the env module to provide test URLs
jest.mock('../src/utils/env', () => ({
  env: {
    MCP_API_URL: 'http://localhost:8787'
  }
}));

describe('MCPPublisher', () => {
  const mcpBaseUrl = 'http://localhost:8787';
  
  beforeEach(() => {
    nock.cleanAll();
  });

  afterEach(() => {
    if (!nock.isDone()) {
      console.log('Pending mocks:', nock.pendingMocks());
    }
    nock.cleanAll();
  });

  describe('Successful publishing', () => {
    test('should publish single record successfully', async () => {
      const mockRecord: MCPRecord = {
        id: 'ndl:030474683',
        title: 'Test Book',
        creators: ['Test Author'],
        source: {
          provider: 'NDL',
          retrieved_at: '2025-08-17T09:00:00+09:00'
        }
      };

      nock(mcpBaseUrl)
        .post('/api/v1/publish', {
          records: [mockRecord]
        })
        .reply(200, {
          success: true,
          results: [{
            id: 'ndl:030474683',
            status: 201,
            message: 'Created'
          }]
        });

      const result = await publishToMCP([mockRecord]);

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(1);
      expect(result.results[0].id).toBe('ndl:030474683');
      expect(result.results[0].status).toBe(201);
    });

    test('should handle batch of 50 records without splitting', async () => {
      const records: MCPRecord[] = Array.from({ length: 50 }, (_, i) => ({
        id: `ndl:${i.toString().padStart(9, '0')}`,
        title: `Book ${i}`,
        creators: [`Author ${i}`],
        source: {
          provider: 'NDL',
          retrieved_at: '2025-08-17T09:00:00+09:00'
        }
      }));

      nock(mcpBaseUrl)
        .post('/api/v1/publish', { records })
        .reply(200, {
          success: true,
          results: records.map(r => ({ id: r.id, status: 201, message: 'Created' }))
        });

      const result = await publishToMCP(records);

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(50);
    });

    test('should split batch larger than 50 records', async () => {
      const records: MCPRecord[] = Array.from({ length: 75 }, (_, i) => ({
        id: `ndl:${i.toString().padStart(9, '0')}`,
        title: `Book ${i}`,
        creators: [`Author ${i}`],
        source: {
          provider: 'NDL',
          retrieved_at: '2025-08-17T09:00:00+09:00'
        }
      }));

      // First batch (50 records)
      nock(mcpBaseUrl)
        .post('/api/v1/publish', {
          records: records.slice(0, 50)
        })
        .reply(200, {
          success: true,
          results: records.slice(0, 50).map(r => ({ id: r.id, status: 201 }))
        });

      // Second batch (25 records)
      nock(mcpBaseUrl)
        .post('/api/v1/publish', {
          records: records.slice(50, 75)
        })
        .reply(200, {
          success: true,
          results: records.slice(50, 75).map(r => ({ id: r.id, status: 201 }))
        });

      const result = await publishToMCP(records);

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(75);
    });
  });

  describe('Authentication', () => {
    test('should include Bearer token when provided', async () => {
      const mockRecord: MCPRecord = {
        id: 'ndl:030474683',
        title: 'Test Book',
        creators: ['Test Author'],
        source: {
          provider: 'NDL',
          retrieved_at: '2025-08-17T09:00:00+09:00'
        }
      };

      nock(mcpBaseUrl)
        .post('/api/v1/publish')
        .matchHeader('Authorization', 'Bearer test-token')
        .reply(200, {
          success: true,
          results: [{ id: 'ndl:030474683', status: 201 }]
        });

      const result = await publishToMCP([mockRecord], { token: 'test-token' });

      expect(result.success).toBe(true);
    });

    test('should work without token in dev mode', async () => {
      const mockRecord: MCPRecord = {
        id: 'ndl:030474683',
        title: 'Test Book',
        creators: ['Test Author'],
        source: {
          provider: 'NDL',
          retrieved_at: '2025-08-17T09:00:00+09:00'
        }
      };

      nock(mcpBaseUrl)
        .post('/api/v1/publish')
        .reply(200, {
          success: true,
          results: [{ id: 'ndl:030474683', status: 201 }]
        });

      const result = await publishToMCP([mockRecord]); // No token

      expect(result.success).toBe(true);
    });

    test('should handle 401 unauthorized in prod mode', async () => {
      const mockRecord: MCPRecord = {
        id: 'ndl:030474683',
        title: 'Test Book',
        creators: ['Test Author'],
        source: {
          provider: 'NDL',
          retrieved_at: '2025-08-17T09:00:00+09:00'
        }
      };

      nock(mcpBaseUrl)
        .post('/api/v1/publish')
        .reply(401, { error: 'Unauthorized' });

      await expect(publishToMCP([mockRecord], { strictAuth: true }))
        .rejects.toThrow('MCP publish failed with status 401');
    });
  });

  describe('Error handling', () => {
    test('should handle 4xx client errors', async () => {
      const mockRecord: MCPRecord = {
        id: 'ndl:030474683',
        title: 'Test Book',
        creators: ['Test Author'],
        source: {
          provider: 'NDL',
          retrieved_at: '2025-08-17T09:00:00+09:00'
        }
      };

      nock(mcpBaseUrl)
        .post('/api/v1/publish')
        .reply(400, { error: 'Bad Request', details: 'Invalid record format' });

      await expect(publishToMCP([mockRecord]))
        .rejects.toThrow('MCP publish failed with status 400');
    });

    test('should handle 5xx server errors', async () => {
      const mockRecord: MCPRecord = {
        id: 'ndl:030474683',
        title: 'Test Book',
        creators: ['Test Author'],
        source: {
          provider: 'NDL',
          retrieved_at: '2025-08-17T09:00:00+09:00'
        }
      };

      nock(mcpBaseUrl)
        .post('/api/v1/publish')
        .times(3) // Will retry 2 times + initial attempt
        .reply(500, { error: 'Internal Server Error' });

      await expect(publishToMCP([mockRecord]))
        .rejects.toThrow('MCP publish failed after 2 retries');
    });

    test('should handle network errors', async () => {
      const mockRecord: MCPRecord = {
        id: 'ndl:030474683',
        title: 'Test Book',
        creators: ['Test Author'],
        source: {
          provider: 'NDL',
          retrieved_at: '2025-08-17T09:00:00+09:00'
        }
      };

      nock(mcpBaseUrl)
        .post('/api/v1/publish')
        .times(3)
        .replyWithError('Network error');

      await expect(publishToMCP([mockRecord]))
        .rejects.toThrow('MCP publish failed after 2 retries');
    });

    test('should handle partial failures in batch', async () => {
      const records: MCPRecord[] = [
        {
          id: 'ndl:000000001',
          title: 'Good Book',
          creators: ['Author 1'],
          source: { provider: 'NDL', retrieved_at: '2025-08-17T09:00:00+09:00' }
        },
        {
          id: 'ndl:000000002',
          title: 'Bad Book',
          creators: ['Author 2'],
          source: { provider: 'NDL', retrieved_at: '2025-08-17T09:00:00+09:00' }
        }
      ];

      nock(mcpBaseUrl)
        .post('/api/v1/publish')
        .reply(200, {
          success: false,
          results: [
            { id: 'ndl:000000001', status: 201, message: 'Created' },
            { id: 'ndl:000000002', status: 400, message: 'Invalid format' }
          ]
        });

      const result = await publishToMCP(records);

      expect(result.success).toBe(false);
      expect(result.results).toHaveLength(2);
      expect(result.results[0].status).toBe(201);
      expect(result.results[1].status).toBe(400);
    });
  });

  describe('Retry logic', () => {
    test('should retry on 5xx errors with exponential backoff', async () => {
      const mockRecord: MCPRecord = {
        id: 'ndl:030474683',
        title: 'Test Book',
        creators: ['Test Author'],
        source: {
          provider: 'NDL',
          retrieved_at: '2025-08-17T09:00:00+09:00'
        }
      };

      // First attempt fails
      nock(mcpBaseUrl)
        .post('/api/v1/publish')
        .reply(503, { error: 'Service Unavailable' });

      // Second attempt succeeds
      nock(mcpBaseUrl)
        .post('/api/v1/publish')
        .reply(200, {
          success: true,
          results: [{ id: 'ndl:030474683', status: 201 }]
        });

      const result = await publishToMCP([mockRecord]);

      expect(result.success).toBe(true);
    });

    test('should not retry on 4xx errors', async () => {
      const mockRecord: MCPRecord = {
        id: 'ndl:030474683',
        title: 'Test Book',
        creators: ['Test Author'],
        source: {
          provider: 'NDL',
          retrieved_at: '2025-08-17T09:00:00+09:00'
        }
      };

      nock(mcpBaseUrl)
        .post('/api/v1/publish')
        .reply(400, { error: 'Bad Request' });

      await expect(publishToMCP([mockRecord]))
        .rejects.toThrow('MCP publish failed with status 400');
    });
  });
});