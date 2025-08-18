// 段階的検索の自動化エンジン
import { IntelligentIntentAnalyzer, type SearchIntent } from './intentAnalyzer';
import { IntelligentResultFilter, type FilteredResult } from './intelligentFilter';
import { searchNDL } from '../adapters/searchNDL';
import type { LLMClient } from '../adapters/llm.types';
import type { NdlRecord } from '../types/ndl';

export interface IntelligentSearchConfig {
  maxResultsPerQuery: number;
  maxTotalResults: number;
  enableParallelSearch: boolean;
  semanticThreshold: number;
  timeoutMs: number;
}

export interface SearchStageResult {
  stage: string;
  strategy: string;
  query: string;
  results: FilteredResult[];
  executionTime: number;
}

export interface IntelligentSearchResult {
  originalQuery: string;
  analyzedIntent: SearchIntent;
  stages: SearchStageResult[];
  finalResults: FilteredResult[];
  totalResults: number;
  executionSummary: {
    totalTime: number;
    stagesExecuted: number;
    llmCallsMade: number;
    semanticFilteringApplied: boolean;
  };
}

export class IntelligentSearchEngine {
  private intentAnalyzer: IntelligentIntentAnalyzer;
  private resultFilter: IntelligentResultFilter;
  
  constructor(
    private llmClient?: LLMClient,
    private config: IntelligentSearchConfig = {
      maxResultsPerQuery: 10,
      maxTotalResults: 20,
      enableParallelSearch: true,
      semanticThreshold: 0.4,
      timeoutMs: 30000
    }
  ) {
    this.intentAnalyzer = new IntelligentIntentAnalyzer(llmClient);
    this.resultFilter = new IntelligentResultFilter(llmClient);
  }

  /**
   * インテリジェント検索の実行
   */
  async executeIntelligentSearch(userQuery: string): Promise<IntelligentSearchResult> {
    const startTime = Date.now();
    let llmCallsMade = 0;
    
    console.error(`intelligent.search: starting analysis of "${userQuery}"`);
    
    // Stage 1: 意図解析
    const analyzedIntent = await this.intentAnalyzer.analyzeSearchIntent(userQuery);
    if (this.llmClient) llmCallsMade++;
    
    console.error(`intelligent.intent: ${analyzedIntent.trueIntent}`);
    console.error(`intelligent.targets: [${analyzedIntent.targetSubjects.join(', ')}]`);
    console.error(`intelligent.scope: ${analyzedIntent.searchScope}`);
    
    // Stage 2: 段階的検索クエリ生成
    const searchQueries = this.generateSearchQueries(analyzedIntent);
    console.error(`intelligent.queries: generated ${searchQueries.length} search strategies`);
    
    // Stage 3: 並列/段階的検索実行
    const stages: SearchStageResult[] = [];
    const allResults: FilteredResult[] = [];
    
    if (this.config.enableParallelSearch && searchQueries.length <= 3) {
      // 少数クエリの場合は並列実行
      const parallelResults = await this.executeParallelSearch(searchQueries, analyzedIntent);
      stages.push(...parallelResults.stages);
      allResults.push(...parallelResults.results);
      if (this.llmClient) llmCallsMade += parallelResults.llmCalls;
    } else {
      // 多数クエリまたは設定により段階的実行
      const sequentialResults = await this.executeSequentialSearch(searchQueries, analyzedIntent);
      stages.push(...sequentialResults.stages);
      allResults.push(...sequentialResults.results);
      if (this.llmClient) llmCallsMade += sequentialResults.llmCalls;
    }
    
    // Stage 4: 最終結果統合と重複除去
    const finalResults = this.consolidateResults(allResults, analyzedIntent);
    
    const totalTime = Date.now() - startTime;
    
    console.error(`intelligent.completed: ${finalResults.length} final results in ${totalTime}ms`);
    
    return {
      originalQuery: userQuery,
      analyzedIntent,
      stages,
      finalResults: finalResults.slice(0, this.config.maxTotalResults),
      totalResults: finalResults.length,
      executionSummary: {
        totalTime,
        stagesExecuted: stages.length,
        llmCallsMade,
        semanticFilteringApplied: Boolean(this.llmClient)
      }
    };
  }

