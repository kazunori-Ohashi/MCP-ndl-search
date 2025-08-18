import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { validateQuery } from '../../core/queryValidator';
import { searchNDL } from '../../adapters/searchNDL';
import { enhanceToolOutput, type OutputFormat } from '../../adapters/ndlDataFormatter';
import type { SruSearchInput, ToolOutput, NdlSearchParams } from '../../types/ndl';

export const sruSearchTool: Tool = {
  name: 'ndl_sru_search',
  description: 'Directly search the National Diet Library SRU API using CQL queries. For advanced users who want to provide their own CQL syntax.',
  inputSchema: {
    type: 'object',
    properties: {
      cql: {
        type: 'string',
        description: 'CQL (Contextual Query Language) query string (e.g., \'title="Modern Japan" AND issued>=2020\')'
      },
      maximumRecords: {
        type: 'number',
        description: 'Maximum number of records to return (1-200, default: 20)',
        minimum: 1,
        maximum: 200,
        default: 20
      },
      maxRecords: {
        type: 'number',
        description: 'Legacy alias for maximumRecords (compatibility)',
        minimum: 1,
        maximum: 200
      },
      startRecord: {
        type: 'number',
        description: 'Starting record position for pagination (1-based, default: 1)',
        minimum: 1,
        default: 1
      },
      format: {
        type: 'string',
        description: 'Response format (default: "dcndl")',
        enum: ['dcndl', 'dublin_core', 'marcxml'],
        default: 'dcndl'
      },
      output_format: {
        type: 'string',
        description: 'Output format for results: "json" or "yaml" (default: no formatting)',
        enum: ['json', 'yaml']
      }
    },
    required: ['cql'],
    additionalProperties: false
  }
};

// 新しい公開インターフェース（仕様準拠）
export type SruSearchArgs = SruSearchInput;
export type SruSearchResult = ToolOutput;

export async function handleSruSearch(args: SruSearchArgs): Promise<SruSearchResult> {
  const { cql, maximumRecords, maxRecords, startRecord = 1, format = 'dcndl', output_format } = args;

  try {
    // Step 1: Normalize parameters (maximumRecords/maxRecords互換)
    const params: NdlSearchParams = {
      cql,
      maximumRecords: maximumRecords ?? maxRecords,
      startRecord,
      recordSchema: format
    };

    // Step 2: Validate CQL
    const validationResult = validateQuery(
      { cql, generatedBy: 'rules' },
      params.maximumRecords || 20
    );

    if ('code' in validationResult) {
      throw new Error(`CQL validation failed: ${validationResult.message}`);
    }

    // Step 3: Search NDL with new adapter
    const records = await searchNDL(params);

    // Create basic result
    const basicResult = {
      count: records.length,
      records
    };

    // Enhance with formatting if requested
    const enhancedResult = enhanceToolOutput(basicResult, output_format);
    
    return enhancedResult;

  } catch (error) {
    throw new Error(`SRU search failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}