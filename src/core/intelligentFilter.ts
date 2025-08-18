// LLMによる検索結果の意味的フィルタリング
import type { LLMClient } from '../adapters/llm.types';
import type { NdlRecord } from '../types/ndl';
import type { SearchIntent } from './intentAnalyzer';

export interface FilteredResult extends NdlRecord {
  semanticRelevance: number;
  contentAnalysis: {
    isDirectlyRelated: boolean;
    relevanceReason: string;
    contentType: 'primary-source' | 'academic-study' | 'biography' | 'historical-context' | 'tangential' | 'irrelevant';
    qualityIndicators: string[];
  };
}

export class IntelligentResultFilter {
  
  constructor(private llmClient?: LLMClient) {}

  /**
   * LLMを使用して検索結果を意味的にフィルタリング
   */
  async filterAndAnalyzeResults(
    results: NdlRecord[], 
    intent: SearchIntent
  ): Promise<FilteredResult[]> {
    
    if (!this.llmClient || results.length === 0) {
      return this.ruleBasedFiltering(results, intent);
    }

    try {
      // 結果を小さなバッチに分けてLLM分析
      const batchSize = 5;
      const filteredResults: FilteredResult[] = [];
      
      for (let i = 0; i < results.length; i += batchSize) {
        const batch = results.slice(i, i + batchSize);
        const batchResults = await this.analyzeBatch(batch, intent);
        filteredResults.push(...batchResults);
      }
      
      // 関連度順にソートし、無関係なものを除外
      return filteredResults
        .filter(result => result.semanticRelevance > 0.3)
        .sort((a, b) => b.semanticRelevance - a.semanticRelevance);
        
    } catch (error) {
      console.warn('LLM filtering failed, using rule-based filtering:', error);
      return this.ruleBasedFiltering(results, intent);
    }
  }

  private async analyzeBatch(
    batch: NdlRecord[], 
    intent: SearchIntent
  ): Promise<FilteredResult[]> {
    
    const analysisPrompt = this.buildBatchAnalysisPrompt(batch, intent);
    
    try {
      const response = await this.llmClient!.generateCqlCandidates(analysisPrompt, { maxCandidates: 1 });
      
      if (response.length > 0) {
        return this.parseBatchAnalysis(batch, intent, response[0].explanation || '');
      }
    } catch (error) {
      console.warn('Batch analysis failed:', error);
    }
    
    return this.ruleBasedFiltering(batch, intent);
  }

  private buildBatchAnalysisPrompt(batch: NdlRecord[], intent: SearchIntent): string {
    const resultsText = batch.map((result, index) => 
      `${index + 1}. タイトル: "${result.title}"\n   著者: ${result.creators?.join(', ') || 'なし'}`
    ).join('\n\n');

    return `
検索意図に対する書籍の関連度を分析してください。

検索意図: "${intent.trueIntent}"
対象: ${intent.targetSubjects.join(', ')}
検索範囲: ${intent.searchScope}
時代背景: ${intent.temporalContext || 'なし'}
除外すべき概念: ${intent.excludeConcepts.join(', ')}

検索結果:
${resultsText}

各書籍について以下の形式で分析してください：

[番号]. 関連度: [0.0-1.0]
   判定理由: [なぜこの関連度なのか]
   内容分類: [primary-source/academic-study/biography/historical-context/tangential/irrelevant]
   品質指標: [学術性、信頼性などの品質要素]

重要: 検索意図と直接関連しない書籍（例：同名異人、無関係な生誕記念、フィクションなど）は低スコアにしてください。
`;
  }

  private parseBatchAnalysis(
    batch: NdlRecord[], 
    intent: SearchIntent, 
    analysis: string
  ): FilteredResult[] {
    
    const filteredResults: FilteredResult[] = [];
    
    // 各結果について分析結果をパース
    batch.forEach((record, index) => {
      const resultAnalysis = this.extractResultAnalysis(analysis, index + 1);
      
      const filteredResult: FilteredResult = {
        ...record,
        semanticRelevance: resultAnalysis.relevance,
        contentAnalysis: {
          isDirectlyRelated: resultAnalysis.relevance > 0.7,
          relevanceReason: resultAnalysis.reason,
          contentType: resultAnalysis.contentType,
          qualityIndicators: resultAnalysis.qualityIndicators
        }
      };
      
      filteredResults.push(filteredResult);
    });
    
    return filteredResults;
  }

