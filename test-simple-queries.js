// シンプルなクエリで実際にNDLにヒットするものを見つける
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

// 様々なパターンをテスト
await testQuery('language="jpn"', '1. 日本語のみ（基本テスト）');

await testQuery('subject="税制" AND language="jpn"', '2. 税制のみ');

await testQuery('subject="明代" AND language="jpn"', '3. 明代のみ');

await testQuery('subject="中国" AND language="jpn"', '4. 中国のみ');

await testQuery('title="明代" AND language="jpn"', '5. タイトルに明代');

await testQuery('(title="明代" OR subject="明代") AND language="jpn"', '6. タイトルまたは件名に明代');

await testQuery('subject="中国史" AND language="jpn"', '7. 中国史のみ');

await testQuery('subject="経済史" AND language="jpn"', '8. 経済史のみ');

await testQuery('subject="財政" AND language="jpn"', '9. 財政のみ');