# 要求仕様: NDL ↔ MCP パイプライン (TypeScript)

## 目的
MCP クライアントが自然言語で「こういう本が欲しい」と要求したとき、LLM を用いてその自然言語を NDL 検索用の CQL に変換し、NDL SRU から書誌データを取得して MCP に配信する。

## 機能要件（要点）
1. NL → 検索クエリ生成（QueryGenerator）
2. 生成クエリの検証（QueryValidator）
3. NDL SRU 呼び出し（NDLConnector）
4. XML パース → MCP レコードへの変換（Mapper）
5. MCP へのバッチ配信（MCPPublisher）
6. ロギング・監査（プロンプト/レスポンスの記録、ただし PII は赤字化）
7. テスト網羅：単体(70%+)・統合（エンドツーエンドシナリオ）

## 非機能要件
- レスポンス目標：オンデマンド検索 ~2s（ネットワーク変動含まず）  
- 耐障害性：NDL 5xx の場合は指数バックオフ 3回でエラーレポート  
- Rate limiting：ユーザ単位 5 req/min デフォルト  
- 安全：LLM生成CQLは必ず検証、実行前にログに残す