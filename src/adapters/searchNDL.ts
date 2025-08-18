import { searchNDL as coreSearchNDL } from '../core/ndlConnector';
import { parseNdlXmlToRecords } from '../core/xmlMapper';
import { ValidatedQuery } from '../types/contracts';
import type { ValidatedQuery as NewValidatedQuery, NdlSearchParams, NdlRecord } from '../types/ndl';
import { MemoryRateLimiter, NDL_RATE_LIMIT, RateLimitError } from '../middleware/rateLimit';
import { MemoryCache, NDL_SEARCH_CACHE_CONFIG, CacheKeyBuilder } from '../middleware/cache';
import { logger } from '../middleware/logger';
import { metrics, NDL_METRICS } from '../middleware/metrics';

// 非機能要件のインスタンス
const rateLimiter = new MemoryRateLimiter(NDL_RATE_LIMIT);
const searchCache = new MemoryCache<NdlRecord[]>(NDL_SEARCH_CACHE_CONFIG);
const ndlLogger = logger.child('ndl-search');

// 定期的なクリーンアップ（5分間隔）
setInterval(() => {
  rateLimiter.cleanup();
}, 5 * 60 * 1000);

// オーバーロード: 既存形式と新形式の両方をサポート
export function searchNDL(params: ValidatedQuery): Promise<NdlRecord[]>;
export function searchNDL(params: NewValidatedQuery): Promise<NdlRecord[]>;
export function searchNDL(params: NdlSearchParams): Promise<NdlRecord[]>;
export async function searchNDL(params: ValidatedQuery | NewValidatedQuery | NdlSearchParams): Promise<NdlRecord[]> {
  const norm = normalizeParams(params);
  return await searchWithMiddleware(norm);
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
    includeHoldings: anyP.includeHoldings ?? false, // デフォルトはfalse
  };
}

// 非機能要件統合版の検索関数
async function searchWithMiddleware(params: NdlSearchParams): Promise<NdlRecord[]> {
  const operation = ndlLogger.startOperation('ndl_search', {
    cql: params.cql,
    maxRecords: params.maximumRecords
  });
  
  try {
    // 1. レート制限チェック
    const rateLimitKey = `search:${params.cql.substring(0, 50)}`;
    const rateLimitResult = rateLimiter.check(rateLimitKey);
    
    if (!rateLimitResult.allowed) {
      metrics.incrementCounter(NDL_METRICS.RATE_LIMIT_HITS, 1, {
        operation: 'search'
      });
      
      ndlLogger.warn('Rate limit exceeded', {
        retryAfter: rateLimitResult.retryAfter,
        remaining: rateLimitResult.remaining
      });
      
      throw new RateLimitError(
        `Rate limit exceeded. Try again in ${rateLimitResult.retryAfter} seconds`,
        rateLimitResult.retryAfter!,
        rateLimitResult.resetTime
      );
    }
    
    // 2. キャッシュ確認
    const cacheKey = CacheKeyBuilder.forNDLSearch(params.cql, params.maximumRecords || 20);
    const cached = searchCache.get(cacheKey);
    
    if (cached) {
      metrics.incrementCounter(NDL_METRICS.CACHE_HITS, 1, {
        operation: 'search'
      });
      
      ndlLogger.debug('Cache hit', { cacheKey });
      operation.end('success', { source: 'cache', resultCount: cached.length });
      return cached;
    }
    
    // 3. キャッシュミス - 実際の検索実行
    metrics.incrementCounter(NDL_METRICS.CACHE_MISSES, 1, {
      operation: 'search'
    });
    
    ndlLogger.debug('Cache miss, executing search', { cacheKey });
    const results = await coreSearch(params);
    
    // 4. 結果をキャッシュに保存
    searchCache.set(cacheKey, results);
    
    // 5. メトリクス記録
    metrics.recordHistogram(NDL_METRICS.SEARCH_RESULTS_COUNT, results.length, {
      operation: 'search'
    });
    
    if (results.length === 0) {
      metrics.incrementCounter(NDL_METRICS.SEARCH_ZERO_RESULTS, 1, {
        cql: params.cql.substring(0, 100)
      });
    }
    
    operation.end('success', { source: 'ndl', resultCount: results.length });
    return results;
    
  } catch (error) {
    // エラーメトリクス
    metrics.incrementCounter(NDL_METRICS.NDL_API_ERRORS, 1, {
      error_type: error instanceof Error ? error.constructor.name : 'unknown'
    });
    
    operation.end('error', {
      error: error instanceof Error ? error.message : String(error)
    });
    
    throw error;
  }
}

async function coreSearch(params: NdlSearchParams): Promise<NdlRecord[]> {
  const apiStartTime = Date.now();
  
  // NDL API呼び出しメトリクス
  metrics.incrementCounter(NDL_METRICS.NDL_API_CALLS, 1, {
    cql_type: detectCqlType(params.cql)
  });
  
  try {
    // 既存ロジックを流用
    const legacyQuery: ValidatedQuery = {
      cql: params.cql,
      maximumRecords: params.maximumRecords || 20
    };

    // 既存のNDLConnectorを使用
    const ndlResult = await coreSearchNDL(legacyQuery);
    
    // NDL API応答時間の記録
    const apiDuration = Date.now() - apiStartTime;
    metrics.recordHistogram(NDL_METRICS.NDL_API_DURATION, apiDuration, {
      success: 'true'
    });
    
    // XMLをMCPRecordにパース（includeHoldingsオプション付き）
    const mcpRecords = parseNdlXmlToRecords(ndlResult.rawXml, params.includeHoldings);
    
    // MCPRecord → NdlRecordに変換
    return mcpRecords.map(record => convertToNdlRecord(record));
    
  } catch (error) {
    // NDL API エラー応答時間の記録
    const apiDuration = Date.now() - apiStartTime;
    metrics.recordHistogram(NDL_METRICS.NDL_API_DURATION, apiDuration, {
      success: 'false'
    });
    
    throw error;
  }
}

function convertToNdlRecord(mcpRecord: any): NdlRecord {
  return {
    id: mcpRecord.id,
    title: mcpRecord.title,
    creators: mcpRecord.creators,
    subjects: mcpRecord.subjects,
    date: mcpRecord.pub_date,
    language: extractLanguage(mcpRecord),
    holdings: mcpRecord.holdings,
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

// CQLタイプ検出（メトリクス分類用）
function detectCqlType(cql: string): string {
  if (cql.includes('title=')) return 'title';
  if (cql.includes('subject=')) return 'subject';
  if (cql.includes('creator=')) return 'creator';
  if (cql.includes('description=')) return 'description';
  if (cql.includes('AND')) return 'complex_and';
  if (cql.includes('OR')) return 'complex_or';
  return 'other';
}

// キャッシュとメトリクス統計の取得
export function getSearchStats(): {
  cache: any;
  metrics: any;
  rateLimiter: {
    requestsInWindow: number;
  };
} {
  return {
    cache: searchCache.getStats(),
    metrics: metrics.getStats(),
    rateLimiter: {
      requestsInWindow: 0 // プライベートなので簡略化
    }
  };
}