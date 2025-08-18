import { generateQueries } from '../src/core/queryGenerator';
import { NaturalLanguageRequest } from '../src/types/contracts';
import { LLMClient } from '../src/adapters/llm.types';

// Mock LLM Client for testing
const mockLLMClient: jest.Mocked<LLMClient> = {
  generateCqlCandidates: jest.fn()
};

describe('QueryGenerator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rule-based generation (ISBN)', () => {
    test('should extract ISBN and generate direct CQL', async () => {
      const request: NaturalLanguageRequest = {
        text: 'ISBNが9784334779146の本を出して'
      };

      const candidates = await generateQueries(request, { llmClient: mockLLMClient });
      
      expect(candidates).toHaveLength(1);
      expect(candidates[0]).toEqual({
        cql: 'isbn=9784334779146',
        confidence: 0.99,
        explanation: 'Direct ISBN extraction from input',
        generatedBy: 'rules'
      });
      
      // Should not call LLM for ISBN queries
      expect(mockLLMClient.generateCqlCandidates).not.toHaveBeenCalled();
    });

    test('should handle ISBN with hyphens', async () => {
      const request: NaturalLanguageRequest = {
        text: 'ISBN 978-4-334-77914-6 を検索'
      };

      const candidates = await generateQueries(request, { llmClient: mockLLMClient });
      
      expect(candidates).toHaveLength(1);
      expect(candidates[0].cql).toBe('isbn=9784334779146');
      expect(candidates[0].generatedBy).toBe('rules');
    });

    test('should handle multiple ISBN formats', async () => {
      const request: NaturalLanguageRequest = {
        text: 'find book with ISBN: 978-4334779146'
      };

      const candidates = await generateQueries(request, { llmClient: mockLLMClient });
      
      expect(candidates).toHaveLength(1);
      expect(candidates[0].cql).toBe('isbn=9784334779146');
    });
  });

  describe('LLM-based generation', () => {
    test('should generate candidates for complex Japanese query', async () => {
      const request: NaturalLanguageRequest = {
        text: '沖縄の薬草に関する2015年以降の日本語の本が欲しい'
      };

      mockLLMClient.generateCqlCandidates.mockResolvedValue([
        {
          cql: 'subject="沖縄 薬草" AND issued>=2015 AND language="jpn"',
          confidence: 0.92,
          explanation: 'Subject keyword search with date and language filters'
        }
      ]);

      const candidates = await generateQueries(request, { llmClient: mockLLMClient });
      
      expect(candidates).toHaveLength(1);
      expect(candidates[0]).toEqual({
        cql: 'subject="沖縄 薬草" AND issued>=2015 AND language="jpn"',
        confidence: 0.92,
        explanation: 'Subject keyword search with date and language filters',
        generatedBy: 'llm'
      });
      
      expect(mockLLMClient.generateCqlCandidates).toHaveBeenCalledWith(
        '沖縄の薬草に関する2015年以降の日本語の本が欲しい',
        { maxCandidates: 3 }
      );
    });

    test('should handle LLM returning multiple candidates', async () => {
      const request: NaturalLanguageRequest = {
        text: 'renewable energy textbooks'
      };

      mockLLMClient.generateCqlCandidates.mockResolvedValue([
        {
          cql: 'subject="renewable energy" AND title="textbook"',
          confidence: 0.85,
          explanation: 'Subject and title search'
        },
        {
          cql: 'title="renewable energy" AND subject="education"',
          confidence: 0.72,
          explanation: 'Alternative title-based search'
        }
      ]);

      const candidates = await generateQueries(request, { llmClient: mockLLMClient });
      
      expect(candidates).toHaveLength(2);
      expect(candidates[0].generatedBy).toBe('llm');
      expect(candidates[1].generatedBy).toBe('llm');
    });

    test('should handle LLM errors gracefully', async () => {
      const request: NaturalLanguageRequest = {
        text: 'find some books about history'
      };

      mockLLMClient.generateCqlCandidates.mockRejectedValue(new Error('LLM API error'));

      const candidates = await generateQueries(request, { llmClient: mockLLMClient });
      
      // Should return empty array on LLM failure
      expect(candidates).toHaveLength(0);
    });

    test('should add Japanese language when Japanese text detected', async () => {
      const request: NaturalLanguageRequest = {
        text: '最近の小説'
      };

      mockLLMClient.generateCqlCandidates.mockResolvedValue([
        {
          cql: 'subject="小説" AND issued>=2018',
          confidence: 0.80,
          explanation: 'Recent novels search'
        }
      ]);

      const candidates = await generateQueries(request, { llmClient: mockLLMClient });
      
      expect(candidates).toHaveLength(1);
      expect(candidates[0].cql).toContain('language="jpn"');
    });
  });

  describe('Dangerous/broad queries', () => {
    test('should return empty array for overly broad requests', async () => {
      const request: NaturalLanguageRequest = {
        text: '全部の本を見せて'
      };

      mockLLMClient.generateCqlCandidates.mockResolvedValue([
        {
          cql: 'title=*',
          confidence: 0.1,
          explanation: 'Broad search - not recommended'
        }
      ]);

      const candidates = await generateQueries(request, { llmClient: mockLLMClient });
      
      // Should filter out dangerous queries
      expect(candidates).toHaveLength(0);
    });

    test('should filter out wildcard queries from LLM', async () => {
      const request: NaturalLanguageRequest = {
        text: 'show me everything'
      };

      mockLLMClient.generateCqlCandidates.mockResolvedValue([
        {
          cql: 'title=*',
          confidence: 0.5,
          explanation: 'Wildcard search'
        },
        {
          cql: 'subject="general"',
          confidence: 0.7,
          explanation: 'General subject search'
        }
      ]);

      const candidates = await generateQueries(request, { llmClient: mockLLMClient });
      
      // Should only return the safe query
      expect(candidates).toHaveLength(1);
      expect(candidates[0].cql).toBe('subject="general"');
    });
  });

  describe('Rule priorities', () => {
    test('should prioritize rules over LLM when both apply', async () => {
      const request: NaturalLanguageRequest = {
        text: 'ISBN 9784334779146 について教えて'
      };

      mockLLMClient.generateCqlCandidates.mockResolvedValue([
        {
          cql: 'title="9784334779146"',
          confidence: 0.6,
          explanation: 'Title search for the number'
        }
      ]);

      const candidates = await generateQueries(request, { llmClient: mockLLMClient });
      
      // Should use rule-based ISBN extraction, not LLM
      expect(candidates).toHaveLength(1);
      expect(candidates[0].cql).toBe('isbn=9784334779146');
      expect(candidates[0].generatedBy).toBe('rules');
      expect(mockLLMClient.generateCqlCandidates).not.toHaveBeenCalled();
    });
  });
});