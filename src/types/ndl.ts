// NDL仕様スキーマ準拠の型定義

export type ValidatedQuery = { 
  cql: string; 
  maximumRecords?: number;
};

export type NdlSearchParams = {
  cql: string;
  maximumRecords?: number | undefined;
  startRecord?: number | undefined;
  recordSchema?: 'dcndl' | 'mods' | 'dc' | string | undefined; // 現状使っている値だけ列挙、他はstring
};

export type NdlRecord = {
  id: string;            // 例: "ndl:XXXX"
  title: string;
  creators?: string[] | undefined;
  date?: string | undefined;
  language?: string | undefined;
  source: 'NDL';
  raw?: unknown;         // パススルー
};

// MCP公開I/O仕様
export type SearchBooksInput = {
  query: string;
  maxRecords?: number;
  preferLanguage?: string;
  publishToMcp?: boolean;
  output_format?: 'json' | 'yaml';
};

export type SruSearchInput = {
  cql: string;
  maximumRecords?: number;
  maxRecords?: number;     // 互換性のため
  startRecord?: number;
  format?: string;
  output_format?: 'json' | 'yaml';
};

export type ToolOutput = {
  count: number;
  records: NdlRecord[];
};