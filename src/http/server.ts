/**
 * HTTP REST Bridge Server
 * MCPツールをHTTP APIとして公開
 */

import http from 'http';
import url from 'url';
import { logger } from '../middleware/logger';
import { metrics, NDL_METRICS, SystemMetrics } from '../middleware/metrics';
import { MemoryRateLimiter, MCP_TOOL_RATE_LIMIT, RateLimitError } from '../middleware/rateLimit';
import { handleSearchBooks } from '../mcp/tools/searchBooks';
import { handleSearchByDescription } from '../mcp/tools/searchByDescription';
import { handleSearchBySubject } from '../mcp/tools/searchBySubject';
import { handleSearchByTitle } from '../mcp/tools/searchByTitle';
import { getSearchStats } from '../adapters/searchNDL';

export interface HTTPServerConfig {
  port: number;
  host: string;
  enableCors: boolean;
  enableSwagger: boolean;
}

export class NDLRestServer {
  private server?: http.Server;
  private rateLimiter = new MemoryRateLimiter(MCP_TOOL_RATE_LIMIT);
  private httpLogger = logger.child('http-server');
  private metricsTimer?: NodeJS.Timeout;
  
  constructor(private config: HTTPServerConfig) {}
  
  async start(): Promise<void> {
    this.server = http.createServer(this.handleRequest.bind(this));
    
    // システムメトリクス収集開始
    this.metricsTimer = SystemMetrics.startCollection(30000);
    
    return new Promise((resolve, reject) => {
      this.server!.listen(this.config.port, this.config.host, () => {
        this.httpLogger.info('HTTP server started', {
          port: this.config.port,
          host: this.config.host
        });
        resolve();
      });
      
      this.server!.on('error', reject);
    });
  }
  
  async stop(): Promise<void> {
    if (this.metricsTimer) {
      clearInterval(this.metricsTimer);
    }
    
    if (this.server) {
      return new Promise((resolve) => {
        this.server!.close(() => {
          this.httpLogger.info('HTTP server stopped');
          resolve();
        });
      });
    }
  }
  
  private async handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const startTime = Date.now();
    const requestId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const requestLogger = logger.child(`request:${requestId}`);
    
