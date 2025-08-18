// 改良版CQL生成をテスト（ノイズワード除去＋意味的組み合わせ）
import axios from 'axios';

function createSafeFallbackCql(query) {
  const rawKeywords = query
    .trim()
    .split(/[\s\u3000、。，．！？の に を が は で と から まで について に関して について]+/)
    .filter(keyword => keyword.length > 1)
    .map(keyword => keyword.replace(/"/g, '\\"'));

  // ノイズワードを除去
  const noiseWords = ['書籍', '本', '資料', '文献', '研究', '論文', '探して', '検索', '調べ', 'について'];
  const keywords = rawKeywords.filter(kw => !noiseWords.includes(kw)).slice(0, 3);

  console.log(`元キーワード: [${rawKeywords.join(', ')}]`);
  console.log(`有効キーワード: [${keywords.join(', ')}]`);

  if (keywords.length === 0) {
    const firstKeyword = rawKeywords[0] || '日本';
    return `title="${firstKeyword}"`;
  }

  if (keywords.length === 1) {
    return `title="${keywords[0]}"`;
  }

  if (keywords.length === 2) {
    // 2キーワード：ANDで絞り込み
    return `title="${keywords[0]}" AND title="${keywords[1]}"`;
  }

  // 3キーワード：最初の2つをAND、3つめはOR
  return `title="${keywords[0]}" AND title="${keywords[1]}" OR title="${keywords[2]}"`;
}

async function testQuery(userInput) {
  console.log('\n=== テスト ===');
  console.log('入力:', userInput);
  
  const cql = createSafeFallbackCql(userInput);
  console.log('生成CQL:', cql);
  
  try {
    const response = await axios.get('https://ndlsearch.ndl.go.jp/api/sru', { 
      params: {
        operation: 'searchRetrieve',
        query: cql,
        recordSchema: 'dcndl',
        maximumRecords: 5
      },
      timeout: 10000
    });
    
    const xmlData = response.data;
    const numberOfRecordsMatch = xmlData.match(/<numberOfRecords>(\d+)<\/numberOfRecords>/);
    const numberOfRecords = numberOfRecordsMatch ? parseInt(numberOfRecordsMatch[1]) : 0;
    
    console.log('結果件数:', numberOfRecords);
    
    if (numberOfRecords > 0) {
      console.log('✅ ヒット！');
      
      const titleMatches = xmlData.match(/<dc:title[^>]*>([^<]+)<\/dc:title>/g);
      if (titleMatches) {
        console.log('\n見つかったタイトル:');
        titleMatches.slice(0, 3).forEach((match, i) => {
          const title = match.replace(/<[^>]+>/g, '');
          console.log(`${i + 1}. ${title}`);
        });
      }
    } else {
      console.log('❌ ヒットなし');
    }
    
  } catch (error) {
    console.error('エラー:', error.message);
  }
}

// 元のテストケース
await testQuery("中国明王朝の税制度に関しての書籍を探して");

// 追加テスト
await testQuery("沖縄の伝統医学について");
await testQuery("AI機械学習の研究論文");