/**
 * 構造化ログ実装
 * JSON形式でのログ出力とレベル管理
 */

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3
}

export interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  component?: string;
  operation?: string;
  duration?: number;
  metadata?: Record<string, any>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

export interface LoggerConfig {
  level: LogLevel;
  component?: string;
  enableConsole: boolean;
  enableStructured: boolean;
}

/**
 * 構造化ロガー
 */
export class StructuredLogger {
  constructor(private config: LoggerConfig) {}
  
  error(message: string, metadata?: Record<string, any>, error?: Error): void {
    if (this.config.level >= LogLevel.ERROR) {
      this.log(LogLevel.ERROR, message, metadata, error);
    }
  }
  
  warn(message: string, metadata?: Record<string, any>): void {
    if (this.config.level >= LogLevel.WARN) {
      this.log(LogLevel.WARN, message, metadata);
    }
  }
  
  info(message: string, metadata?: Record<string, any>): void {
    if (this.config.level >= LogLevel.INFO) {
      this.log(LogLevel.INFO, message, metadata);
    }
  }
  
  debug(message: string, metadata?: Record<string, any>): void {
    if (this.config.level >= LogLevel.DEBUG) {
      this.log(LogLevel.DEBUG, message, metadata);
    }
  }
  
  // 操作の開始と終了を追跡
  startOperation(operation: string, metadata?: Record<string, any>): OperationTracker {
    const startTime = Date.now();
    this.debug(`operation.start: ${operation}`, { operation, ...metadata });
    
    return {
      end: (result?: 'success' | 'error', endMetadata?: Record<string, any>) => {
        const duration = Date.now() - startTime;
        const level = result === 'error' ? LogLevel.ERROR : LogLevel.INFO;
        const message = `operation.end: ${operation} (${duration}ms)`;
        
        this.log(level, message, {
          operation,
          duration,
          result: result || 'success',
          ...metadata,
          ...endMetadata
        });
      }
    };
  }
  
  private log(level: LogLevel, message: string, metadata?: Record<string, any>, error?: Error): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: LogLevel[level],
      message,
      component: this.config.component,
      metadata
    };
    
    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack
      };
    }
    
    if (this.config.enableStructured) {
      // 構造化JSON出力
      console.log(JSON.stringify(entry));
    }
    
    if (this.config.enableConsole) {
      // 読みやすいコンソール出力
      const prefix = `[${entry.timestamp}] ${entry.level}`;
      const component = entry.component ? ` [${entry.component}]` : '';
      const metaStr = metadata ? ` ${JSON.stringify(metadata)}` : '';
      
      console.error(`${prefix}${component}: ${message}${metaStr}`);
      
      if (error) {
        console.error(error.stack || error.message);
      }
    }
  }
  
  // 子ロガー作成（コンポーネント別）
  child(component: string): StructuredLogger {
    return new StructuredLogger({
      ...this.config,
      component: this.config.component ? 
        `${this.config.component}.${component}` : component
    });
  }
}

export interface OperationTracker {
  end(result?: 'success' | 'error', metadata?: Record<string, any>): void;
}

/**
 * NDL-MCP用のログ設定
 */
export const DEFAULT_LOGGER_CONFIG: LoggerConfig = {
  level: LogLevel.INFO,
  enableConsole: true,
  enableStructured: false // 本番環境では true に設定
};

/**
 * グローバルロガーインスタンス
 */
export const logger = new StructuredLogger({
  ...DEFAULT_LOGGER_CONFIG,
  component: 'ndl-mcp'
});

/**
 * パフォーマンス測定デコレータ
 */
export function withLogging(
  logger: StructuredLogger,
  operation?: string
) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    const operationName = operation || `${target.constructor.name}.${propertyName}`;
    
    descriptor.value = async function (...args: any[]) {
      const tracker = logger.startOperation(operationName, {
        args: args.length
      });
      
      try {
        const result = await method.apply(this, args);
        tracker.end('success', {
          resultType: typeof result,
          resultSize: Array.isArray(result) ? result.length : undefined
        });
        return result;
      } catch (error) {
        logger.error(`${operationName} failed`, {
          args: args.length
        }, error as Error);
        tracker.end('error');
        throw error;
      }
    };
  };
}

/**
 * リクエスト追跡用のユーティリティ
 */
export class RequestTracker {
  private static requestId = 0;
  
  static generateId(): string {
    return `req_${++this.requestId}_${Date.now()}`;
  }
  
  static createLogger(requestId: string): StructuredLogger {
    return logger.child(`request:${requestId}`);
  }
}