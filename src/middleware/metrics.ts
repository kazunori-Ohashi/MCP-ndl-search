/**
 * メトリクス収集と監視
 * OpenTelemetry互換の基本メトリクス実装
 */

export interface MetricPoint {
  timestamp: number;
  value: number;
  labels?: Record<string, string>;
}

export interface CounterMetric {
  name: string;
  description: string;
  unit: string;
  points: MetricPoint[];
}

export interface HistogramBucket {
  upperBound: number;
  count: number;
}

export interface HistogramMetric {
  name: string;
  description: string;
  unit: string;
  buckets: HistogramBucket[];
  sum: number;
  count: number;
}

export interface GaugeMetric {
  name: string;
  description: string;
  unit: string;
  value: number;
  timestamp: number;
  labels?: Record<string, string>;
}

/**
 * シンプルなメトリクス収集器
 */
export class MetricsCollector {
  private counters: Map<string, CounterMetric> = new Map();
  private histograms: Map<string, HistogramMetric> = new Map();
  private gauges: Map<string, GaugeMetric> = new Map();
  
  // カウンター操作
  incrementCounter(name: string, value: number = 1, labels?: Record<string, string>): void {
    let counter = this.counters.get(name);
    if (!counter) {
      counter = {
        name,
        description: `Counter: ${name}`,
        unit: 'count',
        points: []
      };
      this.counters.set(name, counter);
    }
    
    counter.points.push({
      timestamp: Date.now(),
      value,
      labels
    });
  }
  
  // ヒストグラム操作（レスポンス時間等の分布測定）
  recordHistogram(name: string, value: number, labels?: Record<string, string>): void {
    let histogram = this.histograms.get(name);
    if (!histogram) {
      // デフォルトバケット（ミリ秒想定）
      const buckets: HistogramBucket[] = [
        { upperBound: 10, count: 0 },
        { upperBound: 25, count: 0 },
        { upperBound: 50, count: 0 },
        { upperBound: 100, count: 0 },
        { upperBound: 250, count: 0 },
        { upperBound: 500, count: 0 },
        { upperBound: 1000, count: 0 },
        { upperBound: 2500, count: 0 },
        { upperBound: 5000, count: 0 },
        { upperBound: 10000, count: 0 },
        { upperBound: Infinity, count: 0 }
      ];
      
      histogram = {
        name,
        description: `Histogram: ${name}`,
        unit: 'ms',
        buckets,
        sum: 0,
        count: 0
      };
      this.histograms.set(name, histogram);
    }
    
    // バケットに分類
    for (const bucket of histogram.buckets) {
      if (value <= bucket.upperBound) {
        bucket.count++;
      }
    }
    
    histogram.sum += value;
    histogram.count++;
  }
  
  // ゲージ操作（現在の値を記録）
  setGauge(name: string, value: number, labels?: Record<string, string>): void {
    this.gauges.set(name, {
      name,
      description: `Gauge: ${name}`,
      unit: 'value',
      value,
      timestamp: Date.now(),
      labels
    });
  }
  
  // メトリクス取得
  getMetrics(): {
    counters: CounterMetric[];
    histograms: HistogramMetric[];
    gauges: GaugeMetric[];
  } {
    return {
      counters: Array.from(this.counters.values()),
      histograms: Array.from(this.histograms.values()),
      gauges: Array.from(this.gauges.values())
    };
  }
  
  // Prometheus形式でエクスポート
  exportPrometheus(): string {
    const lines: string[] = [];
    
    // カウンター
    for (const counter of this.counters.values()) {
      const total = counter.points.reduce((sum, point) => sum + point.value, 0);
      lines.push(`# HELP ${counter.name} ${counter.description}`);
      lines.push(`# TYPE ${counter.name} counter`);
      lines.push(`${counter.name}_total ${total}`);
    }
    
    // ヒストグラム
    for (const histogram of this.histograms.values()) {
      lines.push(`# HELP ${histogram.name} ${histogram.description}`);
      lines.push(`# TYPE ${histogram.name} histogram`);
      
      for (const bucket of histogram.buckets) {
        const le = bucket.upperBound === Infinity ? '+Inf' : bucket.upperBound.toString();
        lines.push(`${histogram.name}_bucket{le="${le}"} ${bucket.count}`);
      }
      
      lines.push(`${histogram.name}_sum ${histogram.sum}`);
      lines.push(`${histogram.name}_count ${histogram.count}`);
    }
    
    // ゲージ
    for (const gauge of this.gauges.values()) {
      lines.push(`# HELP ${gauge.name} ${gauge.description}`);
      lines.push(`# TYPE ${gauge.name} gauge`);
      lines.push(`${gauge.name} ${gauge.value}`);
    }
    
    return lines.join('\n');
  }
  
