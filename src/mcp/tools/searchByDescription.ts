import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { searchNDL } from '../../adapters/searchNDL';
import { publishToMCP } from '../../adapters/publisher.http';
import { enhanceToolOutput, type OutputFormat } from '../../adapters/ndlDataFormatter';
import type { NdlRecord } from '../../types/ndl';

export const searchByDescriptionTool: Tool = {
  name: 'ndl_search_by_description',
  description: '🥇 PRIMARY TOOL: Search NDL books by content/description keywords. USE THIS FOR 90% OF SEARCHES. Most effective for finding books that discuss or analyze your topic. Searches the actual content descriptions, not just titles.',
  inputSchema: {
    type: 'object',
    properties: {
      description: {
        type: 'string',
        description: 'Keywords to search in book descriptions (e.g., "伝記", "歴史", "研究", "経済", "文化")'
      },
      titleKeyword: {
        type: 'string',
        description: 'Optional: Additional keyword to search in titles to narrow results',
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
    required: ['description'],
    additionalProperties: false
  }
};

export interface SearchByDescriptionArgs {
  description: string;
  titleKeyword?: string;
  maxRecords?: number;
  publishToMcp?: boolean;
  output_format?: OutputFormat;
}

export interface SearchByDescriptionResult {
  count: number;
  records: NdlRecord[];
  query: string;
  formatted_records?: string;
}

export async function handleSearchByDescription(args: SearchByDescriptionArgs): Promise<SearchByDescriptionResult> {
  const { description, titleKeyword = '', maxRecords = 20, publishToMcp = true, output_format } = args;

  try {
    console.error(`ndl_search_by_description: searching description="${description}", title="${titleKeyword}"`);
    
    // Build CQL query focused on description
    let cql: string;
    if (titleKeyword.trim()) {
      cql = `description="${description}" AND title="${titleKeyword.trim()}"`;
    } else {
      cql = `description="${description}"`;
    }
    
    console.error(`ndl_search_by_description: CQL="${cql}"`);
    
    // Execute search
    const records = await searchNDL({ cql, maximumRecords: maxRecords });
    console.error(`ndl_search_by_description: found ${records.length} records`);
    
    // Sort by relevance (simple heuristic)
    const sortedRecords = sortByDescriptionRelevance(records, description, titleKeyword);
    
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
    throw new Error(`Description search failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function sortByDescriptionRelevance(records: NdlRecord[], description: string, titleKeyword: string): NdlRecord[] {
  return records.sort((a, b) => {
    let scoreA = 0;
    let scoreB = 0;
    
    const titleA = a.title.toLowerCase();
    const titleB = b.title.toLowerCase();
    const descLower = description.toLowerCase();
    const titleKeyLower = titleKeyword.toLowerCase();
    
    // Title keyword match bonus
    if (titleKeyword && titleA.includes(titleKeyLower)) scoreA += 10;
    if (titleKeyword && titleB.includes(titleKeyLower)) scoreB += 10;
    
    // Description keyword in title bonus
    if (titleA.includes(descLower)) scoreA += 5;
    if (titleB.includes(descLower)) scoreB += 5;
    
    // Academic indicators bonus
    if (titleA.includes('研究') || titleA.includes('論文') || titleA.includes('分析')) scoreA += 3;
    if (titleB.includes('研究') || titleB.includes('論文') || titleB.includes('分析')) scoreB += 3;
    
    // Publication type bonus
    if (titleA.includes('全集') || titleA.includes('選集') || titleA.includes('大系')) scoreA += 2;
    if (titleB.includes('全集') || titleB.includes('選集') || titleB.includes('大系')) scoreB += 2;
    
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