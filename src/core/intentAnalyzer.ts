// LLMによる検索意図の深層解析
import type { LLMClient } from '../adapters/llm.types';

export interface SearchIntent {
  originalQuery: string;
  trueIntent: string;
  targetSubjects: string[];
  searchScope: 'biography' | 'historical-context' | 'academic-research' | 'primary-sources' | 'general';
  temporalContext?: string;
  excludeConcepts: string[];
  priorityTerms: string[];
  relationshipType: 'direct' | 'contextual' | 'comparative';
}

export class IntelligentIntentAnalyzer {
  
  constructor(private llmClient?: LLMClient) {}

  /**
   * LLMを使用して検索意図を深層解析
   */
  async analyzeSearchIntent(query: string): Promise<SearchIntent> {
    if (!this.llmClient) {
      // LLMが利用できない場合はルールベースフォールバック
      return this.ruleBasedAnalysis(query);
    }

    try {
      const analysisPrompt = this.buildAnalysisPrompt(query);
      const response = await this.llmClient.generateCqlCandidates(analysisPrompt, { maxCandidates: 1 });
      
      if (response.length > 0) {
        return this.parseIntentResponse(query, response[0].explanation || '');
      }
    } catch (error) {
      console.warn('LLM intent analysis failed, falling back to rules:', error);
    }

    return this.ruleBasedAnalysis(query);
  }

  private buildAnalysisPrompt(query: string): string {
    return `
ユーザーの検索クエリを分析し、真の検索意図を特定してください。

クエリ: "${query}"

以下の形式で回答してください：
- 真の意図: [ユーザーが本当に探している内容]
- 対象人物/概念: [主要な検索対象]
- 検索範囲: [biography/historical-context/academic-research/primary-sources/general]
- 時代背景: [関連する時代・期間]
- 除外概念: [検索結果から除外すべき無関係な概念]
- 優先用語: [検索に使用すべき専門用語・同義語]

例:
クエリ: "聖徳太子の生誕について知りたい"
→ 真の意図: 聖徳太子の生涯・伝記・歴史的背景に関する資料
→ 対象人物: 聖徳太子, 厩戸皇子, 上宮太子
→ 検索範囲: biography
→ 時代背景: 飛鳥時代, 6-7世紀
→ 除外概念: 現代の生誕記念, 他人物の生誕
→ 優先用語: 聖徳太子伝, 上宮聖徳法王帝説, 太子伝説
`;
  }

  private parseIntentResponse(originalQuery: string, response: string): SearchIntent {
    // LLMレスポンスをパースして構造化データに変換
    // 実装では正規表現やJSON解析を使用
    const intent: SearchIntent = {
      originalQuery,
      trueIntent: this.extractTrueIntent(response),
      targetSubjects: this.extractTargetSubjects(response),
      searchScope: this.extractSearchScope(response),
      temporalContext: this.extractTemporalContext(response),
      excludeConcepts: this.extractExcludeConcepts(response),
      priorityTerms: this.extractPriorityTerms(response),
      relationshipType: 'direct'
    };

    return intent;
  }

  private ruleBasedAnalysis(query: string): SearchIntent {
    // 既存のルールベース解析（フォールバック）
    const intent: SearchIntent = {
      originalQuery: query,
      trueIntent: query,
      targetSubjects: this.extractMainSubjects(query),
      searchScope: this.determineScope(query),
      excludeConcepts: this.getCommonNoiseTerms(),
      priorityTerms: this.expandSynonyms(query),
      relationshipType: 'direct'
    };

    return intent;
  }

  private extractMainSubjects(query: string): string[] {
    // 人物名や主要概念を抽出
    const subjects = [];
    
    if (query.includes('聖徳太子')) {
      subjects.push('聖徳太子', '厩戸皇子', '上宮太子');
    }
    
    if (query.includes('飛鳥時代')) {
      subjects.push('飛鳥時代', '推古朝', '蘇我氏');
    }
    
    // 他の主要人物・概念も同様に処理
    
    return subjects;
  }

  private determineScope(query: string): SearchIntent['searchScope'] {
    if (query.includes('生涯') || query.includes('伝記') || query.includes('生誕')) {
      return 'biography';
    }
    if (query.includes('歴史') || query.includes('背景') || query.includes('時代')) {
      return 'historical-context';
    }
    if (query.includes('研究') || query.includes('論文') || query.includes('学術')) {
      return 'academic-research';
    }
    if (query.includes('史料') || query.includes('原典') || query.includes('文献')) {
      return 'primary-sources';
    }
    return 'general';
  }

  private getCommonNoiseTerms(): string[] {
    return [
      '生誕記念', '記念日', '祭り', 'イベント', 'フィクション', 
      '漫画', 'アニメ', '小説', '現代', '現在'
    ];
  }

  private expandSynonyms(query: string): string[] {
    const synonyms = [];
    
    if (query.includes('聖徳太子')) {
      synonyms.push(
        '聖徳太子伝', '上宮聖徳法王帝説', '聖徳太子伝暦',
        '太子伝説', '聖徳太子憲法', '十七条憲法'
      );
    }
    
    return synonyms;
  }

  // LLMレスポンス解析用ヘルパーメソッド
  private extractTrueIntent(response: string): string {
    const match = response.match(/真の意図:\s*(.+)/);
    return match ? match[1].trim() : response;
  }

  private extractTargetSubjects(response: string): string[] {
    const match = response.match(/対象人物[^:]*:\s*(.+)/);
    return match ? match[1].split(',').map(s => s.trim()) : [];
  }

  private extractSearchScope(response: string): SearchIntent['searchScope'] {
    const match = response.match(/検索範囲:\s*(\w+)/);
    const scope = match ? match[1] : 'general';
    
    const validScopes = ['biography', 'historical-context', 'academic-research', 'primary-sources', 'general'];
    return validScopes.includes(scope) ? scope as SearchIntent['searchScope'] : 'general';
  }

  private extractTemporalContext(response: string): string | undefined {
    const match = response.match(/時代背景:\s*(.+)/);
    return match ? match[1].trim() : undefined;
  }

  private extractExcludeConcepts(response: string): string[] {
    const match = response.match(/除外概念:\s*(.+)/);
    return match ? match[1].split(',').map(s => s.trim()) : [];
  }

  private extractPriorityTerms(response: string): string[] {
    const match = response.match(/優先用語:\s*(.+)/);
    return match ? match[1].split(',').map(s => s.trim()) : [];
  }
}