  private generateSearchQueries(intent: SearchIntent): Array<{stage: string, strategy: string, query: string}> {
    const queries = [];
    
    // Stage 1: 直接主題検索（最高優先度）
    for (const subject of intent.targetSubjects.slice(0, 2)) {
      queries.push({
        stage: 'primary-subject',
        strategy: 'subject-direct',
        query: `subject="${subject}"`
      });
    }
    
    // Stage 2: 優先用語による検索
    for (const term of intent.priorityTerms.slice(0, 3)) {
      queries.push({
        stage: 'priority-terms',
        strategy: 'title-priority',
        query: `title="${term}"`
      });
    }
    
    // Stage 3: 検索範囲に応じた特化検索
    const scopeQueries = this.generateScopeSpecificQueries(intent);
    queries.push(...scopeQueries);
    
    // Stage 4: 時代背景を含む複合検索
    if (intent.temporalContext && intent.targetSubjects.length > 0) {
      queries.push({
        stage: 'temporal-context',
        strategy: 'subject-temporal',
        query: `subject="${intent.targetSubjects[0]}" AND subject="${intent.temporalContext}"`
      });
    }
    
    // Stage 5: フォールバック検索（念のため）
    queries.push({
      stage: 'fallback',
      strategy: 'title-fallback',
      query: `title="${intent.targetSubjects[0] || intent.originalQuery.split(' ')[0]}"`
    });
    
    return queries;
  }

  private generateScopeSpecificQueries(intent: SearchIntent): Array<{stage: string, strategy: string, query: string}> {
    const queries = [];
    const mainSubject = intent.targetSubjects[0] || intent.originalQuery.split(' ')[0];
    
    switch (intent.searchScope) {
      case 'biography':
        queries.push({
          stage: 'scope-specific',
          strategy: 'biography-focus',
          query: `title="${mainSubject}" AND description="伝記"`
        });
        queries.push({
          stage: 'scope-specific', 
          strategy: 'biography-focus',
          query: `title="${mainSubject}" AND description="生涯"`
        });
        break;
        
      case 'academic-research':
        queries.push({
          stage: 'scope-specific',
          strategy: 'academic-focus',
          query: `title="${mainSubject}" AND description="研究"`
        });
        queries.push({
          stage: 'scope-specific',
          strategy: 'academic-focus', 
          query: `ndc="210" AND title="${mainSubject}"`
        });
        break;
        
      case 'primary-sources':
        queries.push({
          stage: 'scope-specific',
          strategy: 'sources-focus',
          query: `title="${mainSubject}" AND description="史料"`
        });
        break;
        
      case 'historical-context':
        queries.push({
          stage: 'scope-specific',
          strategy: 'historical-focus',
          query: `title="${mainSubject}" AND description="歴史"`
        });
        if (intent.temporalContext) {
          queries.push({
            stage: 'scope-specific',
            strategy: 'historical-focus',
            query: `subject="${intent.temporalContext}"`
          });
        }
        break;
    }
    
    return queries;
  }

  private async executeParallelSearch(
    queries: Array<{stage: string, strategy: string, query: string}>,
    intent: SearchIntent
  ): Promise<{stages: SearchStageResult[], results: FilteredResult[], llmCalls: number}> {
    
    console.error(`intelligent.parallel: executing ${queries.length} queries in parallel`);
    
    const promises = queries.map(async queryInfo => {
      const stageStart = Date.now();
      
      try {
        const rawResults = await searchNDL({ 
          cql: queryInfo.query, 
          maximumRecords: this.config.maxResultsPerQuery 
        });
        
        const filteredResults = await this.resultFilter.filterAndAnalyzeResults(rawResults, intent);
        
        return {
          stage: queryInfo.stage,
          strategy: queryInfo.strategy,
          query: queryInfo.query,
          results: filteredResults,
          executionTime: Date.now() - stageStart
        };
      } catch (error) {
        console.warn(`Query failed: ${queryInfo.query}`, error);
        return {
          stage: queryInfo.stage,
          strategy: queryInfo.strategy,
          query: queryInfo.query,
          results: [],
          executionTime: Date.now() - stageStart
        };
      }
    });
    
    const stages = await Promise.all(promises);
    const allResults = stages.flatMap(stage => stage.results);
    
    return {
      stages,
      results: allResults,
      llmCalls: this.llmClient ? queries.length : 0
    };
  }

