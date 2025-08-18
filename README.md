# NDL-MCP Pipeline

**National Diet Library Model Context Protocol Integration**

自然言語での書籍検索を可能にするMCPサーバー。国立国会図書館（NDL）の書誌データベースと Claude Desktop を繋ぎ、直感的な日本語クエリで学術資料を検索できます。

## 🎯 主な特徴

- **自然言語検索**: 「沖縄の薬草に関する2015年以降の書籍」のような自然な表現で検索
- **階層的検索システム**: ルールベース検索 + オプションでLLM強化（OpenAI API Key設定時）
- **図書館所蔵情報**: オプションで全国の図書館の所蔵状況を取得
- **多様な検索手法**: タイトル・件名・内容説明・著者での検索をサポート
- **データ最適化**: 95%以上のデータ削減で高速レスポンス
- **Claude Desktop統合**: MCP プロトコルによるシームレスなAI統合
- **LLMオプショナル**: OpenAI API未設定でもルールベース検索で完全動作

## 🚀 クイックスタート

### 1. インストール

```bash
git clone <repository-url>
cd ndl
npm install
npm run build
```

### 2. Claude Desktop設定

Claude Desktop設定ファイルを更新：

```json
{
  "mcpServers": {
    "ndl-search": {
      "command": "/path/to/ndl/.mcp/run.sh",
      "env": {
        "OPENAI_API_KEY": "sk-your-key-here"
      }
    }
  }
}
```

### 3. 使用開始

Claude Desktopを再起動後、以下のように検索できます：

```
「聖徳太子に関する最新の研究書を5冊教えて」
「源氏物語の現代語訳で、角川書店から出版されたものを探して」
「茶道の月刊誌、2020年以降のものでお茶の水女子大学に所蔵されているものは？」
```

## 🔧 利用可能なツール

### `ndl_search_by_description` (推奨)
内容・テーマベースの検索。最も関連性の高い結果を返します。

```typescript
{
  description: "聖徳太子の政治思想と仏教的世界観の関係性",
  titleKeyword: "聖徳太子", // オプション
  maxRecords: 20,
  includeHoldings: false // 図書館所蔵情報を含めるか
}
```

### `ndl_search_by_subject`
学術的な件名分類による検索。

```typescript
{
  subject: "日本史",
  additionalSubject: "飛鳥時代", // オプション
  maxRecords: 20,
  includeHoldings: false
}
```

### `ndl_search_by_title`
書名による検索。特定の本や版を探す際に最適。

```typescript
{
  title: "源氏物語",
  additionalTitle: "現代語訳", // オプション
  maxRecords: 20,
  includeHoldings: false
}
```

### `ndl_search_books`
総合検索。自然言語クエリをLLMで最適化。

```typescript
{
  query: "沖縄の薬草に関する2015年以降の書籍",
  maxRecords: 20,
  preferLanguage: "jpn",
  includeHoldings: false
}
```

## 📊 検索結果フォーマット

```typescript
{
  count: number,
  records: [
    {
      id: "ndl:023456789",
      title: "聖徳太子の政治思想",
      creators: ["山田太郎", "田中花子"],
      subjects: ["日本史", "古代史", "政治思想"],
      pub_date: "2023",
      identifiers: { NDLBibID: "023456789" },
      holdings?: [  // includeHoldings: true の場合のみ
        {
          libraryName: "国立国会図書館",
          libraryCode: "NDL",
          callNumber: "210.3/Y19",
          availability: "利用可",
          location: "本館一般資料室",
          opacUrl: "https://..."
        }
      ]
    }
  ],
  query: "subject=\"聖徳太子\"",
  formatted_records?: string  // output_format指定時
}
```

## 🎛️ 高度な機能

### 図書館所蔵情報

`includeHoldings: true` で全国の図書館の所蔵状況を取得：

```typescript
// 注意：レスポンスサイズが大幅に増加します
await searchByDescription({
  description: "量子コンピューティング",
  includeHoldings: true
});
```

### 出力フォーマット

結果をYAMLやJSONで整形：

```typescript
{
  description: "茶道の歴史",
  output_format: "yaml",  // または "json"
  maxRecords: 10
}
```

### ランキングアルゴリズム

検索結果は以下の要素でスコアリング：

- **関連度**: 検索語との一致度
- **学術性**: 研究書・論文集の優遇
- **新しさ**: 発行年による重み付け
- **網羅性**: 全集・選集の優遇

