// 多角的検索戦略エンジン
export interface SearchIntent {
  mainSubject: string;
  searchType: 'biography' | 'historical' | 'academic' | 'general';
  timeContext?: string;
  relatedTerms: string[];
  excludeTerms?: string[];
}

export interface CQLCandidate {
  cql: string;
  priority: number;
  strategy: string;
  expectedRelevance: number;
}

export class AdvancedSearchStrategy {
  
  // 専門用語辞書
  private readonly specialTerms = new Map([
    ['聖徳太子', ['太子伝説', '厩戸皇子', '上宮太子', '聖徳太子伝暦']],
    ['飛鳥時代', ['推古朝', '蘇我氏', '物部氏']],
    ['仏教伝来', ['百済', '蘇我馬子', '物部守屋']],
    ['古代史', ['記紀', '日本書紀', '古事記']],
  ]);

  // NDC分類マッピング
  private readonly ndcMapping = new Map([
    ['日本史', '210'],
    ['古代史', '210.3'],
    ['仏教史', '180'],
    ['伝記', '280'],
    ['文学', '910'],
  ]);

  // ノイズワード（検索から除外）
  private readonly noiseWords = [
    '書籍', '本', '資料', '文献', '探して', '検索', '調べ', 'について', '関して', 
    '研究', '論文', '記事', '情報'
  ];

  /**
   * 自然言語クエリから検索意図を解析
   */
  analyzeSearchIntent(query: string): SearchIntent {
    const cleanQuery = query.trim();
    
    // 主要被検索語を抽出
    const mainSubject = this.extractMainSubject(cleanQuery);
    
    // 検索タイプを判定
    const searchType = this.determineSearchType(cleanQuery);
    
    // 関連語を展開
    const relatedTerms = this.expandRelatedTerms(mainSubject);
    
    // 時代背景を抽出
    const timeContext = this.extractTimeContext(cleanQuery);
    
    return {
      mainSubject,
      searchType,
      timeContext,
      relatedTerms
    };
  }

  /**
   * 検索意図から階層的CQL候補を生成
   */
  generateCQLCandidates(intent: SearchIntent): CQLCandidate[] {
    const candidates: CQLCandidate[] = [];
    
    // Phase 1: 高精度検索（subject中心）
    candidates.push(...this.generateSubjectBasedQueries(intent));
    
    // Phase 2: 補完検索（title + description）
    candidates.push(...this.generateTitleDescriptionQueries(intent));
    
    // Phase 3: 分類検索（NDC + title）
    candidates.push(...this.generateClassificationQueries(intent));
    
    // Phase 4: 関連文献検索
    candidates.push(...this.generateRelatedLiteratureQueries(intent));
    
    // 優先度順にソート
    return candidates.sort((a, b) => b.priority - a.priority);
  }

  private extractMainSubject(query: string): string {
    // ノイズワードを除去してメイン被検索語を特定
    const words = query.split(/[\s\u3000、。，．！？の に を が は で と から まで について に関して について]+/)
      .filter(word => word.length > 1 && !this.noiseWords.includes(word));
    
    return words[0] || '日本';
  }

  private determineSearchType(query: string): SearchIntent['searchType'] {
    if (query.includes('生涯') || query.includes('伝記') || query.includes('人生')) {
      return 'biography';
    }
    if (query.includes('歴史') || query.includes('時代') || query.includes('背景')) {
      return 'historical';  
    }
    if (query.includes('研究') || query.includes('学術') || query.includes('論文')) {
      return 'academic';
    }
    return 'general';
  }

  private expandRelatedTerms(mainSubject: string): string[] {
    return this.specialTerms.get(mainSubject) || [];
  }

  private extractTimeContext(query: string): string | undefined {
    const timePatterns = [
      { pattern: /飛鳥時代/, context: '飛鳥時代' },
      { pattern: /古代/, context: '古代史' },
      { pattern: /推古/, context: '推古朝' },
      { pattern: /七世紀/, context: '7世紀' }
    ];
    
    for (const { pattern, context } of timePatterns) {
      if (pattern.test(query)) {
        return context;
      }
    }
    return undefined;
  }

