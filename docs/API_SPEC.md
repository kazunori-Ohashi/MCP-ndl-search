# API仕様: 外部API契約

## NDL SRU (呼び出し)
GET https://ndlsearch.ndl.go.jp/api/sru

**Query params:**
- operation=searchRetrieve
- query=<CQL>                 (required)
- recordSchema=dcndl         (default)
- maximumRecords=<int>       (default 20, max 200)

**Response:**
- 200: XML (searchRetrieveResponse with record elements)
- 4xx/5xx: エラー応答。5xx は retry 対象。

## MCP Publish（内部サービス）
POST https://<MCP_HOST>/api/v1/publish

**Headers:**
- Content-Type: application/json
- Authorization: Bearer <token>  (optional)

**Body:**
```json
{ "records": [ /* MCPRecord[] */ ] }
```

**Responses:**
- 200: { success: true, results: [ { id, status: 201|200, message? } ] }
- 4xx/5xx: エラーメッセージ（詳細はエラーコード設計参照）

## エラーコード表（API返却）

- 400 INVALID_QUERY -> ValidationError (details)
- 404 NO_RECORDS -> NDL returned zero records
- 422 PUBLISH_FAILED -> MCP Publish returned error
- 429 RATE_LIMIT -> per-user rate exceeded
- 503 NDL_UNAVAILABLE -> NDL transient error (retry recommended)
- 500 INTERNAL_ERROR -> internal