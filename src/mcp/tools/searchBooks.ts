import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { generateQueries } from '../../core/queryGenerator';
import { validateQuery } from '../../core/queryValidator';
import { searchNDL } from '../../adapters/searchNDL';
import { publishToMCP } from '../../adapters/publisher.http';
import { enhanceToolOutput, type OutputFormat } from '../../adapters/ndlDataFormatter';
import { env } from '../../utils/env';
import { OpenAILLMClient } from '../../adapters/llm.openai';
import { AdvancedSearchStrategy } from '../../core/searchStrategy';
import { ResultScoringEngine } from '../../core/resultScoring';
import { IntelligentSearchEngine } from '../../core/intelligentSearch';
import type { SearchBooksInput, ToolOutput, NdlRecord } from '../../types/ndl';
import type { LLMClient } from '../../adapters/llm.types';

export const searchBooksTool: Tool = {
  name: 'ndl_search_books',
  description: '🔧 LAST RESORT: Advanced AI-powered search for extremely complex queries. ONLY use when ndl_search_by_description fails or for very complex multi-concept research. For most searches, use ndl_search_by_description instead.',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Natural language search query (e.g., "聖徳太子の生涯について詳しく知りたい", "仏教伝来の研究論文")'
      },
      maxRecords: {
        type: 'number',
        description: 'Maximum number of records to return (1-50, default: 20)',
        minimum: 1,
        maximum: 50,
        default: 20
      },
      searchMode: {
        type: 'string',
        description: 'Search mode: "intelligent" uses LLM-powered multi-stage search, "advanced" uses rule-based multi-field search, "simple" uses basic title search (default: "intelligent")',
        enum: ['intelligent', 'advanced', 'simple'],
        default: 'intelligent'
      },
      publishToMcp: {
        type: 'boolean',
        description: 'Whether to publish results to MCP (default: true)',
        default: true
      },
      preferLanguage: {
        type: 'string',
        description: 'Preferred language for results (default: "jpn")',
        default: 'jpn'
      },
      output_format: {
        type: 'string',
        description: 'Output format for results: "json" or "yaml" (default: no formatting)',
        enum: ['json', 'yaml']
      }
    },
    required: ['query'],
    additionalProperties: false
  }
};

// 拡張インターフェース（新機能対応）
export interface SearchBooksArgs_Extended {
  query: string;
  maxRecords?: number;
  searchMode?: 'intelligent' | 'advanced' | 'simple';
  publishToMcp?: boolean;
  preferLanguage?: string;
  output_format?: OutputFormat;
}

export interface SearchBooksResult_Internal {
  success: boolean;
  records: Array<{
    id: string;
    title: string;
    creators?: string[] | undefined;
    subjects?: string[] | undefined;
    pub_date?: string | undefined;
    identifiers?: { ISBN?: string; NDLBibID?: string; [k:string]:string } | undefined;
    description?: string | undefined;
    source: {
      provider: string;
      retrieved_at: string;
    };
  }>;
  metadata: {
    cql_query: string;
    total_found: number;
    published_to_mcp: boolean;
    generated_by: string;
  };
  errors?: string[];
}

// 新しい公開インターフェース（拡張機能対応）
export type SearchBooksArgs = SearchBooksArgs_Extended;
export type SearchBooksResult = ToolOutput;

