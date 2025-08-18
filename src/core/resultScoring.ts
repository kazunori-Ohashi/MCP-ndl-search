// 検索結果の品質スコアリングとランキング
import type { NdlRecord } from '../types/ndl';

export interface ScoredResult extends NdlRecord {
  relevanceScore: number;
  scoreBreakdown: {
    subjectMatch: number;
    titleMatch: number;
    creatorMatch: number;
    temporal: number;
    quality: number;
    language: number;
  };
}

export interface ScoringCriteria {
  query: string;
  searchIntent: {
    mainSubject: string;
    searchType: string;
    relatedTerms: string[];
    timeContext?: string;
  };
  usedStrategy: string;
}

export class ResultScoringEngine {
  
  // 品質指標となる出版社・機関
  private readonly qualityPublishers = new Set([
    '岩波書店', '中央公論新社', '筑摩書房', '講談社', '小学館',
    '東京大学出版会', '京都大学学術出版会', '名古屋大学出版会',
    '日本史研究会', '史学会', '国史学会', '古代学協会'
  ]);

  // 学術性の高いキーワード
  private readonly academicKeywords = new Set([
    '研究', '論考', '分析', '考察', '史料', '検討', '再考',
    '学会', '大学', '博士論文', '修士論文', '紀要'
  ]);

