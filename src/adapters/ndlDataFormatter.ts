import { NdlRecord } from '../types/ndl.js';
import yaml from 'js-yaml';

// クリーンな書誌データの型定義
export interface CleanBookRecord {
  title: string;
  authors: string[];
  publication_year?: string;
  publisher?: string;
  isbn?: string;
  series_title?: string;
  description?: string;
  subjects: string[];
  ndl_url: string;
}

// フォーマット済み検索結果の型定義
export interface FormattedSearchResult {
  total_results: number;
  books: CleanBookRecord[];
}

// 出力形式の選択肢
export type OutputFormat = 'json' | 'yaml';

/**
 * NDLの複雑な書誌データから必要最小限の情報を抽出する
 */
export function extractCleanBookData(record: NdlRecord): CleanBookRecord {
  const raw = record.raw as any;
  
  // 基本情報は既にNdlRecordで抽出済みなのでそれを使用
  const title = record.title || 'タイトル不明';
  const authors = record.creators || [];
  
  // 日付の処理
  let publication_year: string | undefined;
  if (record.date) {
    if (typeof record.date === 'string') {
      publication_year = record.date.match(/\d{4}/)?.[0];
    } else if (typeof record.date === 'object' && record.date !== null && '_' in record.date) {
      const dateObj = record.date as { _: string };
      if (typeof dateObj._ === 'string') {
        publication_year = dateObj._.match(/\d{4}/)?.[0];
      }
    }
  }
  
  // raw フィールドから追加情報を抽出
  const publisher = typeof raw?.source === 'string' && raw.source !== 'NDL' ? raw.source : undefined;
  const description = raw?.description || undefined;
  
  // NDL URLの構築
  const ndl_url = buildNdlUrl(record.id);
  
  // その他の情報を抽出
  const isbn = undefined; // 必要に応じて raw から抽出
  const series_title = undefined; // 必要に応じて raw から抽出
  const subjects: string[] = record.subjects || [];

  return {
    title,
    authors,
    publication_year,
    publisher,
    isbn,
    series_title,
    description,
    subjects,
    ndl_url
  };
}


/**
 * NDL URLを構築（IDからNDL検索URLを生成）
 */
function buildNdlUrl(recordId: string): string {
  try {
    // NDL IDを使用してNDL検索URLを構築
    if (recordId && recordId.startsWith('ndl:')) {
      const id = recordId.replace('ndl:', '');
      return `https://ndlsearch.ndl.go.jp/books/${id}`;
    }
    return `https://ndlsearch.ndl.go.jp/search?q=${encodeURIComponent(recordId)}`;
  } catch (error) {
    console.warn('NDL URL construction failed:', error);
    return '#';
  }
}

/**
 * 検索結果を指定された形式でフォーマット
 */
export function formatSearchResults(
  records: NdlRecord[], 
  totalCount: number,
  format: OutputFormat = 'json'
): string {
  // 各レコードをクリーンなデータに変換
  const cleanBooks = records.map(extractCleanBookData);
  
  const result: FormattedSearchResult = {
    total_results: totalCount,
    books: cleanBooks
  };
  
  switch (format) {
    case 'yaml':
      return yaml.dump(result, { 
        noRefs: true, 
        indent: 2,
        lineWidth: 120,
        quotingType: '"'
      });
    case 'json':
    default:
      return JSON.stringify(result, null, 2);
  }
}

/**
 * 既存のToolOutput形式にフォーマット済みデータを追加
 */
export function enhanceToolOutput(
  originalOutput: { count: number; records: NdlRecord[] },
  format?: OutputFormat
): { count: number; records: NdlRecord[]; formatted_records?: string } {
  if (!format) {
    return originalOutput;
  }
  
  const formatted = formatSearchResults(originalOutput.records, originalOutput.count, format);
  
  return {
    ...originalOutput,
    formatted_records: formatted
  };
}