  private async executeSequentialSearch(
    queries: Array<{stage: string, strategy: string, query: string}>,
    intent: SearchIntent
  ): Promise<{stages: SearchStageResult[], results: FilteredResult[], llmCalls: number}> {
    
    console.error(`intelligent.sequential: executing ${queries.length} queries sequentially`);
    
    const stages: SearchStageResult[] = [];
    const allResults: FilteredResult[] = [];
    let llmCalls = 0;
    
    for (const queryInfo of queries) {
      // 既に十分な結果がある場合は早期終了
      if (allResults.length >= this.config.maxTotalResults) {
        console.error(`intelligent.early_exit: sufficient results obtained (${allResults.length})`);
        break;
      }
      
      const stageStart = Date.now();
      
      try {
        const rawResults = await searchNDL({ 
          cql: queryInfo.query, 
          maximumRecords: this.config.maxResultsPerQuery 
        });
        
        const filteredResults = await this.resultFilter.filterAndAnalyzeResults(rawResults, intent);
        
        if (this.llmClient) llmCalls++;
        
        stages.push({
          stage: queryInfo.stage,
          strategy: queryInfo.strategy,
          query: queryInfo.query,
          results: filteredResults,
          executionTime: Date.now() - stageStart
        });
        
        allResults.push(...filteredResults);
        
      } catch (error) {
        console.warn(`Sequential query failed: ${queryInfo.query}`, error);
      }
    }
    
    return {
      stages,
      results: allResults,
      llmCalls
    };
  }

  private consolidateResults(results: FilteredResult[], intent: SearchIntent): FilteredResult[] {
    // 重複除去（タイトルベース）
    const seen = new Set<string>();
    const unique: FilteredResult[] = [];
    
    for (const result of results) {
      const normalizedTitle = this.normalizeTitle(result.title);
      
      if (!seen.has(normalizedTitle)) {
        seen.add(normalizedTitle);
        unique.push(result);
      }
    }
    
    // 意味的関連度でフィルタリング
    const filtered = unique.filter(result => 
      result.semanticRelevance >= this.config.semanticThreshold
    );
    
    // 総合スコアで最終ソート
    return filtered.sort((a, b) => {
      const scoreA = this.calculateFinalScore(a, intent);
      const scoreB = this.calculateFinalScore(b, intent);
      return scoreB - scoreA;
    });
  }

  private calculateFinalScore(result: FilteredResult, intent: SearchIntent): number {
    let score = result.semanticRelevance * 0.6; // 意味的関連度（60%）
    
    // 内容タイプボーナス
    const typeBonus = {
      'primary-source': 0.15,
      'academic-study': 0.12,
      'biography': intent.searchScope === 'biography' ? 0.15 : 0.10,
      'historical-context': intent.searchScope === 'historical-context' ? 0.15 : 0.08,
      'tangential': 0.05,
      'irrelevant': 0.0
    };
    score += typeBonus[result.contentAnalysis.contentType] || 0;
    
    // 品質指標ボーナス
    score += result.contentAnalysis.qualityIndicators.length * 0.02;
    
    // 直接関連ボーナス
    if (result.contentAnalysis.isDirectlyRelated) {
      score += 0.1;
    }
    
    return Math.min(1.0, score);
  }

  private normalizeTitle(title: string): string {
    return title
      .toLowerCase()
      .replace(/[「」『』（）()【】\[\]]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }
}