// contracts.ts
export type NaturalLanguageRequest = {
  text: string;
  userId?: string;
  preferLanguage?: 'jpn'|'eng'|string;
  maxRecords?: number;
};

export type SearchQueryCandidate = {
  cql: string;
  confidence?: number; // 0..1
  explanation?: string;
  generatedBy: 'rules'|'llm'|'hybrid';
};

export type ValidationError = {
  code: 'TOO_LONG'|'DISALLOWED_FIELD'|'WILDCARD_TOO_BROAD'|'POTENTIAL_DDOS'|'INVALID_SYNTAX';
  message: string;
  details?: any;
};

export type ValidatedQuery = {
  cql: string;
  maximumRecords: number;
};

export type NdlSearchParams = {
  operation: 'searchRetrieve';
  query: string;
  recordSchema?: string;
  maximumRecords?: number;
};

export type NdlRecord = {
  id?: string;
  title?: string;
  creators?: string[];
  pub_date?: string;
  publicationName?: string;
  pageRange?: string;
  publisher?: string;
  language?: string;
  subjects?: string[];
  rawXml?: string;
};

export type MCPRecord = {
  id: string;
  title: string;
  creators: string[];
  pub_date?: string;
  identifiers?: { ISBN?: string; NDLBibID?: string; [k:string]:string };
  subjects?: string[];
  description?: string;
  thumbnail_url?: string;
  digital_object_url?: string;
  source: { provider: 'NDL'; retrieved_at: string; license?: string; raw?: any };
  raw_record?: string;
};