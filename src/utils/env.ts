import { z } from 'zod';
import { config } from 'dotenv';

// Load environment variables
config();

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  TZ: z.string().default('Asia/Tokyo'),
  PORT: z.coerce.number().default(8787),
  HTTP_PORT: z.coerce.number().default(3000),
  HTTP_HOST: z.string().default('localhost'),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),

  NDL_BASE_URL: z.string().url().default('https://ndlsearch.ndl.go.jp/api/sru'),
  NDL_RECORD_SCHEMA: z.string().default('dcndl'),
  NDL_MAX_RECORDS: z.coerce.number().min(1).max(200).default(20),
  HTTP_TIMEOUT_MS: z.coerce.number().min(1000).default(15000),
  HTTP_RETRY: z.coerce.number().min(0).max(5).default(3),

  MCP_API_URL: z.string().url().default('http://localhost:3000/api/v1'),
  MCP_API_TOKEN: z.string().optional(),
  ENABLE_CORS: z.coerce.boolean().default(true),
  ENABLE_SWAGGER: z.coerce.boolean().default(true),

  LLM_PROVIDER: z.enum(['openai', 'anthropic', 'azure', 'ollama']).default('openai'),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default('gpt-4o-mini'),
  OPENAI_TEMPERATURE: z.coerce.number().min(0).max(2).default(0.2),
  OPENAI_TOP_P: z.coerce.number().min(0).max(1).default(1),
  RECENT_YEAR_THRESHOLD: z.coerce.number().min(1900).max(2100).default(2018),

  RATE_LIMIT_RPM: z.coerce.number().min(1).default(5),
  RATE_LIMIT_BACKEND: z.enum(['memory', 'redis']).default('memory'),
  REDIS_URL: z.string().optional(),

  CACHE_TTL_SEC: z.coerce.number().min(60).default(86400),
  SQLITE_PATH: z.string().default('./data/app.db'),
  LLM_LOG_RETENTION_DAYS: z.coerce.number().min(1).default(7),
  ENABLE_LLM_LOG: z.coerce.boolean().default(true),

  ENABLE_METRICS: z.coerce.boolean().default(true),
});

export type Env = z.infer<typeof EnvSchema>;

let env: Env;

try {
  env = EnvSchema.parse(process.env);
} catch (error) {
  console.error('❌ Environment validation failed:');
  if (error instanceof z.ZodError) {
    error.errors.forEach((err) => {
      console.error(`  - ${err.path.join('.')}: ${err.message}`);
    });
  }
  process.exit(1);
}

export { env };