  private generateSubjectBasedQueries(intent: SearchIntent): CQLCandidate[] {
    const queries: CQLCandidate[] = [];
    
    // メイン被検索語での件名検索
    queries.push({
      cql: `subject="${intent.mainSubject}"`,
      priority: 100,
      strategy: 'subject-primary',
      expectedRelevance: 0.9
    });

    // 関連語での件名検索
    intent.relatedTerms.forEach(term => {
      queries.push({
        cql: `subject="${term}"`,
        priority: 90,
        strategy: 'subject-related',
        expectedRelevance: 0.8
      });
    });

    // 時代背景との組み合わせ
    if (intent.timeContext) {
      queries.push({
        cql: `subject="${intent.mainSubject}" AND subject="${intent.timeContext}"`,
        priority: 85,
        strategy: 'subject-temporal',
        expectedRelevance: 0.85
      });
    }

    return queries;
  }

  private generateTitleDescriptionQueries(intent: SearchIntent): CQLCandidate[] {
    const queries: CQLCandidate[] = [];
    
    // 検索タイプ別のdescription検索
    const descriptionTerms = this.getDescriptionTerms(intent.searchType);
    
    descriptionTerms.forEach(term => {
      queries.push({
        cql: `title="${intent.mainSubject}" AND description="${term}"`,
        priority: 70,
        strategy: 'title-description',
        expectedRelevance: 0.7
      });
    });

    // タイトル＋件名組み合わせ
    queries.push({
      cql: `title="${intent.mainSubject}" AND subject="${this.getSubjectByType(intent.searchType)}"`,
      priority: 75,
      strategy: 'title-subject',
      expectedRelevance: 0.75
    });

    return queries;
  }

  private generateClassificationQueries(intent: SearchIntent): CQLCandidate[] {
    const queries: CQLCandidate[] = [];
    
    // NDC分類との組み合わせ
    const relevantNDC = this.getRelevantNDC(intent);
    
    relevantNDC.forEach(ndc => {
      queries.push({
        cql: `ndc="${ndc}" AND title="${intent.mainSubject}"`,
        priority: 60,
        strategy: 'ndc-classification',
        expectedRelevance: 0.65
      });
    });

    return queries;
  }

  private generateRelatedLiteratureQueries(intent: SearchIntent): CQLCandidate[] {
    const queries: CQLCandidate[] = [];
    
    // 専門文献名での直接検索
    intent.relatedTerms.forEach(term => {
      queries.push({
        cql: `title="${term}"`,
        priority: 80,
        strategy: 'literature-direct',
        expectedRelevance: 0.9
      });
    });

    return queries;
  }

  private getDescriptionTerms(searchType: SearchIntent['searchType']): string[] {
    switch (searchType) {
      case 'biography': return ['伝記', '生涯', '人生', '事跡'];
      case 'historical': return ['歴史', '史実', '背景', '時代'];
      case 'academic': return ['研究', '論考', '分析', '考察'];
      default: return ['概説', '入門', '解説'];
    }
  }

  private getSubjectByType(searchType: SearchIntent['searchType']): string {
    switch (searchType) {
      case 'biography': return '伝記';
      case 'historical': return '歴史';
      case 'academic': return '研究';
      default: return '日本史';
    }
  }

  private getRelevantNDC(intent: SearchIntent): string[] {
    const ndcCodes: string[] = [];
    
    // 基本分類
    if (intent.searchType === 'biography') {
      ndcCodes.push('280'); // 伝記
    }
    
    // 歴史分類
    ndcCodes.push('210'); // 日本史
    
    // 時代別分類
    if (intent.timeContext === '古代史') {
      ndcCodes.push('210.3');
    }
    
    return ndcCodes;
  }
}