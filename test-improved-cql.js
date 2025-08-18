// 改良版CQL生成をテスト
import axios from 'axios';

function createSafeFallbackCql(query) {
  const keywords = query
    .trim()
    .split(/[\s\u3000、。，．！？の に を が は で と から まで について に関して について]+/)
    .filter(keyword => keyword.length > 1)
    .map(keyword => keyword.replace(/"/g, '\\"'))
    .slice(0, 4);

  console.log('キーワード分解:', keywords);

  if (keywords.length === 0) {
    return 'title="日本"';
  }

  if (keywords.length === 1) {
    return `title="${keywords[0]}"`;
  }

  if (keywords.length === 2) {
    // 2キーワードの場合：titleで OR（ANDだと絞りすぎる）
    return `title="${keywords[0]}" OR title="${keywords[1]}"`;
  }

  // 3キーワード以上の場合：ORで繋いで幅広く検索
  return keywords.map(kw => `title="${kw}"`).join(' OR ');
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

// 複数パターンでテスト
await testQuery("中国明王朝の税制度に関しての書籍を探して");
await testQuery("AI機械学習の入門書");
await testQuery("沖縄の伝統医学");