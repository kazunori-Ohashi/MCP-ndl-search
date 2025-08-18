# NDL MCP サーバー利用ガイド

## 🚀 Claude Desktop での利用方法

### 1. 設定完了の確認

Claude Desktop設定ファイルが正しく配置されていることを確認：
```bash
cat ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

### 2. Claude Desktop再起動

設定ファイルを変更した後は、Claude Desktopを完全に再起動してください：
1. Claude Desktopを終了（Cmd+Q）
2. Claude Desktopを再度起動

### 3. MCP接続確認

Claude Desktopで新しい会話を開始し、以下のいずれかを確認：
- 画面下部に「🔧」アイコン（MCP Tools）が表示される
- 「Available tools: ndl-search」のような表示が出る

## 🔧 利用可能なツール

### `ndl_search_books` - 自然言語検索
```
「沖縄の薬草に関する2015年以降の書籍を3冊検索して」
```

**パラメータ:**
- `query`: 自然言語検索クエリ
- `maxRecords`: 最大件数（1-200、既定20）
- `preferLanguage`: 優先言語（既定"jpn"）
- `publishToMcp`: MCP配信するか（既定true）

### `ndl_sru_search` - CQL直接検索
```
「CQLクエリ 'isbn=9784334779146' で1件検索して」
```

**パラメータ:**
- `cql`: CQLクエリ文字列
- `maximumRecords`: 最大件数（1-200、既定20）
- `startRecord`: 開始位置（1ベース、既定1）
- `format`: 応答形式（既定"dcndl"）

## 📝 使用例

### 例1: 自然言語検索
```
「遠州流茶道の月刊誌について、2020年以降の資料を5冊検索してください」
```

### 例2: ISBN検索
```
「ISBN 9784334779146 の書籍情報を検索してください」
```

### 例3: 専門的なCQL検索
```
「CQLクエリ 'subject="茶道" AND issued>=2020 AND language="jpn"' で10件検索してください」
```

## 🛠️ トラブルシューティング

### MCPツールが表示されない場合

1. **設定ファイル確認**
   ```bash
   cat ~/Library/Application\ Support/Claude/claude_desktop_config.json
   ```

2. **プロジェクトパス確認**
   ```bash
   pwd  # /Users/kaz005/ndl であることを確認
   ```

3. **依存関係確認**
   ```bash
   cd /Users/kaz005/ndl
   npm install
   npm test
   ```

4. **Claude Desktop完全再起動**
   - Activity Monitor で Claude Desktop プロセスを終了
   - 再度起動

### エラーログ確認

Claude Desktop のコンソールログを確認：
```bash
log show --predicate 'process == "Claude"' --info --last 10m
```

### よくあるエラーと対処法

**1. `ENOENT: no such file or directory, open '//package.json'`**

原因：作業ディレクトリ未指定・npm経由でpackage.jsonを探索するため。
対処：npm完全排除・cwd固定・stdout汚染ゼロのシェルラッパ使用：
```json
{
  "mcpServers": {
    "ndl-search": {
      "command": "/Users/kaz005/ndl/.mcp/run.sh"
    }
  }
}
```

シェルラッパ（`/Users/kaz005/ndl/.mcp/run.sh`）:
```bash
#!/usr/bin/env bash
set -euo pipefail
cd /Users/kaz005/ndl
exec ./node_modules/.bin/tsx src/cli/mcp.ts
```

**2. `Unexpected token 'N' ... not valid JSON`**

原因：MCPサーバーが標準出力にJSON以外の文字列を出力（例：nvmの"Now using..."）。
対処：npmの--silentフラグ追加、ランチャースクリプトは標準エラー出力のみ使用。

**3. `tsx not found` または TypeScript エラー**

プロジェクトをビルドしてください：
```bash
cd /Users/kaz005/ndl
npm run build
npm test
```

**4. 動作確認ポイント**

正常起動時、Claude Desktop の stderr ログに以下が表示：
- `NDL MCP Server started on stdio`
- `Environment: development`
- `Available tools: ndl_search_books, ndl_sru_search`

## 🔑 OpenAI API キー設定（オプション）

実際のLLM機能を使用する場合は、設定ファイルの `OPENAI_API_KEY` を実際のキーに変更：

```json
{
  "mcpServers": {
    "ndl-search": {
      "env": {
        "OPENAI_API_KEY": "sk-your-actual-openai-api-key-here"
      }
    }
  }
}
```

## 📊 期待される動作

- **検索結果**: `{count: number, records: NdlRecord[]}` 形式
- **レコードID**: すべて `ndl:` プレフィックス付き
- **言語優先**: `preferLanguage="jpn"` で日本語文献が優先表示
- **エラーハンドリング**: 検索失敗時は適切なエラーメッセージを表示

## 🎯 成功確認

正常に動作している場合：
1. Claude Desktopでツールアイコンが表示される
2. 自然言語でNDL検索が実行できる
3. 検索結果が構造化された形式で返される
4. 日本語の書籍情報が適切に表示される