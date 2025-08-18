import axios, { AxiosError } from 'axios';
import { MCPRecord } from '../types/contracts';
import { env } from '../utils/env';

export interface PublishOptions {
  token?: string;
  strictAuth?: boolean;
  timeout?: number;
  retries?: number;
}

export interface PublishResult {
  success: boolean;
  results: Array<{
    id: string;
    status: number;
    message?: string;
  }>;
}

const BATCH_SIZE = 50;
const DEFAULT_TIMEOUT = 10000;
const DEFAULT_RETRIES = 2;
const RETRY_DELAYS = [200, 600]; // ms

export async function publishToMCP(
  records: MCPRecord[],
  options: PublishOptions = {}
): Promise<PublishResult> {
  if (records.length === 0) {
    return { success: true, results: [] };
  }

  const { 
    token, 
    strictAuth = false, 
    timeout = DEFAULT_TIMEOUT,
    retries = DEFAULT_RETRIES
  } = options;

  // Split into batches if necessary
  const batches = [];
  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    batches.push(records.slice(i, i + BATCH_SIZE));
  }

  const allResults: PublishResult['results'] = [];
  let overallSuccess = true;

  for (const batch of batches) {
    const batchOptions: PublishOptions = { strictAuth, timeout, retries };
    if (token) batchOptions.token = token;
    
    const batchResult = await publishBatch(batch, batchOptions);
    allResults.push(...batchResult.results);
    if (!batchResult.success) {
      overallSuccess = false;
    }
  }

  return {
    success: overallSuccess,
    results: allResults
  };
}

async function publishBatch(
  records: MCPRecord[],
  options: PublishOptions
): Promise<PublishResult> {
  const { token, strictAuth, timeout, retries } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'User-Agent': 'NDL-MCP-Pipeline/1.0.0'
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const payload = { records };

  let lastError: Error | null = null;

  // Main request + retries
  for (let attempt = 0; attempt <= retries!; attempt++) {
    try {
      const axiosConfig: any = {
        headers,
        validateStatus: () => true // Handle all status codes manually
      };
      if (timeout) axiosConfig.timeout = timeout;
      
      const response = await axios.post(
        `${env.MCP_API_URL}/api/v1/publish`,
        payload,
        axiosConfig
      );

      // Success (2xx or 3xx)
      if (response.status < 400) {
        return response.data as PublishResult;
      }

      // Handle authentication errors
      if (response.status === 401) {
        if (strictAuth) {
          throw new Error(`MCP publish failed with status ${response.status}`);
        }
        // In dev mode, 401 might be acceptable - log warning
        console.warn('MCP publish returned 401 but continuing in dev mode');
        return { success: true, results: [] };
      }

      // Handle other 4xx errors (client errors) - don't retry
      if (response.status >= 400 && response.status < 500) {
        throw new Error(`MCP publish failed with status ${response.status}: ${response.data?.error || 'Client error'}`);
      }

      // 5xx errors - should trigger retry logic by throwing error
      if (response.status >= 500) {
        const error = new Error(`MCP publish failed with status ${response.status}: ${response.data?.error || 'Server error'}`);
        throw error;
      }

      // Should not reach here
      throw new Error(`Unexpected status ${response.status}`);

    } catch (error) {
      lastError = error as Error;

      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;

        // Don't retry on 4xx errors (only if we have a response)
        if (axiosError.response && axiosError.response.status >= 400 && axiosError.response.status < 500) {
          throw error;
        }

        // Retry on 5xx errors or network errors (no response means network error)
        if (attempt < retries!) {
          console.warn(`MCP publish attempt ${attempt + 1} failed, retrying...`, axiosError.message);
          await sleep(RETRY_DELAYS[attempt] || RETRY_DELAYS[RETRY_DELAYS.length - 1]);
          continue;
        }

        // All retries exhausted for axios errors - use special message for network errors
        if (!axiosError.response) {
          throw new Error(`MCP publish failed after ${retries} retries: ${axiosError.message}`);
        }
      } else {
        // Handle non-axios errors (like our 5xx status errors)
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        // Don't retry on 4xx errors
        if (errorMessage.includes('failed with status 4')) {
          throw error;
        }

        // Retry on 5xx errors or other retryable errors
        if (attempt < retries!) {
          console.warn(`MCP publish attempt ${attempt + 1} failed, retrying...`, errorMessage);
          await sleep(RETRY_DELAYS[attempt] || RETRY_DELAYS[RETRY_DELAYS.length - 1]);
          continue;
        }
      }

      // All retries exhausted - throw appropriate error based on the original error
      if (lastError instanceof Error && lastError.message.includes('failed with status 5')) {
        throw new Error(`MCP publish failed after ${retries} retries: ${lastError.message}`);
      }

      // All retries exhausted - throw appropriate error
      throw error;
    }
  }

  throw new Error(`MCP publish failed after ${retries} retries: ${lastError?.message}`);
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}