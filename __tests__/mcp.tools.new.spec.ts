import { handleSearchBooks, handleSruSearch } from '../src/mcp/tools/index';
import { searchNDL } from '../src/adapters/searchNDL';
import { publishToMCP } from '../src/adapters/publisher.http';

// Mock all dependencies
jest.mock('../src/adapters/searchNDL');
jest.mock('../src/adapters/publisher.http');
jest.mock('../src/core/queryGenerator');
jest.mock('../src/core/queryValidator');

const mockSearchNDL = searchNDL as jest.MockedFunction<typeof searchNDL>;
const mockPublishToMCP = publishToMCP as jest.MockedFunction<typeof publishToMCP>;

// Mock modules
jest.mock('../src/core/queryGenerator', () => ({
  generateQueries: jest.fn()
}));

jest.mock('../src/core/queryValidator', () => ({
  validateQuery: jest.fn()
}));

// Import mocked functions
import { generateQueries } from '../src/core/queryGenerator';
import { validateQuery } from '../src/core/queryValidator';

const mockGenerateQueries = generateQueries as jest.MockedFunction<typeof generateQueries>;
const mockValidateQuery = validateQuery as jest.MockedFunction<typeof validateQuery>;

describe('MCP Tools - New Specification', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    
    // Default mocks
    mockGenerateQueries.mockResolvedValue([{
      cql: 'subject="茶道" AND issued>=2020',
      generatedBy: 'llm'
    }]);
    
    mockValidateQuery.mockReturnValue({
      cql: 'subject="茶道" AND issued>=2020',
      maximumRecords: 20
    });
  });

  describe('handleSruSearch', () => {
    test('returns {count, records} and honors maximumRecords', async () => {
      const mockRecords = [
        {
          id: 'ndl:030474683',
          title: '遠州流茶道の歴史',
          creators: ['茶道研究会'],
          date: '2020',
          language: 'jpn',
          source: 'NDL' as const,
          raw: { original: 'data' }
        },
        {
          id: 'ndl:030474684',
          title: '現代茶道論',
          creators: ['現代茶人'],
          date: '2021',
          language: 'jpn',
          source: 'NDL' as const,
          raw: { original: 'data2' }
        },
        {
          id: 'ndl:030474685',
          title: 'English Tea Study',
          creators: ['Tea Scholar'],
          date: '2022',
          language: 'eng',
          source: 'NDL' as const,
          raw: { original: 'data3' }
        }
      ];

      mockSearchNDL.mockResolvedValue(mockRecords.slice(0, 3));

      const result = await handleSruSearch({ 
        cql: 'title="遠州" AND date="2020"', 
        maximumRecords: 3 
      });

      expect(result.count).toBe(result.records.length);
      expect(result.records).toHaveLength(3);
      expect(result.count).toBe(3);
      expect(result.records[0].id).toBe('ndl:030474683');
      expect(mockSearchNDL).toHaveBeenCalledWith({
        cql: 'title="遠州" AND date="2020"',
        maximumRecords: 3,
        startRecord: 1,
        recordSchema: 'dcndl'
      });
    });

    test('accepts legacy maxRecords via normalization', async () => {
      const mockRecords = [
        {
          id: 'ndl:030474683',
          title: '遠州流茶道の歴史',
          creators: ['茶道研究会'],
          date: '2020',
          language: 'jpn',
          source: 'NDL' as const,
          raw: { original: 'data' }
        },
        {
          id: 'ndl:030474684',
          title: '現代茶道論',
          creators: ['現代茶人'],
          date: '2021',
          language: 'jpn',
          source: 'NDL' as const,
          raw: { original: 'data2' }
        }
      ];

      mockSearchNDL.mockResolvedValue(mockRecords.slice(0, 2));

      // Legacy maxRecords parameter
      const result = await handleSruSearch({ 
        cql: 'title="遠州"', 
        maxRecords: 2 
      } as any);

      expect(result.records).toHaveLength(2);
      expect(result.count).toBe(2);
      expect(mockSearchNDL).toHaveBeenCalledWith({
        cql: 'title="遠州"',
        maximumRecords: 2,
        startRecord: 1,
        recordSchema: 'dcndl'
      });
    });

    test('maximumRecords takes priority over maxRecords', async () => {
      const mockRecords = [{
        id: 'ndl:030474683',
        title: '遠州流茶道の歴史',
        creators: ['茶道研究会'],
        date: '2020',
        language: 'jpn',
        source: 'NDL' as const,
        raw: { original: 'data' }
      }];

      mockSearchNDL.mockResolvedValue(mockRecords);

      const result = await handleSruSearch({ 
        cql: 'title="遠州"', 
        maximumRecords: 1,
        maxRecords: 5  // Should be ignored
      });

      expect(result.count).toBe(1);
      expect(mockSearchNDL).toHaveBeenCalledWith({
        cql: 'title="遠州"',
        maximumRecords: 1, // maximumRecords takes priority
        startRecord: 1,
        recordSchema: 'dcndl'
      });
    });
  });

  describe('handleSearchBooks', () => {
    test('ranks preferLanguage first', async () => {
      const mockRecords = [
        {
          id: 'ndl:030474683',
          title: 'English Tea Study',
          creators: ['Tea Scholar'],
          date: '2020',
          language: 'eng',
          source: 'NDL' as const,
          raw: { original: 'data1' }
        },
        {
          id: 'ndl:030474684',
          title: '月刊茶道誌',
          creators: ['茶道会'],
          date: '2020',
          language: 'jpn',
          source: 'NDL' as const,
          raw: { original: 'data2' }
        },
        {
          id: 'ndl:030474685',
          title: 'Another English Book',
          creators: ['Another Author'],
          date: '2020',
          language: 'eng',
          source: 'NDL' as const,
          raw: { original: 'data3' }
        }
      ];

      mockSearchNDL.mockResolvedValue(mockRecords);
      mockPublishToMCP.mockResolvedValue({
        success: true,
        results: []
      });

      const result = await handleSearchBooks({ 
        query: '月刊茶道誌 2020', 
        preferLanguage: 'jpn',
        publishToMcp: false  // Disable publishing for this test
      });

      expect(result.count).toBe(3);
      expect(result.records[0]?.language).toBe('jpn'); // Japanese should be first
      expect(result.records[0]?.title).toBe('月刊茶道誌');
      expect(result.records[1]?.language).toBe('eng'); // English records follow
      expect(result.records[2]?.language).toBe('eng');
    });

    test('handles preferLanguage with no matching records', async () => {
      const mockRecords = [
        {
          id: 'ndl:030474683',
          title: 'English Tea Study',
          creators: ['Tea Scholar'],
          date: '2020',
          language: 'eng',
          source: 'NDL' as const,
          raw: { original: 'data1' }
        },
        {
          id: 'ndl:030474684',
          title: 'French Tea Book',
          creators: ['French Author'],
          date: '2020',
          language: 'fre',
          source: 'NDL' as const,
          raw: { original: 'data2' }
        }
      ];

      mockSearchNDL.mockResolvedValue(mockRecords);

      const result = await handleSearchBooks({ 
        query: 'tea books', 
        preferLanguage: 'jpn',  // No Japanese records available
        publishToMcp: false
      });

      expect(result.count).toBe(2);
      // Records should be returned in original order since none match preferLanguage
      expect(result.records[0]?.language).toBe('eng');
      expect(result.records[1]?.language).toBe('fre');
    });

    test('supports maxRecords parameter', async () => {
      const mockRecords = Array.from({ length: 5 }, (_, i) => ({
        id: `ndl:${i.toString().padStart(9, '0')}`,
        title: `Book ${i}`,
        creators: [`Author ${i}`],
        date: '2020',
        language: 'jpn',
        source: 'NDL' as const,
        raw: { original: `data${i}` }
      }));

      mockSearchNDL.mockResolvedValue(mockRecords.slice(0, 2));

      const result = await handleSearchBooks({ 
        query: 'test books', 
        maxRecords: 2,
        publishToMcp: false
      });

      expect(result.count).toBe(2);
      expect(result.records).toHaveLength(2);
    });
  });
});