  private extractResultAnalysis(analysis: string, index: number) {
    // LLM分析結果から個別の結果情報を抽出
    const pattern = new RegExp(`${index}\\.[\\s\\S]*?(?=${index + 1}\\.|$)`, 'g');
    const match = analysis.match(pattern);
    
    if (!match || match.length === 0) {
      return {
        relevance: 0.5,
        reason: '分析情報なし',
        contentType: 'tangential' as const,
        qualityIndicators: []
      };
    }
    
    const resultText = match[0];
    
    // 関連度抽出
    const relevanceMatch = resultText.match(/関連度:\s*([\d.]+)/);
    const relevance = relevanceMatch ? parseFloat(relevanceMatch[1]) : 0.5;
    
    // 判定理由抽出  
    const reasonMatch = resultText.match(/判定理由:\s*(.+)/);
    const reason = reasonMatch ? reasonMatch[1].trim() : '不明';
    
    // 内容分類抽出
    const typeMatch = resultText.match(/内容分類:\s*(\w+)/);
    const contentType = this.validateContentType(typeMatch ? typeMatch[1] : 'tangential');
    
    // 品質指標抽出
    const qualityMatch = resultText.match(/品質指標:\s*(.+)/);
    const qualityIndicators = qualityMatch ? 
      qualityMatch[1].split(',').map(q => q.trim()) : [];
    
    return {
      relevance,
      reason,
      contentType,
      qualityIndicators
    };
  }

  private validateContentType(type: string): FilteredResult['contentAnalysis']['contentType'] {
    const validTypes = ['primary-source', 'academic-study', 'biography', 'historical-context', 'tangential', 'irrelevant'];
    return validTypes.includes(type) ? type as any : 'tangential';
  }

  private ruleBasedFiltering(results: NdlRecord[], intent: SearchIntent): FilteredResult[] {
    // LLMが使用できない場合のルールベースフィルタリング
    return results.map(record => {
      const relevance = this.calculateRuleBasedRelevance(record, intent);
      
      return {
        ...record,
        semanticRelevance: relevance,
        contentAnalysis: {
          isDirectlyRelated: relevance > 0.7,
          relevanceReason: 'ルールベース判定',
          contentType: this.classifyByRules(record, intent),
          qualityIndicators: this.extractQualityIndicators(record)
        }
      };
    });
  }

  private calculateRuleBasedRelevance(record: NdlRecord, intent: SearchIntent): number {
    let score = 0.5; // ベーススコア
    
    const title = record.title.toLowerCase();
    
    // 対象人物/概念のマッチング
    for (const subject of intent.targetSubjects) {
      if (title.includes(subject.toLowerCase())) {
        score += 0.3;
        break;
      }
    }
    
    // 優先用語のマッチング
    for (const term of intent.priorityTerms) {
      if (title.includes(term.toLowerCase())) {
        score += 0.2;
        break;
      }
    }
    
    // 除外概念のペナルティ
    for (const exclude of intent.excludeConcepts) {
      if (title.includes(exclude.toLowerCase())) {
        score -= 0.4;
        break;
      }
    }
    
    // 検索範囲に応じたボーナス
    if (intent.searchScope === 'biography' && 
        (title.includes('伝記') || title.includes('生涯') || title.includes('伝'))) {
      score += 0.2;
    }
    
    return Math.max(0, Math.min(1, score));
  }

  private classifyByRules(record: NdlRecord, intent: SearchIntent): FilteredResult['contentAnalysis']['contentType'] {
    const title = record.title.toLowerCase();
    
    if (title.includes('史料') || title.includes('記録') || title.includes('文書')) {
      return 'primary-source';
    }
    if (title.includes('研究') || title.includes('論考') || title.includes('分析')) {
      return 'academic-study';
    }
    if (title.includes('伝記') || title.includes('生涯') || title.includes('人物')) {
      return 'biography';
    }
    if (title.includes('歴史') || title.includes('時代') || title.includes('背景')) {
      return 'historical-context';
    }
    
    return 'tangential';
  }

  private extractQualityIndicators(record: NdlRecord): string[] {
    const indicators: string[] = [];
    const title = record.title.toLowerCase();
    
    if (title.includes('大学')) indicators.push('学術機関');
    if (title.includes('研究')) indicators.push('研究書');
    if (title.includes('史料')) indicators.push('史料集');
    if (title.includes('全集') || title.includes('選集')) indicators.push('全集・選集');
    if (record.creators && record.creators.length > 1) indicators.push('共同研究');
    
    return indicators;
  }
}