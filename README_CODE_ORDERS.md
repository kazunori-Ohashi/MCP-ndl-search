# TDD開発手順書（コーディングLLMへの発注手順）

## 順序（TDDで進める）

### Phase 1: 基盤セットアップ
1. `CONTRACT_TYPES.ts` を作る（完了）
2. `package.json`, `tsconfig.json`, `jest.config.js` を作成

### Phase 2: コア機能（TDD）
3. `queryGenerator.spec.ts` のユニットテストを作る（cases: ISBN, NL->LLM candidate, dangerous wildcard）
4. `queryGenerator.ts` を実装（先に最簡単なテンプレート版。LLM呼び出しはインターフェースのみ実装してモック化）
5. `queryValidator.spec.ts` を作る（disallowed field, wildcard, length）
6. `queryValidator.ts` を実装

### Phase 3: 外部連携
7. nock を用いた `NDLConnector` のユニットテストを書く（200 OK, 5xx retry）
8. `NDLConnector` 実装
9. `Mapper` のユニットテスト (fixtures を使う)
10. `Mapper` 実装

### Phase 4: 配信・統合
11. `MCPPublisher` のユニットテスト（batching, auth header）
12. `MCPPublisher` 実装
13. `pipeline.integration.spec.ts` を作り E2E モックで PASS させる
14. `pipeline.ts` 実装

### Phase 5: 最終検証
15. 全テスト実行・カバレッジ確認
16. lint・typecheck実行
17. 実際のNDL API呼び出しテスト

## 重要な実装ガイド

### 依存注入（DI）
各実装は依存注入（DI）で LLM クライアント/HTTP クライアント/Publisher を渡せる形にし、テストではモック注入すること。

### テストモック例
```typescript
// テスト時のモック注入例
const pipeline = new Pipeline({
  llmClient: mockLLMClient,
  httpClient: mockHttpClient,
  publisher: mockPublisher
});
```

### エラーハンドリング
- 各モジュールは適切な例外を投げること
- リトライ処理は指数バックオフを実装
- ログ出力は構造化ログを使用

## テストデータ
- `fixtures/ndl_result_sample.xml` を活用
- LLMモックレスポンスは `config/LLM_PROMPT.json` の few_shot を参考
- 実際のNDL APIレスポンス（`ndl_result.xml`）も参考データとして活用

## 完了条件
- 全テストがPASS
- カバレッジ70%以上
- lint・typecheckエラーなし
- 実際のNDL API呼び出しが成功