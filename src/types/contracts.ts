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
  generatedBy: 'rules'|'llm'|'hybrid'|'advanced-strategy'|'simple-fallback';
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

// 図書館所蔵情報の型定義
export type LibraryHolding = {
  libraryName: string;           // 図書館名
  libraryCode?: string;          // NDL図書館コード
  callNumber?: string;           // 請求記号
  availability?: string;         // 貸出状況
  location?: string;             // 配架場所
  materialType?: string;         // 資料種別
  opacUrl?: string;             // OPACリンク
};

export type MCPRecord = {
  id: string;
  title: string;
  creators: string[];
  pub_date?: string;
  identifiers?: { ISBN?: string; NDLBibID?: string; [k:string]: string | undefined };
  subjects?: string[];
  description?: string;
  thumbnail_url?: string;
  digital_object_url?: string;
  source: { provider: 'NDL'; retrieved_at: string; license?: string };
  holdings?: LibraryHolding[];   // 図書館所蔵情報リスト追加
  // raw_recordとsource.rawフィールドを削除：データ量削減のため
};