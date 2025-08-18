import { Prompt } from '@modelcontextprotocol/sdk/types.js';

export const ndlSearchOptimizationPrompt: Prompt = {
  name: 'ndl_search_optimization',
  description: 'NDL search optimization guide for better results when combining multiple concepts',
  arguments: [
    {
      name: 'search_scenario',
      description: 'Type of search scenario (historical_research, cross_field, specific_topic)',
      required: false
    }
  ]
};

export function generateNDLSearchOptimization(scenario?: string): string {
  const optimizationGuide = `
# NDL検索最適化ガイド - 複数概念の効果的な組み合わせ

## 🚨 CRITICAL RULE: ALWAYS START WITH DESCRIPTION SEARCH

### 🥇 Rule #1: Try ndl_search_by_description FIRST for ALL topic searches

**Why Description Search is Best**:
- Finds books by CONTENT, not just title words
- Discovers books that DISCUSS your topic even if title doesn't mention it
- Most comprehensive and relevant results
- Works for 90% of research needs

### ケース1: 「明朝 + 税制」のような歴史的概念の組み合わせ

**❌ NEVER do this**:
- Using \`ndl_search_books\` for simple topics
- Using \`ndl_search_by_title\` for research topics  
- Using \`subject="明朝" AND subject="税制"\` → 0件（両方の主題を持つ書籍は稀）

**✅ CORRECT approach - Description First**:

#### Step 1: Description検索で内容重視 (MOST IMPORTANT)
\`\`\`
Tool: ndl_search_by_description
Parameters: {
  "description": "税制",
  "titleKeyword": "明",
  "maxRecords": 10
}
期待結果: 明時代の税制に関する内容を含む書籍
\`\`\`

#### Step 2: より具体的なキーワードで
\`\`\`
Tool: ndl_search_by_description  
Parameters: {
  "description": "租税",
  "titleKeyword": "明代",
  "maxRecords": 10
}
期待結果: 「明代」と「租税」の組み合わせ
\`\`\`

#### Step 3: Subject検索で範囲拡大（OR論理）
\`\`\`
Tool: ndl_search_by_subject
Parameters: {
  "subject": "明朝",
  "additionalSubject": "税制", 
  "maxRecords": 20
}
期待結果: 明朝関連書籍と税制関連書籍の両方（関連度順）
\`\`\`

#### Step 4: 包括的な自然言語検索
\`\`\`
Tool: ndl_search_books
Parameters: {
  "query": "明朝時代の税制度について研究したい",
  "searchMode": "intelligent",
  "maxRecords": 15
}
期待結果: AI解析による最適化された検索
\`\`\`

## 検索方法別の使い分け

### ndl_search_by_description（最も効果的）
**使用場面**: 内容ベースの検索
**メリット**: タイトルに現れない関連書籍も発見
**例**: \`description="税制", titleKeyword="中国"\`

### ndl_search_by_subject  
**使用場面**: 公式分類での体系的調査
**メリット**: 学術的に分類された正確な結果
**注意**: additionalSubjectはOR論理で範囲拡大

### ndl_search_by_title
**使用場面**: 特定の作品・時代名が明確
**メリット**: 精密な一致検索
**例**: \`title="明代", additionalTitle="経済"\`

### ndl_search_books（高度）
**使用場面**: 複雑な研究テーマ
**メリット**: AI解析による意図理解
**例**: \`query="戦国時代の経済政策の変遷"\`

## 🔍 実践的な検索パターン

### パターン1: 歴史 + 制度
**目標**: 「X時代のY制度」
\`\`\`
1. description="Y制度" AND title="X時代"
2. subject="X時代" OR subject="Y制度"  
3. query="X時代のY制度について"
\`\`\`

### パターン2: 地域 + テーマ
**目標**: 「A地域のBに関する研究」
\`\`\`
1. description="B" AND title="A"
2. subject="A地域史" OR subject="B研究"
3. query="A地域におけるBの研究"
\`\`\`

### パターン3: 人物 + 分野
**目標**: 「C人物のD分野での業績」
\`\`\`
1. description="D" AND title="C"
2. subject="C" OR subject="D史"
3. query="CのD分野における貢献"
\`\`\`

## ⚠️ よくある検索の落とし穴

### 落とし穴1: AND論理の過度な使用
**問題**: 複数のsubjectをANDで組み合わせ
**解決**: OR論理での範囲拡大後、関連度ソート

### 落とし穴2: 英語キーワードの使用
**問題**: 日本語資料に対する英語検索
**解決**: 日本語学術用語への変換

### 落とし穴3: 現代語での古典検索
**問題**: 現代用語で歴史資料を検索
**解決**: 時代適応語彙の使用

## 📊 検索品質の向上テクニック

### 1. キーワードの時代適応
- 現代: 「税制」→ 古典: 「租税」「税法」
- 現代: 「経済」→ 古典: 「財政」「商業」

### 2. 分野専門語の活用
- 一般: 「研究」→ 専門: 「考察」「史料」「論考」
- 一般: 「本」→ 専門: 「文献」「資料」「典籍」

### 3. 複数角度からのアプローチ
- 内容重視: description検索
- 分類重視: subject検索  
- タイトル重視: title検索
- 統合検索: books検索

## 🎯 検索成功のチェックリスト

- [ ] Description検索を最優先で試行
- [ ] AND/OR論理を適切に選択
- [ ] 日本語学術用語を使用
- [ ] 時代に適した語彙を選択
- [ ] 複数の検索手法を組み合わせ
- [ ] 結果の関連性を確認

## 具体例: 「明朝税制」検索の最適解

**最も効果的な順序**:
1. \`ndl_search_by_description(description="税制", titleKeyword="明")\`
2. \`ndl_search_by_description(description="租税", titleKeyword="明代")\`  
3. \`ndl_search_by_subject(subject="明朝", additionalSubject="税制")\`
4. \`ndl_search_books(query="明代中国の税制度研究")\`

この段階的アプローチにより、最も関連性の高い結果から広範囲な関連書籍まで、包括的に発見できます。
`;

  const specificScenarios: Record<string, string> = {
    historical_research: `
# 歴史研究特化ガイド

## 時代名 + 制度の検索戦略
1. **時代語彙の選択**: 「明朝」「明代」「明王朝」
2. **制度語彙の選択**: 「税制」「租税」「徴税」「財政」
3. **検索順序**: description → subject(OR) → books

## 効果的な組み合わせ例
- 明代 + 税制 → description="税制", title="明代"
- 江戸 + 商業 → description="商業", title="江戸"
- 平安 + 文化 → description="文化", title="平安"
`,

    cross_field: `
# 分野横断研究ガイド

## 複数分野の効果的な組み合わせ
1. **主分野を特定**: より具体的な分野を優先
2. **OR論理の活用**: subject検索で範囲拡大
3. **description優先**: 内容ベースの関連性重視

## 実践例
- 経済 + 歴史 → description="経済史"
- 文学 + 宗教 → description="文学", title="仏教"
- 政治 + 外交 → subject="政治史" OR subject="外交史"
`,

    specific_topic: `
# 特定テーマ深掘りガイド

## 専門研究での検索戦略
1. **専門用語の活用**: 学術的な正確な用語を使用
2. **段階的拡張**: 狭い検索から徐々に拡大
3. **複数角度検証**: 異なる検索方法で検証

## 深掘り手法
- Step 1: 最も具体的なキーワード
- Step 2: 関連分野への拡張
- Step 3: 上位概念での包括検索
- Step 4: 自然言語での意図確認
`
  };

  if (scenario && specificScenarios[scenario]) {
    return optimizationGuide + '\n\n' + specificScenarios[scenario];
  }

  return optimizationGuide;
}