// 実際のCQL生成をテスト
function createSafeFallbackCql(query) {
  // クエリをキーワードに分解（助詞、句読点、スペースで分割）
  const keywords = query
    .trim()
    .split(/[\s\u3000、。，．！？の に を が は で と から まで について に関して について]+/)  // 助詞、句読点を含む
    .filter(keyword => keyword.length > 1)  // 1文字以下は除外
    .map(keyword => keyword.replace(/"/g, '\\"'))  // エスケープ
    .slice(0, 4);  // 最大4キーワードに制限

  console.log('キーワード分解結果:', keywords);

  if (keywords.length === 0) {
    return 'title="日本"';  // 最後の安全網
  }

  if (keywords.length === 1) {
    // 1キーワードの場合：titleで検索
    return `title="${keywords[0]}"`;
  }

  if (keywords.length === 2) {
    // 2キーワードの場合：両方をtitleで AND
    return `title="${keywords[0]}" AND title="${keywords[1]}"`;
  }

  // 3キーワード以上の場合：最初の2つをAND、残りをOR
  const primaryKeywords = keywords.slice(0, 2);
  const secondaryKeywords = keywords.slice(2);
  
  let cql = primaryKeywords.map(kw => `title="${kw}"`).join(' AND ');
  
  if (secondaryKeywords.length > 0) {
    const orConditions = secondaryKeywords.map(kw => `title="${kw}"`).join(' OR ');
    cql += ` AND (${orConditions})`;
  }
  
  return cql;
}

// テスト実行
const testQuery = "中国明王朝の税制度に関しての書籍を探して。";
console.log('入力クエリ:', testQuery);
const cql = createSafeFallbackCql(testQuery);
console.log('生成CQL:', cql);