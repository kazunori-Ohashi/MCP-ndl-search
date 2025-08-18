import { handleSearchBooks } from '../src/mcp/tools/index';
import { publishToMCP } from '../src/adapters/publisher.http';
import nock from 'nock';

// Mock only HTTP dependencies and MCP Publisher
jest.mock('../src/adapters/publisher.http');
const mockPublishToMCP = publishToMCP as jest.MockedFunction<typeof publishToMCP>;

describe('E2E MCP Pipeline Tests (Real Path)', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    nock.cleanAll();
  });

  afterEach(() => {
    nock.cleanAll();
  });

  test('natural language query with LLM disabled (fallback)', async () => {
    // Setup: Mock NDL HTTP response with nock
    const mockNdlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<searchRetrieveResponse xmlns="http://www.loc.gov/zing/srw/">
  <version>1.2</version>
  <numberOfRecords>2</numberOfRecords>
  <records>
    <record>
      <recordSchema>dcndl</recordSchema>
      <recordData>
        <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcndl="http://ndl.go.jp/dcndl/terms/">
          <dcndl:BibResource rdf:about="http://id.ndl.go.jp/bib/030474683">
            <dc:title>沖縄薬草の研究 第1巻</dc:title>
            <dc:creator>沖縄薬草研究会</dc:creator>
            <dcterms:issued>2020</dcterms:issued>
            <dc:language>jpn</dc:language>
            <dcndl:subject>薬草;沖縄</dcndl:subject>
          </dcndl:BibResource>
        </rdf:RDF>
      </recordData>
    </record>
    <record>
      <recordSchema>dcndl</recordSchema>
      <recordData>
        <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcndl="http://ndl.go.jp/dcndl/terms/">
          <dcndl:BibResource rdf:about="http://id.ndl.go.jp/bib/030474684">
            <dc:title>沖縄薬草の研究 第2巻</dc:title>
            <dc:creator>沖縄薬草研究会</dc:creator>
            <dcterms:issued>2021</dcterms:issued>
            <dc:language>jpn</dc:language>
            <dcndl:subject>薬草;沖縄</dcndl:subject>
          </dcndl:BibResource>
        </rdf:RDF>
      </recordData>
    </record>
  </records>
</searchRetrieveResponse>`;

    // NDL APIをモック（フォールバックCQLが呼ばれることを想定）
    nock('https://ndlsearch.ndl.go.jp')
      .get('/api/sru')
      .query(true) // Any query parameters
      .reply(200, mockNdlResponse, {
        'Content-Type': 'application/xml'
      });

    // Setup: Mock successful MCP publishing
    const publishSpy = mockPublishToMCP.mockResolvedValue({
      success: true,
      results: [
        { id: 'ndl:030474683', status: 201, message: 'Created' },
        { id: 'ndl:030474684', status: 201, message: 'Created' }
      ]
    });

    // Execute: Natural language query without LLM (should use fallback)
    const result = await handleSearchBooks({ 
      query: '沖縄の薬草について', 
      maxRecords: 3,
      publishToMcp: true
    });

    // Verify: Search results
    expect(result.count).toBe(2);
    expect(result.records).toHaveLength(2);
    expect(result.records[0].id).toMatch(/^ndl:/);
    expect(result.records[0].title).toBe('沖縄薬草の研究 第1巻');
    expect(result.records[0].source).toBe('NDL');

    // Verify: MCP publishing was called
    expect(publishSpy).toHaveBeenCalledTimes(1);
    const publishedRecords = publishSpy.mock.calls[0][0];
    expect(publishedRecords).toHaveLength(2);
    expect(publishedRecords[0].id).toMatch(/^ndl:/);
  });

  test('natural language query generates safe fallback CQL', async () => {
    // Setup: Mock NDL HTTP response
    const mockNdlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<searchRetrieveResponse xmlns="http://www.loc.gov/zing/srw/">
  <version>1.2</version>
  <numberOfRecords>1</numberOfRecords>
  <records>
    <record>
      <recordSchema>dcndl</recordSchema>
      <recordData>
        <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcndl="http://ndl.go.jp/dcndl/terms/">
          <dcndl:BibResource rdf:about="http://id.ndl.go.jp/bib/030474685">
            <dc:title>AIと機械学習の基礎</dc:title>
            <dc:creator>山田太郎</dc:creator>
            <dcterms:issued>2023</dcterms:issued>
            <dc:language>jpn</dc:language>
            <dcndl:subject>AI;機械学習</dcndl:subject>
          </dcndl:BibResource>
        </rdf:RDF>
      </recordData>
    </record>
  </records>
</searchRetrieveResponse>`;

    nock('https://ndlsearch.ndl.go.jp')
      .get('/api/sru')
      .query(query => {
        // フォールバックCQLが生成されていることを確認
        const cql = query.query;
        return typeof cql === 'string' && 
               cql.includes('subject=') && 
               cql.includes('language="jpn"');
      })
      .reply(200, mockNdlResponse, {
        'Content-Type': 'application/xml'
      });

    // Execute: Natural language query (should use fallback CQL)
    const result = await handleSearchBooks({ 
      query: 'AI機械学習', 
      maxRecords: 1,
      publishToMcp: false
    });

    // Verify: Results are returned
    expect(result.count).toBe(1);
    expect(result.records).toHaveLength(1);
    expect(result.records[0].id).toMatch(/^ndl:/);
  });

  test('handles empty query results gracefully', async () => {
    // Setup: Mock empty NDL response
    const emptyNdlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<searchRetrieveResponse xmlns="http://www.loc.gov/zing/srw/">
  <version>1.2</version>
  <numberOfRecords>0</numberOfRecords>
  <records>
  </records>
</searchRetrieveResponse>`;

    nock('https://ndlsearch.ndl.go.jp')
      .get('/api/sru')
      .query(true)
      .reply(200, emptyNdlResponse, {
        'Content-Type': 'application/xml'
      });

    // Execute: Query that returns no results
    const result = await handleSearchBooks({ 
      query: '存在しない本のタイトル', 
      maxRecords: 5,
      publishToMcp: false
    });

    // Verify: Empty results but no error
    expect(result.count).toBe(0);
    expect(result.records).toHaveLength(0);
  });
});