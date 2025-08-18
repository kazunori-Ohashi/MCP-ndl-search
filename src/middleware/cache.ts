/**
 * シンプルなインメモリキャッシュ実装
 * TTL（生存時間）とLRU（最近最少使用）による管理
 */

export interface CacheEntry<T> {
  value: T;
  createdAt: number;
  lastAccessed: number;
  ttl: number;
}

export interface CacheConfig {
  maxSize: number;     // 最大エントリ数
  defaultTtl: number;  // デフォルトTTL（ミリ秒）
  cleanupInterval: number; // クリーンアップ間隔（ミリ秒）
}

/**
 * メモリベースのLRU + TTLキャッシュ
 */
export class MemoryCache<T> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private cleanupTimer?: NodeJS.Timeout;
  
  constructor(private config: CacheConfig) {
    // 定期的なクリーンアップを開始
    this.startCleanup();
  }
  
  set(key: string, value: T, ttl?: number): void {
    const now = Date.now();
    const entryTtl = ttl || this.config.defaultTtl;
    
    // サイズ制限チェック
    if (this.cache.size >= this.config.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }
    
    this.cache.set(key, {
      value,
      createdAt: now,
      lastAccessed: now,
      ttl: entryTtl
    });
  }
  
  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) {
      return undefined;
    }
    
    const now = Date.now();
    
    // TTL期限チェック
    if (now - entry.createdAt > entry.ttl) {
      this.cache.delete(key);
      return undefined;
    }
    
    // アクセス時間更新
    entry.lastAccessed = now;
    return entry.value;
  }
  
  has(key: string): boolean {
    return this.get(key) !== undefined;
  }
  
  delete(key: string): boolean {
    return this.cache.delete(key);
  }
  
  clear(): void {
    this.cache.clear();
  }
  
  size(): number {
    return this.cache.size;
  }
  
  // LRU（最近最少使用）アルゴリズムで古いエントリを削除
  private evictLRU(): void {
    let oldestKey: string | undefined;
    let oldestTime = Date.now();
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }
  
  // 期限切れエントリのクリーンアップ
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.createdAt > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }
  
  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }
  
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.clear();
  }
  
  // キャッシュ統計情報
  getStats(): {
    size: number;
    maxSize: number;
    hitRate?: number;
    memoryUsage?: number;
  } {
    return {
      size: this.cache.size,
      maxSize: this.config.maxSize
    };
  }
}

/**
 * キャッシュキー生成ヘルパー
 */
export class CacheKeyBuilder {
  static forNDLSearch(cql: string, maxRecords: number): string {
    return `ndl:search:${Buffer.from(cql).toString('base64')}:${maxRecords}`;
  }
  
  static forMCPTool(toolName: string, args: any): string {
    const argsHash = Buffer.from(JSON.stringify(args)).toString('base64');
    return `mcp:tool:${toolName}:${argsHash}`;
  }
  
  static forLLMGeneration(query: string, model: string): string {
    const queryHash = Buffer.from(query).toString('base64');
    return `llm:${model}:${queryHash}`;
  }
}

/**
 * NDL検索結果用キャッシュ設定
 */
export const NDL_SEARCH_CACHE_CONFIG: CacheConfig = {
  maxSize: 1000,                    // 1000件のクエリ結果
  defaultTtl: 30 * 60 * 1000,      // 30分間キャッシュ
  cleanupInterval: 5 * 60 * 1000    // 5分間隔でクリーンアップ
};

/**
 * LLM生成結果用キャッシュ設定
 */
export const LLM_CACHE_CONFIG: CacheConfig = {
  maxSize: 500,                     // 500件のクエリ生成結果
  defaultTtl: 60 * 60 * 1000,      // 1時間キャッシュ
  cleanupInterval: 10 * 60 * 1000   // 10分間隔でクリーンアップ
};

/**
 * キャッシュデコレータ
 */
export function withCache<T>(
  cache: MemoryCache<T>,
  keyGenerator: (...args: any[]) => string,
  ttl?: number
) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const cacheKey = keyGenerator(...args);
      
      // キャッシュヒット確認
      const cached = cache.get(cacheKey);
      if (cached !== undefined) {
        console.error(`cache.hit: ${cacheKey}`);
        return cached;
      }
      
      // キャッシュミス時の実行
      console.error(`cache.miss: ${cacheKey}`);
      const result = await method.apply(this, args);
      
      // 結果をキャッシュ
      cache.set(cacheKey, result, ttl);
      
      return result;
    };
  };
}