import { searchNDL as coreSearchNDL } from '../core/ndlConnector';
import { parseNdlXmlToRecords } from '../core/xmlMapper';
import { ValidatedQuery } from '../types/contracts';
import type { ValidatedQuery as NewValidatedQuery, NdlSearchParams, NdlRecord } from '../types/ndl';

// オーバーロード: 既存形式と新形式の両方をサポート
export function searchNDL(params: ValidatedQuery): Promise<NdlRecord[]>;
export function searchNDL(params: NewValidatedQuery): Promise<NdlRecord[]>;
export function searchNDL(params: NdlSearchParams): Promise<NdlRecord[]>;
export async function searchNDL(params: ValidatedQuery | NewValidatedQuery | NdlSearchParams): Promise<NdlRecord[]> {
  const norm = normalizeParams(params);
  return await coreSearch(norm);
}

function normalizeParams(p: ValidatedQuery | NewValidatedQuery | NdlSearchParams): NdlSearchParams {
  const anyP: any = p as any;
  
  // maximumRecords/maxRecords統合
  const maximumRecords =
    typeof anyP.maximumRecords === 'number'
      ? anyP.maximumRecords
      : typeof anyP.maxRecords === 'number'
      ? anyP.maxRecords
      : 20; // デフォルト

  return {
    cql: anyP.cql,
    maximumRecords,
    startRecord: anyP.startRecord ?? 1,
    recordSchema: anyP.recordSchema ?? anyP.format ?? 'dcndl',
  };
}

async function coreSearch(params: NdlSearchParams): Promise<NdlRecord[]> {
  // 既存ロジックを流用
  const legacyQuery: ValidatedQuery = {
    cql: params.cql,
    maximumRecords: params.maximumRecords || 20
  };

  // 既存のNDLConnectorを使用
  const ndlResult = await coreSearchNDL(legacyQuery);
  
  // XMLをMCPRecordにパース
  const mcpRecords = parseNdlXmlToRecords(ndlResult.rawXml);
  
  // MCPRecord → NdlRecordに変換
  return mcpRecords.map(record => convertToNdlRecord(record));
}

function convertToNdlRecord(mcpRecord: any): NdlRecord {
  return {
    id: mcpRecord.id,
    title: mcpRecord.title,
    creators: mcpRecord.creators,
    date: mcpRecord.pub_date,
    language: extractLanguage(mcpRecord),
    source: 'NDL' as const,
    raw: mcpRecord
  };
}

function extractLanguage(mcpRecord: any): string | undefined {
  // MCPRecordから言語情報を抽出
  // 複数の可能性を考慮
  if (mcpRecord.identifiers?.language) return mcpRecord.identifiers.language;
  if (mcpRecord.raw_record && typeof mcpRecord.raw_record === 'string') {
    // XMLから言語情報を簡易抽出
    const langMatch = mcpRecord.raw_record.match(/<dc:language[^>]*>(.*?)<\/dc:language>/i);
    if (langMatch) return langMatch[1];
  }
  return undefined;
}