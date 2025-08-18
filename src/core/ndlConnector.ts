import axios, { AxiosError } from 'axios';
import { ValidatedQuery } from '../types/contracts';
import { env } from '../utils/env';

export interface NDLSearchResult {
  rawXml: string;
  httpStatus: number;
  headers: Record<string, string>;
}

const RETRY_DELAYS = [200, 600, 1800]; // Exponential backoff in milliseconds

export async function searchNDL(validatedQuery: ValidatedQuery): Promise<NDLSearchResult> {
  const { cql, maximumRecords } = validatedQuery;

  const params = {
    operation: 'searchRetrieve' as const,
    query: cql,
    recordSchema: env.NDL_RECORD_SCHEMA,
    maximumRecords: maximumRecords
  };

  let lastError: Error | null = null;

  // Main request + retries
  for (let attempt = 0; attempt <= env.HTTP_RETRY; attempt++) {
    try {
      const response = await axios.get(env.NDL_BASE_URL, {
        params,
        timeout: env.HTTP_TIMEOUT_MS,
        headers: {
          'User-Agent': 'NDL-MCP-Pipeline/1.0.0',
          'Accept': 'application/xml'
        }
      });

      return {
        rawXml: response.data,
        httpStatus: response.status,
        headers: response.headers as Record<string, string>
      };

    } catch (error) {
      lastError = error as Error;

      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        
        // Don't retry on 4xx errors (client errors)
        if (axiosError.response && axiosError.response.status >= 400 && axiosError.response.status < 500) {
          throw new Error(`NDL SRU request failed with status ${axiosError.response.status}`);
        }

        // Don't retry on timeout errors
        if (axiosError.code === 'ECONNABORTED' || axiosError.message.toLowerCase().includes('timeout')) {
          throw new Error(`NDL SRU request timeout after ${env.HTTP_TIMEOUT_MS}ms`);
        }

        // Retry on 5xx errors
        if (axiosError.response && axiosError.response.status >= 500) {
          console.warn(`NDL SRU request failed with ${axiosError.response.status}, attempt ${attempt + 1}/${env.HTTP_RETRY + 1}`);
          
          // Wait before retry (except on last attempt)
          if (attempt < env.HTTP_RETRY) {
            await sleep(RETRY_DELAYS[attempt]);
          }
          continue;
        }

        // Retry on network errors (no response)
        if (!axiosError.response) {
          console.warn(`NDL SRU network error, attempt ${attempt + 1}/${env.HTTP_RETRY + 1}:`, axiosError.message);
          
          if (attempt < env.HTTP_RETRY) {
            await sleep(RETRY_DELAYS[attempt]);
          }
          continue;
        }
      }

      // Unknown error, don't retry
      throw error;
    }
  }

  // All retries exhausted
  throw new Error(`NDL SRU request failed after ${env.HTTP_RETRY} retries: ${lastError?.message}`);
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
