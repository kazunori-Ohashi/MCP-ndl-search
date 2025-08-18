# QueryValidator ルール仕様

## ルール一覧（必ず実装）

### 1. フィールド制限
CQL で使用可能なフィールドは title, creator, subject, isbn, issued, language のみ。
- 他フィールドを使用している場合: DISALLOWED_FIELD

### 2. ワイルドカード制限
- '*' が含まれる場合、連続する星（例えば "*", "**"）は許可しない。部分一致は "word" all "word" などを推奨。
- 明示的 '*' の場合、ワイルドカード長は最大 3 文字相当の許容のみ。超える場合: WILDCARD_TOO_BROAD

### 3. OR 拡張ルール
- OR の分岐が10以上の条件を含む場合は POTENTIAL_DDOS（警告/拒否）

### 4. 長さ制限
- CQL 文字数 <= 1024 文字。超える場合: TOO_LONG

### 5. maximumRecords
- maxRecords <= 200。超える場合は 200 に切り下げか、ポリシーで拒否（実装で選択可能）。推奨は切り下げ。

### 6. シンタックス簡易チェック
- CQL の基本形（field=...）のパターンに合致しない場合 INVALID_SYNTAX

### 7. 出力
- 成功: ValidatedQuery { cql, maximumRecords }
- 失敗: ValidationError { code, message, details? }