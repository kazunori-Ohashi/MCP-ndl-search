# 機能仕様: NDL ↔ MCP パイプライン

## モジュール一覧（API/関数シグネチャ）

### 1) QueryGenerator
- 入力: NaturalLanguageRequest
- 出力: SearchQueryCandidate[]
- 役割: テンプレートルール→（必要時）LLM呼び出し。最大3候補を返す。
- Note: 候補は { cql, confidence, explanation, generatedBy }

### 2) QueryValidator
- 入力: SearchQueryCandidate
- 出力: ValidatedQuery | ValidationError
- ルール: allowedFields only: title, creator, subject, isbn, issued, language
- 例外: wildcard length <= 3, cql length <= 1024, maxRecords <= 200

### 3) NDLConnector
- 関数: async searchNDL(params: NdlSearchParams): { rawXml, status, headers }
- HTTP: GET https://ndlsearch.ndl.go.jp/api/sru?operation=searchRetrieve&query=<CQL>&recordSchema=dcndl&maximumRecords=<N>
- リトライ: 3回(5xx) backoff: 200ms, 600ms, 1800ms

### 4) XmlParser / Mapper
- 関数: parseNdlXmlToRecords(rawXml: string): NdlRecord[]
- マッピングルールは MAPPER_RULES.md

### 5) MCPPublisher
- 関数: publishToMCP(records: MCPRecord[], opts): PublishResult
- バッチ上限: 50 レコード
- 認証: Bearer トークン対応