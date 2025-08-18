# 要求仕様: NDL-MCP Pipeline

## 🎯 プロジェクト目的
Claude Desktop等のMCPクライアントが自然言語で「聖徳太子に関する最新の研究書を探して」といった要求をしたとき、インテリジェントな検索システムにより国立国会図書館から最適な書誌データを取得し、構造化された形式で提供する。

## 📋 実装済み機能要件

### 1. 🔍 多様な検索手法
- **searchByDescription**: 内容・テーマベース検索（最優先推奨）
- **searchBySubject**: 学術件名分類検索  
- **searchByTitle**: 書名・版情報検索
- **searchBooks**: 総合・自然言語検索（LLMベース）

### 2. 🧠 インテリジェント検索
- **QueryGenerator**: 自然言語→CQL変換（ルール + LLM補助）
- **QueryValidator**: CQL安全性検証・フィールド制限
- **IntelligentSearch**: 階層的検索戦略（description→subject→title）
- **ResultScoring**: 関連度・学術性・新しさによるスコアリング

### 3. 📚 データ処理・最適化
- **XMLMapper**: NDL XML→構造化MCPRecord変換
- **DataFormatter**: YAML/JSON出力フォーマット
- **Holdings Integration**: 図書館所蔵情報（オプトイン）
- **Data Reduction**: 95%+データ削減（raw_record除去等）

### 4. 🚀 非機能要件実装
- **Rate Limiting**: 5 req/min per user
- **Caching**: メモリキャッシュ（TTL: 1時間）
- **Metrics**: Prometheus形式メトリクス
- **Logging**: 構造化ログ（Pino）
- **Error Handling**: 指数バックオフリトライ

## 🎯 品質目標・達成状況

### パフォーマンス ✅
- **レスポンス時間**: < 2秒 (キャッシュヒット: < 50ms)
- **データ削減**: 95%+ (raw_record・関連リンク除去)
- **並行性**: 非同期処理・複数検索ツール並列実行

### 信頼性 ✅  
- **NDL API障害**: 指数バックオフ3回リトライ
- **Rate Limiting**: 5 req/min per user
- **エラーハンドリング**: 全レイヤーで例外処理
- **ログ監査**: 構造化ログ・メトリクス完備

### セキュリティ ✅
- **CQL検証**: allowedFields制限・インジェクション防止
- **入力サニタイズ**: 文字列長・ワイルドカード制限
- **API Key管理**: 環境変数・オプショナル設定

### テスト品質 ✅
- **カバレッジ**: 85%+ (目標: 70%+)
- **テスト種別**: Unit・Integration・E2E完備
- **CI/CD**: 型チェック・Lint・テスト自動実行

## 🚀 今後の拡張可能性

### 検索機能強化
- 全文検索・OCRテキスト検索
- 引用関係・関連文献ネットワーク
- 時系列分析・トレンド検出

### データソース拡張  
- 大学図書館・専門図書館API統合
- 国際的な書誌データベース連携
- オープンアクセス文献統合

### AI機能向上
- ベクトル検索・セマンティック検索
- 要約生成・キーワード抽出
- 推薦システム・パーソナライゼーション