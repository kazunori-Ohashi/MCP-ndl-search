/**
 * シンプルなレート制限実装
 * メモリベースの時間ウィンドウ制限
 */

export interface RateLimitConfig {
  windowMs: number;    // 時間ウィンドウ（ミリ秒）
  maxRequests: number; // ウィンドウ内最大リクエスト数
  keyGenerator?: (identifier: string) => string; // キー生成関数
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

/**
 * メモリベースのレート制限器
 */
export class MemoryRateLimiter {
  private requests: Map<string, number[]> = new Map();
  
  constructor(private config: RateLimitConfig) {}
  
  check(identifier: string): RateLimitResult {
    const key = this.config.keyGenerator ? 
      this.config.keyGenerator(identifier) : identifier;
    
    const now = Date.now();
    const windowStart = now - this.config.windowMs;
    
    // 既存のリクエスト履歴を取得
    let requestTimes = this.requests.get(key) || [];
    
    // ウィンドウ外のリクエストを削除
    requestTimes = requestTimes.filter(time => time > windowStart);
    
    // 制限チェック
    if (requestTimes.length >= this.config.maxRequests) {
      const oldestRequest = Math.min(...requestTimes);
      const retryAfter = Math.ceil((oldestRequest + this.config.windowMs - now) / 1000);
      
      return {
        allowed: false,
        remaining: 0,
        resetTime: oldestRequest + this.config.windowMs,
        retryAfter
      };
    }
    
    // リクエストを記録
    requestTimes.push(now);
    this.requests.set(key, requestTimes);
    
    return {
      allowed: true,
      remaining: this.config.maxRequests - requestTimes.length,
      resetTime: now + this.config.windowMs
    };
  }
  
  // メモリクリーンアップ（定期実行推奨）
  cleanup(): void {
    const now = Date.now();
    for (const [key, times] of this.requests.entries()) {
      const validTimes = times.filter(time => time > now - this.config.windowMs);
      if (validTimes.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, validTimes);
      }
    }
  }
}

/**
 * NDL API用のレート制限設定
 */
export const NDL_RATE_LIMIT: RateLimitConfig = {
  windowMs: 60 * 1000,  // 1分
  maxRequests: 30,      // 1分間に30リクエスト
  keyGenerator: (identifier: string) => `ndl:${identifier}`
};

/**
 * MCP Tool用のレート制限設定
 */
export const MCP_TOOL_RATE_LIMIT: RateLimitConfig = {
  windowMs: 60 * 1000,  // 1分
  maxRequests: 100,     // 1分間に100リクエスト
  keyGenerator: (identifier: string) => `mcp:${identifier}`
};

/**
 * レート制限エラー
 */
export class RateLimitError extends Error {
  constructor(
    message: string,
    public retryAfter: number,
    public resetTime: number
  ) {
    super(message);
    this.name = 'RateLimitError';
  }
}

/**
 * レート制限デコレータ
 */
export function withRateLimit(limiter: MemoryRateLimiter) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const identifier = this.getRateLimitKey?.() || 'default';
      const result = limiter.check(identifier);
      
      if (!result.allowed) {
        throw new RateLimitError(
          `Rate limit exceeded. Try again in ${result.retryAfter} seconds`,
          result.retryAfter!,
          result.resetTime
        );
      }
      
      return method.apply(this, args);
    };
  };
}