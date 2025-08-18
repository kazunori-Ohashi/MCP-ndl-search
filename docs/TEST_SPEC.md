# テスト仕様（TDD向け）

## テスト方針
- まず QueryGenerator のユニットテストを書く（ルールパス + LLMモックパス）
- QueryValidator のユニットテストを完全網羅
- NDLConnector は HTTP を nock でモックして振る舞いを検証
- Mapper は fixtures/ndl_result_sample.xml を使い、期待 JSON を検証
- Integration: generate -> validate -> searchNDL (mocked) -> parse -> map -> publish (mocked) の E2E テスト

## ユニットテストケース（抜粋）

### QueryGenerator
1. ISBN抽出（ルールパス）
2. 複雑日本語 -> LLM候補パース
3. LLMモック応答の正常処理
4. LLMエラー時のフォールバック

### QueryValidator
1. disallowed field rejection
2. wildcard拒否
3. 長さ制限チェック
4. OR条件数制限
5. maximumRecords制限

### NDLConnector
1. 200 OK を受け rawXml が返る
2. 5xx を 3回 retry して最終失敗時に例外
3. レート制限処理
4. タイムアウト処理

### Mapper
1. fixtures の N レコードが正しく MCPRecord[] へ変換
2. 必須フィールドの欠損処理
3. 複数著者の配列化
4. 日付フォーマット正規化

### MCPPublisher
1. バッチ上限50を超えると分割して送信
2. 認証ヘッダーの正常付与
3. リトライ処理
4. エラーレスポンス処理

## Integration case (実例)
- Input: "遠州 月刊茶道誌 2020年"
- LLM Mock returns: [{ cql: 'publicationName="遠州" AND issued=2020-06', confidence:0.9 }]
- NDL SRU mock returns fixtures/ndl_result_sample.xml (contains 3 records)
- Expect: publishToMCP called with 3 MCPRecords; each record.id startsWith 'ndl:'

## カバレッジ目標
- Unit tests: 70%+
- Integration tests: 主要パス網羅
- E2E tests: 実際のAPI呼び出しシナリオ