    // CORS設定
    if (this.config.enableCors) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      
      if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
      }
    }
    
    try {
      const parsedUrl = url.parse(req.url || '', true);
      const pathname = parsedUrl.pathname || '';
      
      requestLogger.info('Request received', {
        method: req.method,
        url: req.url,
        userAgent: req.headers['user-agent']
      });
      
      // レート制限チェック
      const clientIp = req.connection.remoteAddress || 'unknown';
      const rateLimitResult = this.rateLimiter.check(clientIp);
      
      if (!rateLimitResult.allowed) {
        this.sendRateLimitError(res, rateLimitResult.retryAfter!);
        return;
      }
      
      // ルーティング
      if (pathname === '/api/v1/search/books' && req.method === 'POST') {
        await this.handleSearchBooksAPI(req, res, requestLogger);
      } else if (pathname === '/api/v1/search/description' && req.method === 'POST') {
        await this.handleSearchByDescriptionAPI(req, res, requestLogger);
      } else if (pathname === '/api/v1/search/subject' && req.method === 'POST') {
        await this.handleSearchBySubjectAPI(req, res, requestLogger);
      } else if (pathname === '/api/v1/search/title' && req.method === 'POST') {
        await this.handleSearchByTitleAPI(req, res, requestLogger);
      } else if (pathname === '/healthz' && req.method === 'GET') {
        this.handleHealthCheck(res);
      } else if (pathname === '/readyz' && req.method === 'GET') {
        await this.handleReadinessCheck(res);
      } else if (pathname === '/metrics' && req.method === 'GET') {
        this.handleMetrics(res);
      } else if (pathname === '/api/v1/stats' && req.method === 'GET') {
        this.handleStats(res);
      } else if (pathname === '/api/docs' && req.method === 'GET' && this.config.enableSwagger) {
        this.handleSwaggerUI(res);
      } else if (pathname === '/api/openapi.json' && req.method === 'GET') {
        this.handleOpenAPISpec(res);
      } else {
        this.sendNotFound(res);
      }
      
    } catch (error) {
      requestLogger.error('Request failed', {
        url: req.url,
        method: req.method
      }, error as Error);
      
      this.sendServerError(res, error as Error);
    } finally {
      // レスポンス時間の記録
      const duration = Date.now() - startTime;
      metrics.recordHistogram(NDL_METRICS.REQUEST_DURATION, duration, {
        method: req.method!,
        endpoint: url.parse(req.url || '').pathname!,
        status: res.statusCode.toString()
      });
    }
  }
  
  private async parseRequestBody(req: http.IncomingMessage): Promise<any> {
    return new Promise((resolve, reject) => {
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });
      req.on('end', () => {
        try {
          resolve(body ? JSON.parse(body) : {});
        } catch (error) {
          reject(new Error('Invalid JSON body'));
        }
      });
      req.on('error', reject);
    });
  }
  
  // API エンドポイントハンドラー
  
  private async handleSearchBooksAPI(
    req: http.IncomingMessage,
    res: http.ServerResponse,
    requestLogger: any
  ): Promise<void> {
    try {
      const body = await this.parseRequestBody(req);
      const result = await handleSearchBooks(body);
      
      requestLogger.info('Search books completed', {
        resultCount: result.count
      });
      
      this.sendJSON(res, 200, result);
    } catch (error) {
      this.handleAPIError(res, error as Error, requestLogger);
    }
  }
  
  private async handleSearchByDescriptionAPI(
    req: http.IncomingMessage,
    res: http.ServerResponse,
    requestLogger: any
  ): Promise<void> {
    try {
      const body = await this.parseRequestBody(req);
      const result = await handleSearchByDescription(body);
      
      requestLogger.info('Search by description completed', {
        resultCount: result.count
      });
      
      this.sendJSON(res, 200, result);
    } catch (error) {
      this.handleAPIError(res, error as Error, requestLogger);
    }
  }
  
  private async handleSearchBySubjectAPI(
    req: http.IncomingMessage,
    res: http.ServerResponse,
    requestLogger: any
  ): Promise<void> {
    try {
      const body = await this.parseRequestBody(req);
      const result = await handleSearchBySubject(body);
      
      requestLogger.info('Search by subject completed', {
        resultCount: result.count
      });
      
      this.sendJSON(res, 200, result);
    } catch (error) {
      this.handleAPIError(res, error as Error, requestLogger);
    }
  }
  
  private async handleSearchByTitleAPI(
    req: http.IncomingMessage,
    res: http.ServerResponse,
    requestLogger: any
  ): Promise<void> {
    try {
      const body = await this.parseRequestBody(req);
      const result = await handleSearchByTitle(body);
      
      requestLogger.info('Search by title completed', {
        resultCount: result.count
      });
      
      this.sendJSON(res, 200, result);
    } catch (error) {
      this.handleAPIError(res, error as Error, requestLogger);
    }
  }
  
  // ヘルス・メトリクスエンドポイント
  
  private handleHealthCheck(res: http.ServerResponse): void {
    this.sendJSON(res, 200, {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  }
  
  private async handleReadinessCheck(res: http.ServerResponse): Promise<void> {
    try {
      const stats = getSearchStats();
      this.sendJSON(res, 200, {
        status: 'ready',
        timestamp: new Date().toISOString(),
        cache: stats.cache,
        metrics: stats.metrics
      });
    } catch (error) {
      this.sendJSON(res, 503, {
        status: 'not ready',
        error: (error as Error).message
      });
    }
  }
  
  private handleMetrics(res: http.ServerResponse): void {
    const prometheusMetrics = metrics.exportPrometheus();
    res.setHeader('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    res.writeHead(200);
    res.end(prometheusMetrics);
  }
  
  private handleStats(res: http.ServerResponse): void {
    const stats = getSearchStats();
    this.sendJSON(res, 200, {
      timestamp: new Date().toISOString(),
      search: stats,
      metrics: metrics.getStats(),
      process: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage()
      }
    });
  }
  
  // OpenAPI/Swagger関連
  
  private handleOpenAPISpec(res: http.ServerResponse): void {
    const spec = this.generateOpenAPISpec();
    this.sendJSON(res, 200, spec);
  }
  
  private handleSwaggerUI(res: http.ServerResponse): void {
    const html = this.generateSwaggerHTML();
    res.setHeader('Content-Type', 'text/html');
    res.writeHead(200);
    res.end(html);
  }
  
  // ユーティリティメソッド
  
  private sendJSON(res: http.ServerResponse, statusCode: number, data: any): void {
    res.setHeader('Content-Type', 'application/json');
    res.writeHead(statusCode);
    res.end(JSON.stringify(data, null, 2));
  }
  
  private sendRateLimitError(res: http.ServerResponse, retryAfter: number): void {
    res.setHeader('Retry-After', retryAfter.toString());
    this.sendJSON(res, 429, {
      error: 'Rate limit exceeded',
      retryAfter,
      message: `Too many requests. Try again in ${retryAfter} seconds.`
    });
  }
  
  private sendNotFound(res: http.ServerResponse): void {
    this.sendJSON(res, 404, {
      error: 'Not Found',
      message: 'The requested endpoint was not found'
    });
  }
  
  private sendServerError(res: http.ServerResponse, error: Error): void {
    this.sendJSON(res, 500, {
      error: 'Internal Server Error',
      message: error.message
    });
  }
  
  private handleAPIError(
    res: http.ServerResponse,
    error: Error,
    requestLogger: any
  ): void {
    if (error instanceof RateLimitError) {
      this.sendRateLimitError(res, error.retryAfter);
    } else {
      requestLogger.error('API error', {}, error);
      this.sendJSON(res, 400, {
        error: 'Bad Request',
        message: error.message
      });
    }
  }
  
  private generateOpenAPISpec(): any {
    return {
      openapi: '3.0.0',
      info: {
        title: 'NDL MCP REST API',
        version: '1.0.0',
        description: 'REST API bridge for NDL (National Diet Library) MCP tools'
      },
      servers: [
        {
          url: `http://${this.config.host}:${this.config.port}/api/v1`,
          description: 'Local development server'
        }
      ],
      paths: {
        '/search/description': {
          post: {
            summary: 'Search books by content description (PRIMARY TOOL)',
            tags: ['Search'],
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['description'],
                    properties: {
                      description: {
                        type: 'string',
                        description: 'Keywords to search in book descriptions'
                      },
                      titleKeyword: {
                        type: 'string',
                        description: 'Optional title keyword'
                      },
                      maxRecords: {
                        type: 'integer',
                        minimum: 1,
                        maximum: 50,
                        default: 20
                      },
                      output_format: {
                        type: 'string',
                        enum: ['json', 'yaml']
                      }
                    }
                  }
                }
              }
            },
            responses: {
              '200': {
                description: 'Search results',
                content: {
                  'application/json': {
                    schema: { $ref: '#/components/schemas/SearchResult' }
                  }
                }
              }
            }
          }
        }
      },
      components: {
        schemas: {
          SearchResult: {
            type: 'object',
            properties: {
              count: {
                type: 'integer',
                description: 'Number of results found'
              },
              records: {
                type: 'array',
                items: { $ref: '#/components/schemas/BookRecord' }
              },
              query: {
                type: 'string',
                description: 'Executed CQL query'
              },
              formatted_records: {
                type: 'string',
                description: 'Formatted output (when output_format is specified)'
              }
            }
          },
          BookRecord: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              title: { type: 'string' },
              creators: {
                type: 'array',
                items: { type: 'string' }
              },
              date: { type: 'string' },
              language: { type: 'string' },
              source: { type: 'string' }
            }
          }
        }
      }
    };
  }
  
  private generateSwaggerHTML(): string {
    return `<!DOCTYPE html>
<html>
<head>
  <title>NDL MCP API Documentation</title>
  <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@3.52.5/swagger-ui.css" />
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@3.52.5/swagger-ui-bundle.js"></script>
  <script>
    SwaggerUIBundle({
      url: '/api/openapi.json',
      dom_id: '#swagger-ui',
      presets: [
        SwaggerUIBundle.presets.apis,
        SwaggerUIBundle.presets.standalone
      ]
    });
  </script>
</body>
</html>`;
  }
}

// デフォルト設定
export const DEFAULT_HTTP_CONFIG: HTTPServerConfig = {
  port: 3000,
  host: '127.0.0.1',
  enableCors: true,
  enableSwagger: true
};