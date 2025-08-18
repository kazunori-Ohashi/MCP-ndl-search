import { SearchQueryCandidate, ValidatedQuery, ValidationError } from '../types/contracts';

const ALLOWED_FIELDS = new Set(['title', 'creator', 'subject', 'isbn', 'issued', 'language']);
const MAX_CQL_LENGTH = 1024;
const MAX_OR_CONDITIONS = 10;
const DEFAULT_MAX_RECORDS = 20;
const ABSOLUTE_MAX_RECORDS = 200;

export function validateQuery(
  candidate: SearchQueryCandidate, 
  maxRecords: number = DEFAULT_MAX_RECORDS
): ValidatedQuery | ValidationError {
  const { cql } = candidate;

  // Length check
  if (cql.length > MAX_CQL_LENGTH) {
    return {
      code: 'TOO_LONG',
      message: `CQL query is too long. Maximum length: ${MAX_CQL_LENGTH} characters`,
      details: { length: cql.length }
    };
  }

  // Wildcard check
  if (cql.includes('*')) {
    return {
      code: 'WILDCARD_TOO_BROAD',
      message: 'Wildcard "*" is not allowed for security reasons',
      details: { pattern: '*' }
    };
  }

  // Field validation - exact case match (lowercase only)
  const fieldMatches = cql.match(/\b([A-Za-z]+)\s*(?:>=|<=|=|>|<)/g);
  if (fieldMatches) {
    for (const match of fieldMatches) {
      const field = match.replace(/\s*(?:>=|<=|=|>|<).*$/, '');
      if (!ALLOWED_FIELDS.has(field)) {
        return {
          code: 'DISALLOWED_FIELD',
          message: `Field "${field}" is not allowed. Allowed fields: ${Array.from(ALLOWED_FIELDS).join(', ')}`,
          details: { field }
        };
      }
    }
  }

  // OR condition count check
  const orMatches = cql.match(/\bOR\b/gi);
  const orCount = (orMatches?.length || 0) + 1; // +1 because n OR operators means n+1 conditions
  if (orCount > MAX_OR_CONDITIONS) {
    return {
      code: 'POTENTIAL_DDOS',
      message: `Too many OR conditions (${orCount}). Maximum allowed: ${MAX_OR_CONDITIONS}`,
      details: { orCount }
    };
  }

  // Basic syntax validation
  if (!isValidCqlSyntax(cql)) {
    return {
      code: 'INVALID_SYNTAX',
      message: 'CQL syntax is invalid',
      details: { cql }
    };
  }

  // Cap maximum records
  const cappedMaxRecords = Math.min(maxRecords, ABSOLUTE_MAX_RECORDS);

  return {
    cql,
    maximumRecords: cappedMaxRecords
  };
}

function isValidCqlSyntax(cql: string): boolean {
  // Basic CQL syntax validation
  // Check for incomplete assignments
  if (cql.match(/=\s*$/)) {
    return false;
  }

  // Check for invalid characters patterns
  if (cql.match(/\|{3,}/) || cql.match(/[{}[\]]/)) {
    return false;
  }

  // Must contain at least one field=value pattern
  if (!cql.match(/\w+\s*=\s*[^=]+/)) {
    return false;
  }

  return true;
}