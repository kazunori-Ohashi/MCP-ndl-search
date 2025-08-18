# NDL XML → MCPRecord マッピング仕様

## 基本フィールド対応表

| NDL XMLタグ | MCPRecord フィールド | 備考 |
|-------------|---------------------|------|
| `dcterms:identifier` (NDLBibID) | `identifiers.NDLBibID` | ID生成: `ndl:{NDLBibID}` |
| `dc:title` / `dcterms:title` | `title` | 書名（必須） |
| `dcterms:creator` / `dc:creator` | `creators[]` | 著者配列 |
| `dcterms:subject` / `dc:subject` | `subjects[]` | 件名配列 |
| `dcterms:issued` | `pub_date` | 出版年 |
| `dcterms:language` | `language` | 言語コード |

## 図書館所蔵情報マッピング

| NDL XMLタグ | LibraryHolding フィールド | 備考 |
|-------------|--------------------------|------|
| `dcndl:Item/dcndl:holdingAgent/foaf:Agent/foaf:name` | `libraryName` | 図書館名 |
| `dcndl:Item/dcndl:holdingAgent/foaf:Agent/dcterms:identifier` | `libraryCode` | NDL図書館コード |
| `dcndl:Item/dcndl:callNumber` | `callNumber` | 請求記号 |
| `dcndl:Item/dcndl:availability` | `availability` | 利用可否 |
| `dcndl:Item/dcterms:description` | `location`, `materialType` | 配架場所・資料種別 |
| `dcndl:Item/rdfs:seeAlso/@rdf:resource` | `opacUrl` | OPAC URL |

## 処理ルール詳細

### 1. ID生成ルール
```typescript
// NDLBibIDが存在する場合
id = `ndl:${ndlBibId}`

// 存在しない場合（稀）
id = `ndl:${uuidv4()}`
```

### 2. 著者名抽出ルール
```xml
<!-- パターン1: foaf:Agent構造 -->
<dcterms:creator>
  <foaf:Agent>
    <foaf:name>山田太郎</foaf:name>
  </foaf:Agent>
</dcterms:creator>

<!-- パターン2: 直接テキスト -->
<dcterms:creator>田中花子</dcterms:creator>
```

### 3. 件名処理ルール
- `dcterms:subject` と `dc:subject` 両方を処理
- 文字列型のみを配列に追加
- 重複除去処理

### 4. 図書館所蔵情報処理
- `includeHoldings: true` の場合のみ抽出
- `dcndl:Item` 要素を反復処理
- `dcterms:description` から配架場所・資料種別を正規表現で抽出

### 5. データ軽量化ルール
```typescript
// 除外対象（データ量削減のため）
- raw_record フィールド
- source.raw フィールド  
- rdfs:seeAlso 関連リンク情報
- dcterms:isPartOf 関連文献情報

// 残存フィールド
- 基本書誌情報（title, creators, subjects等）
- 図書館所蔵情報（オプトイン時のみ）
```

### 6. エラーハンドリング
- 必須フィールド（title）欠損時は null 返却
- XMLパースエラー時は警告ログ + 継続処理
- 単一レコードエラー時は他レコードの処理を継続

### 7. パフォーマンス最適化
- XML解析は xml2js 使用（explicitArray: false）
- 大容量XMLの段階的処理
- メモリ効率を考慮した構造設計