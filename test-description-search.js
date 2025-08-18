// description検索の動作確認
import axios from 'axios';

async function testDescriptionSearch() {
  console.log('=== description検索テスト ===');
  
  const testCases = [
    {
      name: 'description="伝記"',
      cql: 'description="伝記"'
    },
    {
      name: 'description="歴史"', 
      cql: 'description="歴史"'
    },
    {
      name: 'description="研究"',
      cql: 'description="研究"'
    },
    {
      name: 'title="聖徳太子" AND description="伝記"',
      cql: 'title="聖徳太子" AND description="伝記"'
    }
  ];
  
  for (const testCase of testCases) {
    console.log(`\n--- ${testCase.name} ---`);
    
    try {
      const response = await axios.get('https://ndlsearch.ndl.go.jp/api/sru', {
        params: {
          operation: 'searchRetrieve',
          query: testCase.cql,
          recordSchema: 'dcndl',
          maximumRecords: 3
        },
        timeout: 10000
      });
      
      const xmlData = response.data;
      const numberOfRecordsMatch = xmlData.match(/<numberOfRecords>(\d+)<\/numberOfRecords>/);
      const numberOfRecords = numberOfRecordsMatch ? parseInt(numberOfRecordsMatch[1]) : 0;
      
      console.log(`結果: ${numberOfRecords}件`);
      
      if (numberOfRecords > 0) {
        console.log('✅ description検索有効');
        
        // タイトル例を表示
        const titleMatches = xmlData.match(/<dcterms:title>([^<]+)<\/dcterms:title>/g);
        if (titleMatches) {
          console.log('例:');
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
}

await testDescriptionSearch();