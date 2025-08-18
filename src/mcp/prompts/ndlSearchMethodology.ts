import { Prompt } from '@modelcontextprotocol/sdk/types.js';

export const ndlSearchMethodologyPrompt: Prompt = {
  name: 'ndl_search_methodology',
  description: 'Advanced NDL search methodology and strategies based on real-world testing experience',
  arguments: [
    {
      name: 'focus_area',
      description: 'Specific methodology area (field_characteristics, cql_constraints, precision_techniques, common_failures)',
      required: false
    }
  ]
};

export function generateNDLSearchMethodology(focusArea?: string): string {
  const methodology = `
# NDL検索方法論 - 実践的戦略ガイド

## 🎯 Description検索を最優先に使用する理由

**Description検索は最も強力で実用的な検索手法です**

### Why Description Search is Primary:
1. **内容ベースの検索**: 本の実際の内容・テーマで検索できる
2. **柔軟性**: タイトルに含まれない関連書籍も発見できる
3. **実証済み効果**: これまでのテストで最も有用な結果を提供
4. **学術研究適合性**: 研究テーマから直接文献を発見可能

### Description検索の実践テクニック:

#### ✅ 高効果キーワード（実証済み）:
- \`"伝記"\` → 人物研究・biographical works
- \`"研究"\` → academic studies・学術論文
- \`"歴史"\` → historical works・史料
- \`"分析"\` → analytical works・解析書
- \`"文化"\` → cultural studies・文化研究
- \`"経済"\` → economic topics・経済関連
- \`"政治"\` → political studies・政治研究

#### 🔍 titleKeywordとの組み合わせ戦略:
\`\`\`
良い例:
description: "伝記", titleKeyword: "聖徳太子"
→ 聖徳太子に関する伝記的作品を特定

description: "経済", titleKeyword: "明治"  
→ 明治時代の経済に関する書籍を発見
\`\`\`

## 検索フィールドの特性と実際の動作

### 1. Description検索 (★最優先)
**実際の動作**: 書籍の内容説明・要約文内を検索
**CQL構文**: \`description="キーワード"\`
**特徴**:
- ✅ 最も豊富な検索結果
- ✅ 内容ベースの関連性
- ✅ タイトルに現れない関連書籍も発見
- ⚠️ キーワード選択が結果の質を決定

**実証例**:
\`\`\`
description="伝記" AND title="聖徳太子"
→ 聖徳太子の伝記作品 3件ヒット
→ 関連度の高い結果のみ
\`\`\`

### 2. Subject検索 (学術分類用)
**実際の動作**: NDLの公式主題分類で検索
**CQL構文**: \`subject="主題名"\`
**特徴**:
- ✅ 学術的に分類された正確な結果
- ✅ 専門分野の体系的収集に最適
- ❌ 分類されていない関連書籍は見逃す
- ❌ 検索語が分類名と完全一致する必要

**使用場面**: 特定の学術分野の体系的調査

### 3. Title検索 (補完用)
**実際の動作**: 書籍タイトル内のキーワード検索
**CQL構文**: \`title="キーワード"\`
**特徴**:
- ✅ 特定の作品・シリーズの発見
- ✅ 明確なタイトル要素がある場合に有効
- ❌ タイトルに現れない関連書籍は見逃す
- ❌ 最も限定的な検索範囲

**使用場面**: 特定作品の版や関連書籍の発見

## CQL構文の実際の制約と回避法

### ❌ 動作しない構文（実証済み）:
- \`any="キーワード"\` → 0件ヒット
- 複雑なOR組み合わせ → 無関係な結果大量ヒット
- 英語キーワード → 日本語資料では効果薄

### ✅ 確実に動作する構文（実証済み）:
- \`description="キーワード"\`
- \`subject="主題名"\`
- \`title="タイトル語"\`
- \`creator="著者名"\`
- \`publisher="出版社名"\`
- \`ndc="分類番号"\`

### AND組み合わせの効果的使用:
\`\`\`
description="研究" AND title="明治"
→ 明治に関する研究書を特定

subject="日本史" AND description="古代"
→ 古代日本史の学術書を発見
\`\`\`

## 検索精度を上げる実践テクニック

### 1. 段階的絞り込み戦略
\`\`\`
Step 1: description="broad_topic" (3-5件で試験)
Step 2: description="specific_topic" AND title="refining_keyword"
Step 3: 結果評価後、キーワード調整
\`\`\`

### 2. 日本語キーワード最適化
- ✅ 学術用語を使用: "研究"、"分析"、"考察"
- ✅ 分野専門語: "史学"、"文学"、"経済学"
- ❌ 口語的表現は避ける

### 3. maxRecords調整戦略
- 初回: 3-5件で関連性テスト
- 有効なら: 10-20件に拡大
- 無関係多数なら: キーワード見直し

## よくある失敗パターンと回避法

### ❌ 失敗パターン1: OR構文の乱用
**問題**: \`title="中国" OR title="明王朝" OR title="税制度"\`
**結果**: 23,406件の無関係な結果
**解決**: AND組み合わせで段階的絞り込み

### ❌ 失敗パターン2: 過度に具体的な検索
**問題**: \`description="中国明王朝の税制度改革"\`
**結果**: 0件ヒット
**解決**: \`description="税制度" AND title="明"\`

### ❌ 失敗パターン3: 英語キーワードの使用
**問題**: \`description="economy"\`
**結果**: 日本語資料では効果薄
**解決**: \`description="経済"\`

### ❌ 失敗パターン4: Subject検索への過度な依存
**問題**: 分類されていない関連書籍を見逃す
**解決**: Description検索を主軸に、Subject検索で補完

## 実証済み検索パターン

### パターン1: 人物研究
\`\`\`
1. description="伝記" AND title="人物名"
2. subject="人物名"  
3. title="人物名" (版や関連書確認)
\`\`\`

### パターン2: 歴史研究
\`\`\`
1. description="歴史" AND title="時代名"
2. subject="時代名" + "史"
3. description="研究" AND title="時代名"
\`\`\`

### パターン3: 文化研究
\`\`\`
1. description="文化" AND title="トピック"
2. description="研究" AND title="文化的要素"
3. subject="文化関連分類"
\`\`\`

## 検索効率最大化のための原則

1. **Description First**: 必ずdescription検索から開始
2. **Small Batch Testing**: 少数件で関連性確認
3. **Japanese Keywords**: 日本語学術用語を優先
4. **AND Logic**: OR構文は避け、AND組み合わせで絞り込み
5. **Iterative Refinement**: 結果を見てキーワード調整
`;

  const specificAreas: Record<string, string> = {
    field_characteristics: `
# 検索フィールド特性の詳細分析

## Description検索の詳細特性
- **検索対象**: 書籍の内容説明、要約、抄録
- **データ豊富度**: ★★★★★ (最も詳細な情報)
- **関連性精度**: ★★★★☆ (適切なキーワードで高精度)
- **網羅性**: ★★★★★ (タイトルに現れない関連書籍も発見)

## Subject検索の詳細特性
- **検索対象**: NDL公式主題分類
- **データ豊富度**: ★★★☆☆ (分類済み書籍のみ)
- **関連性精度**: ★★★★★ (分類が正確なら完全一致)
- **網羅性**: ★★☆☆☆ (未分類書籍は見逃す)

## Title検索の詳細特性
- **検索対象**: 書籍タイトル、副題
- **データ豊富度**: ★★☆☆☆ (タイトル情報のみ)
- **関連性精度**: ★★★☆☆ (タイトルとテーマの乖離あり)
- **網羅性**: ★☆☆☆☆ (最も限定的)
`,

    cql_constraints: `
# CQL構文制約の詳細解説

## 動作確認済みフィールド
- ✅ \`description=\` - 完全動作
- ✅ \`subject=\` - 完全動作  
- ✅ \`title=\` - 完全動作
- ✅ \`creator=\` - 完全動作
- ✅ \`publisher=\` - 完全動作
- ✅ \`ndc=\` - 完全動作

## 動作しないフィールド
- ❌ \`any=\` - 常に0件
- ❌ 複雑なネスト構造
- ❌ ワイルドカード検索

## AND/OR演算子の実際
- ✅ AND: 確実に動作、推奨
- ⚠️ OR: 動作するが結果精度低下
- ❌ NOT: 動作不安定
`,

    precision_techniques: `
# 検索精度向上テクニック

## キーワード選択戦略
1. **学術用語優先**: "研究" > "調べる"
2. **分野専門語**: "史学" > "歴史"  
3. **名詞形**: "分析" > "分析する"

## 組み合わせパターン
\`\`\`
高精度: description="専門用語" AND title="固有名詞"
中精度: subject="分野" AND description="テーマ"
低精度: title="一般語" OR description="曖昧語"
\`\`\`

## 結果数による判断
- 0件: キーワードが特殊すぎる
- 1-10件: 適切な絞り込み
- 11-50件: やや広すぎる  
- 51件以上: 絞り込み不足
`,

    common_failures: `
# よくある失敗と具体的解決策

## 失敗例1: 無関係大量ヒット
**症例**: "聖徳太子 生誕"で"コナン・ドイル生誕記念"がヒット
**原因**: OR論理による過度な拡張
**解決**: \`description="伝記" AND title="聖徳太子"\`

## 失敗例2: 0件ヒット
**症例**: 過度に具体的な検索語
**原因**: キーワードの詳細化しすぎ
**解決**: 段階的な一般化

## 失敗例3: 分野違いの結果
**症例**: 経済研究で文学作品がヒット
**原因**: キーワードの多義性
**解決**: 分野限定キーワード追加
`
  };

  if (focusArea && specificAreas[focusArea]) {
    return methodology + '\n\n' + specificAreas[focusArea];
  }

  return methodology;
}