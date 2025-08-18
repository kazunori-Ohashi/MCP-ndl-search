import { validateQuery } from '../src/core/queryValidator';
import { SearchQueryCandidate } from '../src/types/contracts';

describe('QueryValidator', () => {
  describe('Valid queries', () => {
    test('should pass ISBN query', () => {
      const candidate: SearchQueryCandidate = {
        cql: 'isbn=9784334779146',
        generatedBy: 'rules'
      };
      
      const result = validateQuery(candidate);
      expect(result).toEqual({
        cql: 'isbn=9784334779146',
        maximumRecords: 20
      });
    });

    test('should pass complex Japanese query', () => {
      const candidate: SearchQueryCandidate = {
        cql: 'subject="沖縄 薬草" AND issued>=2015 AND language="jpn"',
        generatedBy: 'llm'
      };
      
      const result = validateQuery(candidate);
      expect(result).toEqual({
        cql: 'subject="沖縄 薬草" AND issued>=2015 AND language="jpn"',
        maximumRecords: 20
      });
    });

    test('should pass title with quoted value', () => {
      const candidate: SearchQueryCandidate = {
        cql: 'title="Modern Japan"',
        generatedBy: 'rules'
      };
      
      const result = validateQuery(candidate);
      expect(result).toEqual({
        cql: 'title="Modern Japan"',
        maximumRecords: 20
      });
    });

    test('should cap maximumRecords at 200', () => {
      const candidate: SearchQueryCandidate = {
        cql: 'title="test"',
        generatedBy: 'rules'
      };
      
      const result = validateQuery(candidate, 999);
      expect(result).toEqual({
        cql: 'title="test"',
        maximumRecords: 200
      });
    });
  });

  describe('Invalid queries - field restrictions', () => {
    test('should reject disallowed field', () => {
      const candidate: SearchQueryCandidate = {
        cql: 'somefield="x"',
        generatedBy: 'llm'
      };
      
      const result = validateQuery(candidate);
      expect(result).toEqual({
        code: 'DISALLOWED_FIELD',
        message: 'Field "somefield" is not allowed. Allowed fields: title, creator, subject, isbn, issued, language',
        details: { field: 'somefield' }
      });
    });

    test('should reject multiple disallowed fields', () => {
      const candidate: SearchQueryCandidate = {
        cql: 'badfield="x" AND anotherbad="y"',
        generatedBy: 'llm'
      };
      
      const result = validateQuery(candidate);
      expect(result).toEqual({
        code: 'DISALLOWED_FIELD',
        message: 'Field "badfield" is not allowed. Allowed fields: title, creator, subject, isbn, issued, language',
        details: { field: 'badfield' }
      });
    });

    test('should reject uppercase field names', () => {
      const candidate: SearchQueryCandidate = {
        cql: 'TITLE="test"',
        generatedBy: 'llm'
      };
      
      const result = validateQuery(candidate);
      expect(result).toEqual({
        code: 'DISALLOWED_FIELD',
        message: 'Field "TITLE" is not allowed. Allowed fields: title, creator, subject, isbn, issued, language',
        details: { field: 'TITLE' }
      });
    });

    test('should reject mixed case field names', () => {
      const candidate: SearchQueryCandidate = {
        cql: 'Title="test"',
        generatedBy: 'llm'
      };
      
      const result = validateQuery(candidate);
      expect(result).toEqual({
        code: 'DISALLOWED_FIELD',
        message: 'Field "Title" is not allowed. Allowed fields: title, creator, subject, isbn, issued, language',
        details: { field: 'Title' }
      });
    });
  });

  describe('Invalid queries - wildcard restrictions', () => {
    test('should reject wildcard query', () => {
      const candidate: SearchQueryCandidate = {
        cql: 'title=*',
        generatedBy: 'llm'
      };
      
      const result = validateQuery(candidate);
      expect(result).toEqual({
        code: 'WILDCARD_TOO_BROAD',
        message: 'Wildcard "*" is not allowed for security reasons',
        details: { pattern: '*' }
      });
    });

    test('should reject complex wildcard patterns', () => {
      const candidate: SearchQueryCandidate = {
        cql: 'title="test*"',
        generatedBy: 'llm'
      };
      
      const result = validateQuery(candidate);
      expect(result).toEqual({
        code: 'WILDCARD_TOO_BROAD',
        message: 'Wildcard "*" is not allowed for security reasons',
        details: { pattern: '*' }
      });
    });
  });

  describe('Invalid queries - length restrictions', () => {
    test('should reject too long CQL', () => {
      const longCql = 'title="' + 'x'.repeat(1020) + '"';
      const candidate: SearchQueryCandidate = {
        cql: longCql,
        generatedBy: 'llm'
      };
      
      const result = validateQuery(candidate);
      expect(result).toEqual({
        code: 'TOO_LONG',
        message: 'CQL query is too long. Maximum length: 1024 characters',
        details: { length: longCql.length }
      });
    });
  });

  describe('Invalid queries - OR conditions', () => {
    test('should reject too many OR conditions', () => {
      const orConditions = Array.from({ length: 11 }, (_, i) => `title="book${i}"`).join(' OR ');
      const candidate: SearchQueryCandidate = {
        cql: orConditions,
        generatedBy: 'llm'
      };
      
      const result = validateQuery(candidate);
      expect(result).toEqual({
        code: 'POTENTIAL_DDOS',
        message: 'Too many OR conditions (11). Maximum allowed: 10',
        details: { orCount: 11 }
      });
    });
  });

  describe('Invalid queries - syntax', () => {
    test('should reject invalid syntax', () => {
      const candidate: SearchQueryCandidate = {
        cql: '|||invalid|||',
        generatedBy: 'llm'
      };
      
      const result = validateQuery(candidate);
      expect(result).toEqual({
        code: 'INVALID_SYNTAX',
        message: 'CQL syntax is invalid',
        details: { cql: '|||invalid|||' }
      });
    });

    test('should reject incomplete field assignment', () => {
      const candidate: SearchQueryCandidate = {
        cql: 'title=',
        generatedBy: 'llm'
      };
      
      const result = validateQuery(candidate);
      expect(result).toEqual({
        code: 'INVALID_SYNTAX',
        message: 'CQL syntax is invalid',
        details: { cql: 'title=' }
      });
    });
  });
});