  /**
   * 検索結果をスコアリングしてランキング
   */
  scoreAndRankResults(
    results: NdlRecord[], 
    criteria: ScoringCriteria
  ): ScoredResult[] {
    const scoredResults = results.map(result => this.scoreResult(result, criteria));
    
    // スコア順にソート（降順）
    return scoredResults.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  private scoreResult(result: NdlRecord, criteria: ScoringCriteria): ScoredResult {
    const breakdown = {
      subjectMatch: this.calculateSubjectScore(result, criteria),
      titleMatch: this.calculateTitleScore(result, criteria),  
      creatorMatch: this.calculateCreatorScore(result, criteria),
      temporal: this.calculateTemporalScore(result, criteria),
      quality: this.calculateQualityScore(result, criteria),
      language: this.calculateLanguageScore(result, criteria)
    };

    // 重み付けして総合スコアを計算
    const relevanceScore = 
      breakdown.subjectMatch * 0.3 +     // 件名マッチ最重要
      breakdown.titleMatch * 0.25 +      // タイトルマッチ
      breakdown.creatorMatch * 0.1 +     // 著者マッチ
      breakdown.temporal * 0.15 +        // 時代的関連性
      breakdown.quality * 0.15 +         // 品質指標
      breakdown.language * 0.05;         // 言語優先度

    return {
      ...result,
      relevanceScore,
      scoreBreakdown: breakdown
    };
  }

  private calculateSubjectScore(result: NdlRecord, criteria: ScoringCriteria): number {
    // 件名情報が取得できていない場合は使用された戦略から推定
    let score = 0;
    
    // 件名検索で取得された場合は高スコア
    if (criteria.usedStrategy.includes('subject')) {
      score += 80;
    }
    
    // タイトルに主要被検索語が含まれているかチェック
    const title = result.title.toLowerCase();
    const mainSubject = criteria.searchIntent.mainSubject.toLowerCase();
    
    if (title.includes(mainSubject)) {
      score += 60;
    }
    
    // 関連語が含まれているかチェック
    for (const relatedTerm of criteria.searchIntent.relatedTerms) {
      if (title.includes(relatedTerm.toLowerCase())) {
        score += 30;
        break; // 最初の関連語のみカウント
      }
    }
    
    return Math.min(score, 100);
  }

  private calculateTitleScore(result: NdlRecord, criteria: ScoringCriteria): number {
    const title = result.title.toLowerCase();
    const query = criteria.query.toLowerCase();
    const mainSubject = criteria.searchIntent.mainSubject.toLowerCase();
    
    let score = 0;
    
    // 完全マッチ
    if (title.includes(query)) {
      score += 100;
    }
    // 主要被検索語マッチ
    else if (title.includes(mainSubject)) {
      score += 80;
    }
    // 部分マッチ
    else {
      const queryWords = query.split(/\s+/);
      let matches = 0;
      for (const word of queryWords) {
        if (word.length > 1 && title.includes(word)) {
          matches++;
        }
      }
      score = (matches / queryWords.length) * 60;
    }
    
    // 検索タイプに応じたボーナス
    if (criteria.searchIntent.searchType === 'biography' && 
        (title.includes('伝記') || title.includes('生涯') || title.includes('伝'))) {
      score += 20;
    }
    
    if (criteria.searchIntent.searchType === 'academic' && 
        this.containsAcademicKeywords(title)) {
      score += 15;
    }
    
    return Math.min(score, 100);
  }

  private calculateCreatorScore(result: NdlRecord, criteria: ScoringCriteria): number {
    if (!result.creators || result.creators.length === 0) {
      return 0;
    }
    
    let score = 0;
    const creators = result.creators.join(' ').toLowerCase();
    
    // 著名な研究者・専門家の判定（簡易版）
    if (creators.includes('大学') || creators.includes('教授') || creators.includes('博士')) {
      score += 30;
    }
    
    // 複数著者の場合は共同研究として評価
    if (result.creators.length > 1) {
      score += 10;
    }
    
    return score;
  }

  private calculateTemporalScore(result: NdlRecord, criteria: ScoringCriteria): number {
    let score = 50; // ベーススコア
    
    // 時代コンテキストがある場合
    if (criteria.searchIntent.timeContext) {
      const title = result.title.toLowerCase();
      const timeContext = criteria.searchIntent.timeContext.toLowerCase();
      
      if (title.includes(timeContext)) {
        score += 40;
      }
      
      // 関連する時代キーワード
      const timeKeywords = ['古代', '飛鳥', '奈良', '平安', '鎌倉', '室町', '江戸', '明治'];
      for (const keyword of timeKeywords) {
        if (title.includes(keyword)) {
          score += 20;
          break;
        }
      }
    }
    
    // 出版年による新しさの評価（実装時にdateフィールドを解析）
    if (result.date && typeof result.date === 'object' && result.date._) {
      const pubYear = parseInt(result.date._.split('-')[0]);
      if (pubYear >= 2000) {
        score += 20; // 比較的新しい研究
      } else if (pubYear >= 1990) {
        score += 10;
      }
    }
    
    return Math.min(score, 100);
  }

  private calculateQualityScore(result: NdlRecord, criteria: ScoringCriteria): number {
    let score = 30; // ベーススコア
    
    const title = result.title.toLowerCase();
    
    // 学術性の指標
    if (this.containsAcademicKeywords(title)) {
      score += 25;
    }
    
    // 出版社による品質判定（実装時にpublisher情報を取得）
    // 現在は簡易判定
    if (title.includes('大学') || title.includes('研究所') || title.includes('学会')) {
      score += 20;
    }
    
    // シリーズものや全集は信頼性が高い
    if (title.includes('全集') || title.includes('選集') || title.includes('大系')) {
      score += 15;
    }
    
    // 複数巻構成は詳細な研究
    if (title.match(/第?\d+[巻冊]/)) {
      score += 10;
    }
    
    return Math.min(score, 100);
  }

  private calculateLanguageScore(result: NdlRecord, criteria: ScoringCriteria): number {
    // 言語優先度: 日本語 > 中国語 > 英語 > その他
    if (!result.language) {
      return 50; // 不明の場合は中間スコア
    }
    
    switch (result.language) {
      case 'jpn': return 100;
      case 'chi': return 80;
      case 'eng': return 60;
      default: return 40;
    }
  }

  private containsAcademicKeywords(text: string): boolean {
    for (const keyword of this.academicKeywords) {
      if (text.includes(keyword)) {
        return true;
      }
    }
    return false;
  }

  /**
   * 重複結果の除去
   */
  deduplicateResults(results: ScoredResult[]): ScoredResult[] {
    const seen = new Set<string>();
    const deduplicated: ScoredResult[] = [];
    
    for (const result of results) {
      // タイトルの正規化による重複判定
      const normalizedTitle = this.normalizeTitle(result.title);
      
      if (!seen.has(normalizedTitle)) {
        seen.add(normalizedTitle);
        deduplicated.push(result);
      }
    }
    
    return deduplicated;
  }

  private normalizeTitle(title: string): string {
    return title
      .toLowerCase()
      .replace(/[「」『』（）()【】\[\]]/g, '') // 括弧除去
      .replace(/\s+/g, ' ') // 空白正規化
      .trim();
  }
}