## 🏗️ アーキテクチャ

```
自然言語クエリ
    ↓
QueryGenerator (LLM最適化)
    ↓
QueryValidator (安全性チェック)
    ↓
NDLConnector (SRU API)
    ↓
XMLMapper (データ変換)
    ↓
IntelligentFilter (スコアリング)
    ↓
MCPPublisher (Claude Desktop)
```

### 主要コンポーネント

- **QueryGenerator**: 自然言語→CQL変換
- **IntelligentSearch**: 階層的検索戦略
- **XMLMapper**: NDL XML→構造化データ
- **RateLimit/Cache**: パフォーマンス最適化
- **DataFormatter**: 出力フォーマット変換

## 🧪 テスト

```bash
# 全テスト実行
npm test

# カバレッジ付きテスト
npm run test:coverage

# E2Eテスト
npm run test:e2e

# 型チェック
npm run typecheck

# Lint
npm run lint
```

テストカバレッジ: **85%+** (ターゲット: 70%+)

## 🚦 開発サーバー

### MCPサーバーモード

```bash
npm run mcp:server
```

### HTTPサーバーモード

```bash
npm run http:server
# http://localhost:3000 でREST API利用可能
```

### 開発モード

```bash
npm run dev  # ホットリロード付き
```

## 📈 監視・メトリクス

### ヘルスチェック

```bash
curl http://localhost:3000/healthz
curl http://localhost:3000/readyz
```

### メトリクス

```bash
curl http://localhost:3000/metrics  # Prometheus形式
```

### ログレベル

```bash
export LOG_LEVEL=debug  # debug, info, warn, error
```

## 🔧 設定

### 環境変数

```bash
# OpenAI API (オプション - 未設定時はルールベース)
OPENAI_API_KEY=sk-your-key-here

# ログレベル
LOG_LEVEL=info

# キャッシュ設定
CACHE_TTL_SECONDS=3600
CACHE_MAX_ITEMS=1000

# レート制限
RATE_LIMIT_REQUESTS=5
RATE_LIMIT_WINDOW_MINUTES=1
```

### カスタマイズ可能な設定

- CQLクエリ生成ルール (`config/LLM_PROMPT.json`)
- XMLマッピングルール (`docs/MAPPER_RULES.md`)
- バリデーションルール (`docs/VALIDATOR_RULES.md`)

## 🛠️ トラブルシューティング

### よくある問題

**1. MCPツールが表示されない**
```bash
# Claude Desktop設定確認
cat ~/Library/Application\ Support/Claude/claude_desktop_config.json

# プロジェクトパス確認
pwd  # /Users/kaz005/ndl

# Claude Desktop再起動
```

**2. 検索結果が0件**
```bash
# より広範な検索語を試す
"description" → "subject" → "title" の順で範囲を狭める
```

**3. レスポンスが遅い**
```bash
# キャッシュクリア
npm run cache:clear

# 図書館所蔵情報を無効化
includeHoldings: false
```

詳細なトラブルシューティング: [README-MCP-SETUP.md](./README-MCP-SETUP.md)

## 📚 関連ドキュメント

- [機能仕様](./docs/FUNC_SPEC.md)
- [API仕様](./docs/API_SPEC.md)
- [テスト仕様](./docs/TEST_SPEC.md)
- [マッピングルール](./docs/MAPPER_RULES.md)
- [MCP設定ガイド](./README-MCP-SETUP.md)

## 🤝 コントリビューション

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

### 開発ガイドライン

- TDD (Test-Driven Development) 推奨
- カバレッジ 70%+ 必須
- TypeScript strict mode
- ESLint + Prettier

## 📄 ライセンス

MIT License - 詳細は [LICENSE](./LICENSE) ファイルを参照

## 🙏 謝辞

- [国立国会図書館](https://www.ndl.go.jp/) - SRU API提供
- [Model Context Protocol](https://modelcontextprotocol.io/) - 仕様策定
- [Anthropic](https://www.anthropic.com/) - Claude Desktop統合

## 📞 サポート

問題や質問がある場合は [Issues](https://github.com/your-repo/ndl-mcp-pipeline/issues) で報告してください。

---

**Version**: 1.0.0  
**Node.js**: 20.x+  
**TypeScript**: 5.2+  
**License**: MIT