  // 統計情報
  getStats(): {
    countersCount: number;
    histogramsCount: number;
    gaugesCount: number;
    totalDataPoints: number;
  } {
    const totalPoints = Array.from(this.counters.values())
      .reduce((sum, counter) => sum + counter.points.length, 0);
    
    return {
      countersCount: this.counters.size,
      histogramsCount: this.histograms.size,
      gaugesCount: this.gauges.size,
      totalDataPoints: totalPoints
    };
  }
  
  reset(): void {
    this.counters.clear();
    this.histograms.clear();
    this.gauges.clear();
  }
}

/**
 * グローバルメトリクス収集器
 */
export const metrics = new MetricsCollector();

/**
 * NDL-MCP固有のメトリクス定義
 */
export const NDL_METRICS = {
  // リクエスト関連
  REQUESTS_TOTAL: 'ndl_requests_total',
  REQUEST_DURATION: 'ndl_request_duration_ms',
  REQUEST_ERRORS: 'ndl_request_errors_total',
  
  // NDL API関連
  NDL_API_CALLS: 'ndl_api_calls_total',
  NDL_API_DURATION: 'ndl_api_duration_ms',
  NDL_API_ERRORS: 'ndl_api_errors_total',
  
  // キャッシュ関連
  CACHE_HITS: 'ndl_cache_hits_total',
  CACHE_MISSES: 'ndl_cache_misses_total',
  CACHE_SIZE: 'ndl_cache_size',
  
  // レート制限関連
  RATE_LIMIT_HITS: 'ndl_rate_limit_hits_total',
  
  // 検索品質関連
  SEARCH_RESULTS_COUNT: 'ndl_search_results_count',
  SEARCH_ZERO_RESULTS: 'ndl_search_zero_results_total',
  
  // LLM関連
  LLM_CALLS: 'ndl_llm_calls_total',
  LLM_DURATION: 'ndl_llm_duration_ms',
  LLM_TOKENS: 'ndl_llm_tokens_total'
} as const;

/**
 * メトリクス記録デコレータ
 */
export function withMetrics(
  operationName: string,
  additionalLabels?: Record<string, string>
) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const startTime = Date.now();
      const labels = {
        operation: operationName,
        method: propertyName,
        ...additionalLabels
      };
      
      // リクエストカウント
      metrics.incrementCounter(NDL_METRICS.REQUESTS_TOTAL, 1, labels);
      
      try {
        const result = await method.apply(this, args);
        
        // 成功時のメトリクス
        const duration = Date.now() - startTime;
        metrics.recordHistogram(NDL_METRICS.REQUEST_DURATION, duration, labels);
        
        // 結果サイズの記録
        if (Array.isArray(result)) {
          metrics.recordHistogram(NDL_METRICS.SEARCH_RESULTS_COUNT, result.length, labels);
          if (result.length === 0) {
            metrics.incrementCounter(NDL_METRICS.SEARCH_ZERO_RESULTS, 1, labels);
          }
        }
        
        return result;
      } catch (error) {
        // エラー時のメトリクス
        const errorLabels = {
          ...labels,
          error_type: error instanceof Error ? error.constructor.name : 'unknown'
        };
        metrics.incrementCounter(NDL_METRICS.REQUEST_ERRORS, 1, errorLabels);
        
        throw error;
      }
    };
  };
}

/**
 * システムメトリクス収集
 */
export class SystemMetrics {
  static collectNodeMetrics(): void {
    const memUsage = process.memoryUsage();
    
    metrics.setGauge('nodejs_memory_heap_used_bytes', memUsage.heapUsed);
    metrics.setGauge('nodejs_memory_heap_total_bytes', memUsage.heapTotal);
    metrics.setGauge('nodejs_memory_external_bytes', memUsage.external);
    metrics.setGauge('nodejs_memory_rss_bytes', memUsage.rss);
    
    const uptime = process.uptime();
    metrics.setGauge('nodejs_process_uptime_seconds', uptime);
  }
  
  static startCollection(intervalMs: number = 30000): NodeJS.Timeout {
    return setInterval(() => {
      this.collectNodeMetrics();
    }, intervalMs);
  }
}