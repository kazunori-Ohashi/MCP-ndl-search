import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { searchNDL } from '../../adapters/searchNDL';
import { publishToMCP } from '../../adapters/publisher.http';
import { enhanceToolOutput, type OutputFormat } from '../../adapters/ndlDataFormatter';
import type { NdlRecord } from '../../types/ndl';

export const searchByTitleTool: Tool = {
  name: 'ndl_search_by_title',
  description: '🥉 THIRD CHOICE: Search books by title keywords only. Use ONLY when looking for specific titles or editions. For topic research, use ndl_search_by_description instead.',
  inputSchema: {
    type: 'object',
    properties: {
      title: {
        type: 'string',
        description: 'Keywords to search in book titles (e.g., "聖徳太子", "経済史", "源氏物語")'
      },
      additionalTitle: {
        type: 'string',
        description: 'Optional: Additional title keyword to combine with AND logic',
        default: ''
      },
      maxRecords: {
        type: 'number',
        description: 'Maximum number of records to return (1-50, default: 20)',
        minimum: 1,
        maximum: 50,
        default: 20
      },
      publishToMcp: {
        type: 'boolean',
        description: 'Whether to publish results to MCP (default: true)',
        default: true
      },
      output_format: {
        type: 'string',
        description: 'Output format for results: "json" or "yaml" (default: no formatting)',
        enum: ['json', 'yaml']
      }
    },
    required: ['title'],
    additionalProperties: false
  }
};

export interface SearchByTitleArgs {
  title: string;
  additionalTitle?: string;
  maxRecords?: number;
  publishToMcp?: boolean;
  output_format?: OutputFormat;
}

export interface SearchByTitleResult {
  count: number;
  records: NdlRecord[];
  query: string;
  formatted_records?: string;
}

export async function handleSearchByTitle(args: SearchByTitleArgs): Promise<SearchByTitleResult> {
  const { title, additionalTitle = '', maxRecords = 20, publishToMcp = true, output_format } = args;

  try {
    console.error(`ndl_search_by_title: searching title="${title}", additional="${additionalTitle}"`);
    
    // Build CQL query focused on title
    let cql: string;
    if (additionalTitle.trim()) {
      cql = `title="${title}" AND title="${additionalTitle.trim()}"`;
    } else {
      cql = `title="${title}"`;
    }
    
    console.error(`ndl_search_by_title: CQL="${cql}"`);
    
    // Execute search
    const records = await searchNDL({ cql, maximumRecords: maxRecords });
    console.error(`ndl_search_by_title: found ${records.length} records`);
    
    // Sort by relevance (title match strength)
    const sortedRecords = sortByTitleRelevance(records, title, additionalTitle);
    
    // Optionally publish to MCP
    if (publishToMcp && sortedRecords.length > 0) {
      try {
        const mcpRecords = sortedRecords.map(convertToMCPRecord);
        await publishToMCP(mcpRecords);
      } catch (error) {
        console.warn(`MCP publishing failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // Create basic result
    const basicResult = {
      count: sortedRecords.length,
      records: sortedRecords,
      query: cql
    };

    // Enhance with formatting if requested
    const enhancedResult = enhanceToolOutput(basicResult, output_format);
    
    return {
      count: enhancedResult.count,
      records: enhancedResult.records,
      query: cql,
      formatted_records: enhancedResult.formatted_records
    };

  } catch (error) {
    throw new Error(`Title search failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function sortByTitleRelevance(records: NdlRecord[], title: string, additionalTitle: string): NdlRecord[] {
  return records.sort((a, b) => {
    let scoreA = 0;
    let scoreB = 0;
    
    const titleA = a.title.toLowerCase();
    const titleB = b.title.toLowerCase();
    const searchLower = title.toLowerCase();
    const additionalLower = additionalTitle.toLowerCase();
    
    // Exact match bonus
    if (titleA === searchLower) scoreA += 20;
    if (titleB === searchLower) scoreB += 20;
    
    // Starts with search term bonus
    if (titleA.startsWith(searchLower)) scoreA += 15;
    if (titleB.startsWith(searchLower)) scoreB += 15;
    
    // Additional title keyword bonus
    if (additionalTitle && titleA.includes(additionalLower)) scoreA += 10;
    if (additionalTitle && titleB.includes(additionalLower)) scoreB += 10;
    
    // Length preference (shorter titles often more relevant)
    scoreA += Math.max(0, 50 - titleA.length) / 10;
    scoreB += Math.max(0, 50 - titleB.length) / 10;
    
    // Quality indicators
    if (titleA.includes('全集') || titleA.includes('選集')) scoreA += 5;
    if (titleB.includes('全集') || titleB.includes('選集')) scoreB += 5;
    
    // Academic works bonus
    if (titleA.includes('研究') || titleA.includes('論文')) scoreA += 3;
    if (titleB.includes('研究') || titleB.includes('論文')) scoreB += 3;
    
    return scoreB - scoreA;
  });
}

function convertToMCPRecord(record: NdlRecord): any {
  return {
    id: record.id,
    title: record.title,
    creators: record.creators || [],
    pub_date: typeof record.date === 'object' ? record.date._ : record.date,
    subjects: [],
    identifiers: { NDLBibID: record.id },
    description: undefined,
    source: { 
      provider: 'NDL',
      retrieved_at: new Date().toISOString()
    },
    raw_record: JSON.stringify(record.raw)
  };
}