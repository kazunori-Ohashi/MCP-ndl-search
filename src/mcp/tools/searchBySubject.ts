import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { searchNDL } from '../../adapters/searchNDL';
import { publishToMCP } from '../../adapters/publisher.http';
import { enhanceToolOutput, type OutputFormat } from '../../adapters/ndlDataFormatter';
import type { NdlRecord } from '../../types/ndl';

export const searchBySubjectTool: Tool = {
  name: 'ndl_search_by_subject',
  description: '🥈 SECOND CHOICE: Search by official academic subject classification. Use when you need formal academic categorization or when ndl_search_by_description yields insufficient results. For most topic searches, try ndl_search_by_description first.',
  inputSchema: {
    type: 'object',
    properties: {
      subject: {
        type: 'string',
        description: 'Subject keyword to search (e.g., "聖徳太子", "日本史", "仏教", "経済史", "文学")'
      },
      additionalSubject: {
        type: 'string',
        description: 'Optional: Additional subject to expand search scope (OR logic). Results will include books from either subject category and be ranked by relevance.',
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
      },
      includeHoldings: {
        type: 'boolean',
        description: 'Include library holdings information from libraries across Japan. WARNING: Significantly increases response size. Only use when you specifically need to know which libraries have the book. (default: false)',
        default: false
      }
    },
    required: ['subject'],
    additionalProperties: false
  }
};

export interface SearchBySubjectArgs {
  subject: string;
  additionalSubject?: string;
  maxRecords?: number;
  publishToMcp?: boolean;
  output_format?: OutputFormat;
  includeHoldings?: boolean;
}

export interface SearchBySubjectResult {
  count: number;
  records: NdlRecord[];
  query: string;
  formatted_records?: string;
}

export async function handleSearchBySubject(args: SearchBySubjectArgs): Promise<SearchBySubjectResult> {
  const { subject, additionalSubject = '', maxRecords = 20, publishToMcp = true, output_format } = args;

  try {
    console.error(`ndl_search_by_subject: searching subject="${subject}", additional="${additionalSubject}"`);
    
    // Build CQL query focused on subject
    // Note: Multiple subjects with AND often return 0 results as NDL subject classification is very specific
    // We use OR logic for better discovery, then sort by relevance
    let cql: string;
    if (additionalSubject.trim()) {
      cql = `subject="${subject}" OR subject="${additionalSubject.trim()}"`;
    } else {
      cql = `subject="${subject}"`;
    }
    
    console.error(`ndl_search_by_subject: CQL="${cql}"`);
    
    // Execute search
    const searchParams = {
      cql,
      maximumRecords: maxRecords,
      ...(includeHoldings && { recordSchema: 'dcndl' }),
      includeHoldings
    };
    const records = await searchNDL(searchParams);
    console.error(`ndl_search_by_subject: found ${records.length} records`);
    
    // Sort by relevance
    let sortedRecords = sortBySubjectRelevance(records, subject, additionalSubject);
    
    // 所蔵情報を含めない場合はholdingsフィールドを削除
    if (!includeHoldings) {
      sortedRecords = sortedRecords.map(record => {
        const { holdings, ...recordWithoutHoldings } = record;
        return recordWithoutHoldings as NdlRecord;
      });
    }
    
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
    throw new Error(`Subject search failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function sortBySubjectRelevance(records: NdlRecord[], subject: string, additionalSubject: string): NdlRecord[] {
  return records.sort((a, b) => {
    let scoreA = 0;
    let scoreB = 0;
    
    const titleA = a.title.toLowerCase();
    const titleB = b.title.toLowerCase();
    const subjectLower = subject.toLowerCase();
    const additionalLower = additionalSubject.toLowerCase();
    
    // Perfect match: both subjects in title (highest priority for OR queries)
    if (additionalSubject && titleA.includes(subjectLower) && titleA.includes(additionalLower)) scoreA += 20;
    if (additionalSubject && titleB.includes(subjectLower) && titleB.includes(additionalLower)) scoreB += 20;
    
    // Direct subject in title bonus
    if (titleA.includes(subjectLower)) scoreA += 10;
    if (titleB.includes(subjectLower)) scoreB += 10;
    
    // Additional subject in title bonus
    if (additionalSubject && titleA.includes(additionalLower)) scoreA += 8;
    if (additionalSubject && titleB.includes(additionalLower)) scoreB += 8;
    
    // Academic quality indicators
    if (titleA.includes('研究') || titleA.includes('史料') || titleA.includes('考察')) scoreA += 5;
    if (titleB.includes('研究') || titleB.includes('史料') || titleB.includes('考察')) scoreB += 5;
    
    // Comprehensive works bonus
    if (titleA.includes('全集') || titleA.includes('大系') || titleA.includes('選集')) scoreA += 3;
    if (titleB.includes('全集') || titleB.includes('大系') || titleB.includes('選集')) scoreB += 3;
    
    // Multi-volume works bonus
    if (titleA.match(/第?\d+[巻冊]/)) scoreA += 2;
    if (titleB.match(/第?\d+[巻冊]/)) scoreB += 2;
    
    return scoreB - scoreA;
  });
}

function convertToMCPRecord(record: NdlRecord): any {
  return {
    id: record.id,
    title: record.title,
    creators: record.creators || [],
    pub_date: typeof record.date === 'object' ? record.date._ : record.date,
    subjects: record.subjects || [],
    identifiers: { NDLBibID: record.id },
    description: undefined,
    source: { 
      provider: 'NDL',
      retrieved_at: new Date().toISOString()
    }
    // raw_record: JSON.stringify(record.raw) - 削除：データ量削減のため
  };
}