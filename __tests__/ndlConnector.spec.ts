import nock from 'nock';
import { searchNDL } from '../src/core/ndlConnector';
import { ValidatedQuery } from '../src/types/contracts';

describe('NDLConnector', () => {
  const ndlBaseUrl = 'https://ndlsearch.ndl.go.jp';
  
  beforeEach(() => {
    nock.cleanAll();
  });

  afterEach(() => {
    expect(nock.isDone()).toBe(true);
  });

  describe('Successful requests', () => {
    test('should return XML data on 200 OK', async () => {
      const mockXml = `<?xml version="1.0" encoding="UTF-8"?>
<searchRetrieveResponse>
  <numberOfRecords>1</numberOfRecords>
  <records>
    <record>
      <recordData>
        <rdf:RDF xmlns:dcterms="http://purl.org/dc/terms/">
          <dcndl:BibResource>
            <dcterms:title>Test Book</dcterms:title>
          </dcndl:BibResource>
        </rdf:RDF>
      </recordData>
    </record>
  </records>
</searchRetrieveResponse>`;

      nock(ndlBaseUrl)
        .get('/api/sru')
        .query({
          operation: 'searchRetrieve',
          query: 'isbn=9784334779146',
          recordSchema: 'dcndl',
          maximumRecords: 20
        })
        .reply(200, mockXml, { 'Content-Type': 'application/xml' });

      const validatedQuery: ValidatedQuery = {
        cql: 'isbn=9784334779146',
        maximumRecords: 20
      };

      const result = await searchNDL(validatedQuery);

      expect(result.rawXml).toBe(mockXml);
      expect(result.httpStatus).toBe(200);
      expect(result.headers['content-type']).toBe('application/xml');
    });

    test('should handle large response properly', async () => {
      const largeXml = `<?xml version="1.0" encoding="UTF-8"?>
<searchRetrieveResponse>
  <numberOfRecords>100</numberOfRecords>
  <records>${'<record><recordData>test</recordData></record>'.repeat(100)}</records>
</searchRetrieveResponse>`;

      nock(ndlBaseUrl)
        .get('/api/sru')
        .query({
          operation: 'searchRetrieve',
          query: 'subject="test"',
          recordSchema: 'dcndl',
          maximumRecords: 100
        })
        .reply(200, largeXml);

      const validatedQuery: ValidatedQuery = {
        cql: 'subject="test"',
        maximumRecords: 100
      };

      const result = await searchNDL(validatedQuery);

      expect(result.rawXml).toBe(largeXml);
      expect(result.httpStatus).toBe(200);
    });
  });

  describe('Error handling', () => {
    test('should handle 404 not found', async () => {
      nock(ndlBaseUrl)
        .get('/api/sru')
        .query(true)
        .reply(404, 'Not Found');

      const validatedQuery: ValidatedQuery = {
        cql: 'isbn=9999999999999',
        maximumRecords: 20
      };

      await expect(searchNDL(validatedQuery)).rejects.toThrow('NDL SRU request failed with status 404');
    });

    test('should handle 400 bad request', async () => {
      nock(ndlBaseUrl)
        .get('/api/sru')
        .query(true)
        .reply(400, 'Bad Request - Invalid CQL');

      const validatedQuery: ValidatedQuery = {
        cql: 'invalid=syntax',
        maximumRecords: 20
      };

      await expect(searchNDL(validatedQuery)).rejects.toThrow('NDL SRU request failed with status 400');
    });
  });

  describe('Retry logic for 5xx errors', () => {
    test('should retry 3 times on 500 error with exponential backoff', async () => {
      // Mock all 3 retry attempts to fail with 500
      nock(ndlBaseUrl)
        .get('/api/sru')
        .query(true)
        .reply(500, 'Internal Server Error')
        .get('/api/sru')
        .query(true)
        .reply(500, 'Internal Server Error')
        .get('/api/sru')
        .query(true)
        .reply(500, 'Internal Server Error');

      const validatedQuery: ValidatedQuery = {
        cql: 'title="test"',
        maximumRecords: 20
      };

      const startTime = Date.now();
      
      await expect(searchNDL(validatedQuery)).rejects.toThrow('NDL SRU request failed after 3 retries');
      
      const duration = Date.now() - startTime;
      // Should take at least 200 + 600 = 800ms for backoff delays
      expect(duration).toBeGreaterThan(700);
    });

    test('should succeed on second attempt after 5xx error', async () => {
      const mockXml = '<?xml version="1.0"?><response>success</response>';

      nock(ndlBaseUrl)
        .get('/api/sru')
        .query(true)
        .reply(503, 'Service Unavailable')
        .get('/api/sru')
        .query(true)
        .reply(200, mockXml);

      const validatedQuery: ValidatedQuery = {
        cql: 'title="test"',
        maximumRecords: 20
      };

      const result = await searchNDL(validatedQuery);

      expect(result.rawXml).toBe(mockXml);
      expect(result.httpStatus).toBe(200);
    });

    test('should not retry on 4xx errors', async () => {
      nock(ndlBaseUrl)
        .get('/api/sru')
        .query(true)
        .reply(400, 'Bad Request');

      const validatedQuery: ValidatedQuery = {
        cql: 'title="test"',
        maximumRecords: 20
      };

      await expect(searchNDL(validatedQuery)).rejects.toThrow('NDL SRU request failed with status 400');
      
      // Should only make one request (no retries for 4xx)
      expect(nock.isDone()).toBe(true);
    });
  });

  describe('Timeout handling', () => {
    test('should timeout after configured duration', async () => {
      nock(ndlBaseUrl)
        .get('/api/sru')
        .query(true)
        .delay(16000) // Delay longer than default timeout (15s)
        .reply(200, 'Too slow');

      const validatedQuery: ValidatedQuery = {
        cql: 'title="test"',
        maximumRecords: 20
      };

      await expect(searchNDL(validatedQuery)).rejects.toThrow(/timeout/i);
    }, 20000); // Increase test timeout

    test('should complete within timeout', async () => {
      const mockXml = '<?xml version="1.0"?><response>fast</response>';

      nock(ndlBaseUrl)
        .get('/api/sru')
        .query(true)
        .delay(100) // Fast response
        .reply(200, mockXml);

      const validatedQuery: ValidatedQuery = {
        cql: 'title="test"',
        maximumRecords: 20
      };

      const result = await searchNDL(validatedQuery);

      expect(result.rawXml).toBe(mockXml);
      expect(result.httpStatus).toBe(200);
    });
  });

  describe('Query parameter encoding', () => {
    test('should properly encode CQL with special characters', async () => {
      const mockXml = '<?xml version="1.0"?><response>encoded</response>';

      nock(ndlBaseUrl)
        .get('/api/sru')
        .query({
          operation: 'searchRetrieve',
          query: 'title="テスト & 実験"',
          recordSchema: 'dcndl',
          maximumRecords: 20
        })
        .reply(200, mockXml);

      const validatedQuery: ValidatedQuery = {
        cql: 'title="テスト & 実験"',
        maximumRecords: 20
      };

      const result = await searchNDL(validatedQuery);

      expect(result.rawXml).toBe(mockXml);
    });

    test('should handle query with spaces and quotes', async () => {
      const mockXml = '<?xml version="1.0"?><response>quoted</response>';

      nock(ndlBaseUrl)
        .get('/api/sru')
        .query({
          operation: 'searchRetrieve',
          query: 'subject="renewable energy" AND issued>=2018',
          recordSchema: 'dcndl',
          maximumRecords: 50
        })
        .reply(200, mockXml);

      const validatedQuery: ValidatedQuery = {
        cql: 'subject="renewable energy" AND issued>=2018',
        maximumRecords: 50
      };

      const result = await searchNDL(validatedQuery);

      expect(result.rawXml).toBe(mockXml);
    });
  });
});