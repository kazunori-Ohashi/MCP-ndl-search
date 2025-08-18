#!/usr/bin/env node

/**
 * NDL MCP HTTP Bridge CLI
 * MCPツールをHTTP APIサーバーとして起動
 */

import { NDLRestServer, DEFAULT_HTTP_CONFIG } from '../http/server';
import { logger } from '../middleware/logger';
import { env } from '../utils/env';

interface CLIArgs {
  port?: number;
  host?: string;
  enableCors?: boolean;
  enableSwagger?: boolean;
  help?: boolean;
}

function parseArgs(): CLIArgs {
  const args: CLIArgs = {};
  
  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];
    const nextArg = process.argv[i + 1];
    
    switch (arg) {
      case '--port':
      case '-p':
        if (nextArg && !nextArg.startsWith('-')) {
          args.port = parseInt(nextArg, 10);
          i++;
        }
        break;
      case '--host':
      case '-h':
        if (nextArg && !nextArg.startsWith('-')) {
          args.host = nextArg;
          i++;
        }
        break;
      case '--no-cors':
        args.enableCors = false;
        break;
      case '--no-swagger':
        args.enableSwagger = false;
        break;
      case '--help':
        args.help = true;
        break;
    }
  }
  
  return args;
}

function showHelp(): void {
  console.log(`
NDL MCP HTTP Bridge

Usage: node src/cli/http.ts [options]

Options:
  -p, --port <number>     Port to listen on (default: 3000)
  -h, --host <string>     Host to bind to (default: 127.0.0.1)
  --no-cors              Disable CORS headers
  --no-swagger           Disable Swagger UI
  --help                 Show this help message

Environment Variables:
  HTTP_PORT              Port to listen on
  HTTP_HOST              Host to bind to
  ENABLE_CORS            Enable CORS (true/false)
  ENABLE_SWAGGER         Enable Swagger UI (true/false)

Endpoints:
  POST /api/v1/search/books         - Advanced AI-powered search
  POST /api/v1/search/description   - Search by content description
  POST /api/v1/search/subject      - Search by academic subject
  POST /api/v1/search/title        - Search by title keywords
  GET  /healthz                    - Health check
  GET  /readyz                     - Readiness check
  GET  /metrics                    - Prometheus metrics
  GET  /api/v1/stats               - Internal statistics
  GET  /api/docs                   - Swagger UI documentation
  GET  /api/openapi.json           - OpenAPI specification

Examples:
  # Start server on default port
  node src/cli/http.ts
  
  # Start on custom port and host
  node src/cli/http.ts --port 8080 --host 0.0.0.0
  
  # Start without CORS and Swagger
  node src/cli/http.ts --no-cors --no-swagger
  
  # Test with curl
  curl -X POST http://localhost:3000/api/v1/search/description \\
    -H "Content-Type: application/json" \\
    -d '{"description": "伝記", "maxRecords": 5}'
`);
}

async function main(): Promise<void> {
  const args = parseArgs();
  
  if (args.help) {
    showHelp();
    process.exit(0);
  }
  
  // 設定の組み立て（CLI引数 > 環境変数 > デフォルト）
  const config = {
    port: args.port ?? (parseInt(env.HTTP_PORT || '', 10) || DEFAULT_HTTP_CONFIG.port),
    host: args.host ?? (env.HTTP_HOST || DEFAULT_HTTP_CONFIG.host),
    enableCors: args.enableCors ?? (env.ENABLE_CORS !== 'false'),
    enableSwagger: args.enableSwagger ?? (env.ENABLE_SWAGGER !== 'false')
  };
  
  const cliLogger = logger.child('http-cli');
  
  cliLogger.info('Starting NDL MCP HTTP Bridge', {
    config: {
      ...config,
      endpoints: [
        'POST /api/v1/search/books',
        'POST /api/v1/search/description',
        'POST /api/v1/search/subject', 
        'POST /api/v1/search/title',
        'GET  /healthz',
        'GET  /readyz',
        'GET  /metrics',
        'GET  /api/v1/stats'
      ]
    }
  });
  
  const server = new NDLRestServer(config);
  
  // グレースフルシャットダウン
  const shutdown = async (signal: string) => {
    cliLogger.info(`Received ${signal}, shutting down gracefully`);
    
    try {
      await server.stop();
      cliLogger.info('Server stopped successfully');
      process.exit(0);
    } catch (error) {
      cliLogger.error('Error during shutdown', {}, error as Error);
      process.exit(1);
    }
  };
  
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  
  try {
    await server.start();
    
    cliLogger.info('NDL MCP HTTP Bridge is ready', {
      endpoints: {
        health: `http://${config.host}:${config.port}/healthz`,
        metrics: `http://${config.host}:${config.port}/metrics`,
        docs: config.enableSwagger ? `http://${config.host}:${config.port}/api/docs` : 'disabled',
        api: `http://${config.host}:${config.port}/api/v1/`
      }
    });
    
    // 使用例の表示
    console.log(`
🚀 NDL MCP HTTP Bridge is running!

📍 Endpoints:
   Health:      http://${config.host}:${config.port}/healthz
   Metrics:     http://${config.host}:${config.port}/metrics
   API Docs:    ${config.enableSwagger ? `http://${config.host}:${config.port}/api/docs` : 'disabled'}
   
📚 Example Usage:
   curl -X POST http://${config.host}:${config.port}/api/v1/search/description \\
     -H "Content-Type: application/json" \\
     -d '{"description": "伝記", "maxRecords": 5}'

🛠  Management:
   Press Ctrl+C to stop the server
`);
    
  } catch (error) {
    cliLogger.error('Failed to start server', {}, error as Error);
    process.exit(1);
  }
}

// エラーハンドリング
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection', { promise }, reason as Error);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', {}, error);
  process.exit(1);
});

// 実行
main().catch((error) => {
  logger.error('CLI failed', {}, error);
  process.exit(1);
});