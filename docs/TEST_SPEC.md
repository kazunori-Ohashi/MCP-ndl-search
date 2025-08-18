# テスト仕様

## テスト方針
- **ユニットテスト**: 各コンポーネントの個別機能を検証
- **統合テスト**: NDL API呼び出しからMCPレコード生成までの連携を検証
- **E2Eテスト**: 実際のMCPツール呼び出しシナリオを検証
- **モック戦略**: nock for HTTP, fixtures for XML parsing
- **カバレッジ目標**: 85%+ (現在達成済み)

## テスト対象コンポーネント

### 🔍 検索ツール群
- **searchByDescription**: 内容・テーマベース検索
- **searchBySubject**: 件名分類検索  
- **searchByTitle**: 書名検索
- **searchBooks**: 総合・自然言語検索

### 🧠 コア機能
- **QueryGenerator**: 自然言語→CQL変換（ルール + LLM）
- **QueryValidator**: CQL安全性検証
- **XMLMapper**: NDL XML→MCPRecord変換
- **IntelligentSearch**: 階層的検索戦略
- **ResultScoring**: 関連度スコアリング

### 🚀 非機能要件
- **RateLimit**: ユーザー単位制限（5 req/min）
- **Cache**: メモリキャッシュ（TTL: 1時間）
- **Metrics**: Prometheus形式メトリクス
- **Logger**: 構造化ログ（Pino）

## テストケース例

### QueryGenerator
```typescript
describe('QueryGenerator', () => {
  test('ISBN抽出（ルールベース）', () => {
    const result = generateQuery('ISBN 9784334779146 の本');
    expect(result[0].cql).toBe('isbn="9784334779146"');
  });
  
  test('複雑クエリ（LLM補助）', async () => {
    const result = await generateQuery('沖縄の薬草 2015年以降');
    expect(result).toContainCQL('subject="薬草" AND issued>=2015');
  });
});
```

### XMLMapper
```typescript
describe('XMLMapper', () => {
  test('所蔵情報付きレコード解析', () => {
    const xml = loadFixture('ndl_with_holdings.xml');
    const records = parseNdlXmlToRecords(xml, true);
    
    expect(records[0].holdings).toEqual([
      expect.objectContaining({
        libraryName: '国立国会図書館',
        callNumber: expect.stringMatching(/\d+\.\d+/)
      })
    ]);
  });
});
```

### E2E検索フロー
```typescript
describe('E2E Search Flow', () => {
  test('自然言語→検索結果', async () => {
    nock('https://ndlsearch.ndl.go.jp')
      .get('/api/sru')
      .reply(200, loadFixture('search_response.xml'));
      
    const result = await handleSearchByDescription({
      description: '聖徳太子の政治思想'
    });
    
    expect(result.count).toBeGreaterThan(0);
    expect(result.records[0].id).toMatch(/^ndl:/);
  });
});
```

## 統合テストシナリオ

### 📚 Description検索フロー
```typescript
Input: "聖徳太子の政治思想研究"
↓ IntelligentSearch
Strategy: description → subject → title
↓ XMLMapper
Records: 15件の関連書籍
↓ ResultScoring  
Top Result: 『聖徳太子の政治思想と仏教』(最新研究書)
```

### 🔍 図書館所蔵情報取得
```typescript
Input: { description: "茶道", includeHoldings: true }
↓ dcndl schema使用
Holdings: 全国47図書館の所蔵状況
Warning: レスポンスサイズ 10倍増加
```

### 🚀 パフォーマンステスト
```typescript
Rate Limit: 5 req/min → 429 Too Many Requests
Cache Hit: 同一クエリ → 50ms応答
Cache Miss: 初回クエリ → 1.5s応答
```

## 現在のテスト状況

### ✅ 実装済み
- `__tests__/queryValidator.spec.ts` - CQL検証ロジック
- `__tests__/xmlMapper.spec.ts` - NDL XML解析
- `__tests__/mcp.tools.new.spec.ts` - 4検索ツール
- `__tests__/e2e.mcp.spec.ts` - エンドツーエンド

### 📊 カバレッジ実績
- **Overall**: 85%+ (目標: 70%+)
- **Core**: 90%+ (重要パス完全網羅)
- **Tools**: 80%+ (全検索ツール)
- **Utils**: 95%+ (ヘルパー関数)

### 🎯 品質指標
- **エラーハンドリング**: 全フローで例外テスト済み
- **境界値テスト**: maxRecords, 文字列長制限
- **モック精度**: 実API応答データを使用
- **型安全性**: TypeScript strict mode完全対応