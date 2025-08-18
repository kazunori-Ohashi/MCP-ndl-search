// 実際に生成されるCQLでNDL APIテスト
import axios from 'axios';

// 実際のフォールバック関数と同じロジック
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
    return `title="${keywords[0]}" AND title="${keywords[1]}"`;
  }

  const primaryKeywords = keywords.slice(0, 2);
  const secondaryKeywords = keywords.slice(2);
  
  let cql = primaryKeywords.map(kw => `title="${kw}"`).join(' AND ');
  
  if (secondaryKeywords.length > 0) {
    const orConditions = secondaryKeywords.map(kw => `title="${kw}"`).join(' OR ');
    cql += ` AND (${orConditions})`;
  }
  
  return cql;
}

async function testActualQuery() {
  const userInput = "中国明王朝の税制度に関しての書籍を探して";
  console.log('ユーザー入力:', userInput);
  
  const generatedCql = createSafeFallbackCql(userInput);
  console.log('生成されたCQL:', generatedCql);
  
  console.log('\nNDL APIにリクエスト送信中...');
  
  try {
    const response = await axios.get('https://ndlsearch.ndl.go.jp/api/sru', {
      params: {
        operation: 'searchRetrieve',
        query: generatedCql,
        recordSchema: 'dcndl',
        maximumRecords: 10
      },
      timeout: 15000
    });
    
    console.log('APIレスポンス ステータス:', response.status);
    
    const xmlData = response.data;
    const numberOfRecordsMatch = xmlData.match(/<numberOfRecords>(\d+)<\/numberOfRecords>/);
    const numberOfRecords = numberOfRecordsMatch ? parseInt(numberOfRecordsMatch[1]) : 0;
    
    console.log('\n=== 検索結果 ===');
    console.log('ヒット件数:', numberOfRecords);
    
    if (numberOfRecords > 0) {
      console.log('✅ 検索成功！書籍が見つかりました');
      
      // タイトルを抽出
      const titleMatches = xmlData.match(/<dc:title[^>]*>([^<]+)<\/dc:title>/g);
      if (titleMatches) {
        console.log('\n見つかった書籍:');
        titleMatches.slice(0, 5).forEach((match, i) => {
          const title = match.replace(/<[^>]+>/g, '').trim();
          console.log(`${i + 1}. ${title}`);
        });
      }
      
      // 著者も抽出
      const creatorMatches = xmlData.match(/<dc:creator[^>]*>([^<]+)<\/dc:creator>/g);
      if (creatorMatches) {
        console.log('\n著者例:');
        creatorMatches.slice(0, 3).forEach((match, i) => {
          const creator = match.replace(/<[^>]+>/g, '').trim();
          console.log(`- ${creator}`);
        });
      }
      
    } else {
      console.log('❌ 該当する書籍が見つかりませんでした');
      console.log('このCQLでは検索結果がありません');
    }
    
  } catch (error) {
    console.error('❌ NDL API エラー:', error.message);
    if (error.response) {
      console.error('HTTPステータス:', error.response.status);
    }
  }
}

await testActualQuery();