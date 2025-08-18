// 動作するNDL SRU エンドポイントで適切なクエリをテスト
import axios from 'axios';

async function testQuery(cql, description) {
  console.log(`\n=== ${description} ===`);
  console.log('CQL:', cql);
  
  try {
    const response = await axios.get('https://ndlsearch.ndl.go.jp/api/sru', { 
      params: {
        operation: 'searchRetrieve',
        query: cql,
        recordSchema: 'dcndl',
        maximumRecords: 3
      },
      timeout: 10000
    });
    
    const xmlData = response.data;
    const numberOfRecordsMatch = xmlData.match(/<numberOfRecords>(\d+)<\/numberOfRecords>/);
    const numberOfRecords = numberOfRecordsMatch ? parseInt(numberOfRecordsMatch[1]) : 0;
    
    console.log('結果件数:', numberOfRecords);
    
    if (numberOfRecords > 0) {
      console.log('✅ ヒット');
      
      // タイトルを抽出
      const titleMatches = xmlData.match(/<dc:title[^>]*>([^<]+)<\/dc:title>/g);
      if (titleMatches) {
        console.log('タイトル例:');
        titleMatches.slice(0, 2).forEach((match, i) => {
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

// より基本的なクエリから開始
await testQuery('title="日本"', '1. タイトルに「日本」');

await testQuery('any="中国"', '2. 任意フィールドに「中国」');

await testQuery('title="中国"', '3. タイトルに「中国」');

await testQuery('creator="山田"', '4. 著者に「山田」');

await testQuery('title="明代"', '5. タイトルに「明代」');

await testQuery('any="明代"', '6. 任意フィールドに「明代」');

await testQuery('title="税制"', '7. タイトルに「税制」');

await testQuery('any="税制"', '8. 任意フィールドに「税制」');

await testQuery('any="AI"', '9. 任意フィールドに「AI」');

await testQuery('title="学習"', '10. タイトルに「学習」');