export async function handleSearchBooks(args: SearchBooksArgs): Promise<SearchBooksResult> {
  const { query, maxRecords = 20, searchMode = 'intelligent', preferLanguage = 'jpn', publishToMcp = true, output_format } = args;

  try {
    console.error(`ndl_search_books: processing query="${query}", mode=${searchMode}, maxRecords=${maxRecords}`);
    
    let finalResults: NdlRecord[] = [];
    
    // Route to appropriate search engine based on mode
    switch (searchMode) {
      case 'intelligent':
        finalResults = await executeIntelligentSearch(query, maxRecords, preferLanguage);
        break;
      case 'advanced':
        finalResults = await executeAdvancedSearch(query, maxRecords, preferLanguage);
        break;
      case 'simple':
        finalResults = await executeSimpleSearch(query, maxRecords, preferLanguage);
        break;
      default:
        throw new Error(`Unknown search mode: ${searchMode}`);
    }
    
    console.error(`ndl_search_books: final results: ${finalResults.length} records`);
    
    // Optionally publish to MCP
    if (publishToMcp && finalResults.length > 0) {
      try {
        const mcpRecords = finalResults.map(convertToMCPRecord);
        await publishToMCP(mcpRecords);
      } catch (error) {
        console.warn(`MCP publishing failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // Create basic result
    const basicResult = {
      count: finalResults.length,
      records: finalResults
    };

    // Enhance with formatting if requested
    const enhancedResult = enhanceToolOutput(basicResult, output_format);
    
    return enhancedResult;

  } catch (error) {
    throw new Error(`Search failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// 検索モード別実行関数

async function executeIntelligentSearch(query: string, maxRecords: number, preferLanguage: string): Promise<NdlRecord[]> {
  console.error(`intelligent_search: initializing LLM-powered search for "${query}"`);
  
  // LLMクライアントの初期化
  let llmClient: LLMClient | undefined;
  if (env.LLM_PROVIDER === 'openai' && env.OPENAI_API_KEY) {
    try {
      llmClient = new OpenAILLMClient({
        apiKey: env.OPENAI_API_KEY,
        model: env.OPENAI_MODEL,
        temperature: env.OPENAI_TEMPERATURE,
        topP: env.OPENAI_TOP_P
      });
    } catch (error) {
      console.warn('Failed to initialize LLM client, falling back to advanced search');
      return executeAdvancedSearch(query, maxRecords, preferLanguage);
    }
  }
  
  // インテリジェント検索エンジン実行
  const searchEngine = new IntelligentSearchEngine(llmClient, {
    maxResultsPerQuery: 8,
    maxTotalResults: maxRecords,
    enableParallelSearch: true,
    semanticThreshold: 0.4,
    timeoutMs: 30000
  });
  
  const intelligentResult = await searchEngine.executeIntelligentSearch(query);
  console.error(`intelligent_search: completed in ${intelligentResult.executionSummary.totalTime}ms with ${intelligentResult.executionSummary.llmCallsMade} LLM calls`);
  
  // 言語優先度適用
  const languageRanked = rankByPreferredLanguage(intelligentResult.finalResults, preferLanguage);
  
  return languageRanked;
}

async function executeAdvancedSearch(query: string, maxRecords: number, preferLanguage: string): Promise<NdlRecord[]> {
  console.error(`advanced_search: executing multi-field search for "${query}"`);
  
  // 既存の高度な検索戦略を使用
  const strategy = new AdvancedSearchStrategy();
  const searchIntent = strategy.analyzeSearchIntent(query);
  const cqlResult = await buildCqlFromQueryWithStrategy(query, strategy, searchIntent);
  
  // NDL検索実行
  const records = await searchNDL({ cql: cqlResult.cql, maximumRecords: maxRecords });
  
  // スコアリングエンジンで品質向上
  const scoringEngine = new ResultScoringEngine();
  const scoredResults = scoringEngine.scoreAndRankResults(records, {
    query,
    searchIntent,
    usedStrategy: cqlResult.strategy
  });
  
  // 重複除去と言語優先度適用
  const deduplicated = scoringEngine.deduplicateResults(scoredResults);
  const finalResults = rankByPreferredLanguage(deduplicated, preferLanguage);
  
  return finalResults;
}

async function executeSimpleSearch(query: string, maxRecords: number, preferLanguage: string): Promise<NdlRecord[]> {
  console.error(`simple_search: executing basic title search for "${query}"`);
  
  // シンプルなタイトル検索CQL生成
  const simpleCql = createSafeFallbackCql(query);
  
  // NDL検索実行
  const records = await searchNDL({ cql: simpleCql, maximumRecords: maxRecords });
  
  // 言語優先度適用のみ
  const finalResults = rankByPreferredLanguage(records, preferLanguage);
  
  return finalResults;
}

// 内部ヘルパー: 戦略情報付きCQL変換
async function buildCqlFromQueryWithStrategy(
  query: string, 
  strategy: AdvancedSearchStrategy, 
  searchIntent: any
): Promise<{ cql: string; strategy: string }> {
  // 1. 階層的CQL候補を生成
  const cqlCandidates = strategy.generateCQLCandidates(searchIntent);
  
  // 2. 優先度順に検証し、最初の有効なCQLを採用
  for (const candidate of cqlCandidates) {
    const validationResult = validateQuery({
      cql: candidate.cql,
      confidence: candidate.expectedRelevance,
      explanation: candidate.strategy,
      generatedBy: 'advanced-strategy' as const
    }, 200);
    
    if (!('code' in validationResult)) {
      console.error(`cql.selected: ${validationResult.cql} (strategy: ${candidate.strategy}, priority: ${candidate.priority})`);
      return { cql: validationResult.cql, strategy: candidate.strategy };
    } else {
      console.error(`cql.rejected: ${candidate.cql} (${validationResult.message})`);
    }
  }

  // 3. 全候補が失敗した場合、従来のフォールバックを使用
  console.error('Advanced strategy failed, falling back to simple title search');
  const fallbackCql = createSafeFallbackCql(query);
  const fallbackCandidate = {
    cql: fallbackCql,
    confidence: 0.1,
    explanation: 'Simple title fallback',
    generatedBy: 'simple-fallback' as const
  };

  const fallbackValidation = validateQuery(fallbackCandidate, 200);
  if ('code' in fallbackValidation) {
    throw new Error(`All search strategies failed: ${fallbackValidation.message}`);
  }

  console.error(`cql.fallback: ${fallbackValidation.cql}`);
  return { cql: fallbackValidation.cql, strategy: 'simple-fallback' };
}

// 安全フォールバックCQL生成（段階的フォールバック戦略）
function createSafeFallbackCql(query: string): string {
  // 1. 基本キーワード抽出
  const rawKeywords = query
    .trim()
    .split(/[\s\u3000、。，．！？の に を が は で と から まで について に関して について]+/)
    .filter(keyword => keyword.length > 1)
    .map(keyword => keyword.replace(/"/g, '\\"'));

  // 2. ノイズワード除去（書籍検索なので書籍関連語は除外）
  const noiseWords = ['書籍', '本', '資料', '文献', '探して', '検索', '調べ', 'について', '関して', 'に関して'];
  const meaningfulKeywords = rawKeywords.filter(kw => !noiseWords.includes(kw));

  // 3. 複合語を分解して単語レベルにする
  const simpleKeywords = [];
  for (const keyword of meaningfulKeywords) {
    if (keyword.length > 4) {
      // 長い複合語は分解を試行
      if (keyword.includes('明王朝')) {
        simpleKeywords.push('明代', '中国');
      } else if (keyword.includes('税制度')) {
        simpleKeywords.push('税制');
      } else if (keyword.includes('機械学習')) {
        simpleKeywords.push('機械学習');
      } else if (keyword.includes('伝統医学')) {
        simpleKeywords.push('伝統', '医学');
      } else {
        // その他は先頭4文字を使用
        simpleKeywords.push(keyword.substring(0, 4));
      }
    } else {
      simpleKeywords.push(keyword);
    }
  }

  const finalKeywords = [...new Set(simpleKeywords)].slice(0, 2); // 重複除去＋2つまで

  console.error(`フォールバック変換: "${query}" → [${finalKeywords.join(', ')}]`);

  if (finalKeywords.length === 0) {
    return 'title="日本"';
  }

  if (finalKeywords.length === 1) {
    return `title="${finalKeywords[0]}"`;
  }

  // 2キーワードの場合：ORで緩く検索（ANDだと厳しすぎる）
  return `title="${finalKeywords[0]}" OR title="${finalKeywords[1]}"`;
}

// 内部ヘルパー: 言語優先の並び替え
function rankByPreferredLanguage(records: NdlRecord[], lang: string): NdlRecord[] {
  return [...records].sort((a, b) => {
    const aScore = a.language === lang ? 1 : 0;
    const bScore = b.language === lang ? 1 : 0;
    return bScore - aScore;
  });
}

// 内部ヘルパー: NdlRecord → MCPRecord変換（publishToMCP用）
function convertToMCPRecord(record: NdlRecord): any {
  return {
    id: record.id,
    title: record.title,
    creators: record.creators || [],
    pub_date: record.date,
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