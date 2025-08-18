# XML→MCPマッピング規則

## フィールド対応表

| XMLタグ | MCP フィールド | 備考 |
|---------|---------------|------|
| dcterms:identifier (NDLBibID) | identifiers.NDLBibID | id = "ndl:{NDLBibID}" |
| dc:title / dcterms:title | title | |
| dcterms:creator / dc:creator | creators[] | テキスト or foaf:name |
| dcterms:issued | pub_date | |
| dcndl:publicationName | publicationName | |
| dcndl:pageRange | pageRange | |
| dcterms:publisher / foaf:name | publisher | |
| dcterms:language | language | |
| dcndl:materialType | subjects[] or type | |
| 書影があれば (image URL) | thumbnail_url / digital_object_url | |
| 全レコード | rawXml -> raw_record | |
| - | source | provider = 'NDL', retrieved_at = ISO timestamp |

## マッピング詳細

### ID生成
- NDLBibIDが存在する場合: `ndl:{NDLBibID}`
- 存在しない場合: UUID生成

### 著者名処理
- `foaf:name` が存在する場合はその値
- 直接テキストの場合はそのまま
- 配列として格納

### 日付処理
- `dcterms:issued` をISO8601形式に正規化

### ソース情報
- `provider`: 常に 'NDL'
- `retrieved_at`: マッピング実行時のISO timestamp
- `raw`: 元のXMLレコード全体