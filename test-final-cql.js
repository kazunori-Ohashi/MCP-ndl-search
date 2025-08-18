// 修正版CQLで実際にテスト
import axios from 'axios';

const testCql = 'title="中国明王朝" AND title="税制度" AND (title="書籍")';
console.log('修正版CQL:', testCql);

try {
  const response = await axios.get('https://ndlsearch.ndl.go.jp/api/sru', { 
    params: {
      operation: 'searchRetrieve',
      query: testCql,
      recordSchema: 'dcndl',
      maximumRecords: 5
    },
    timeout: 10000
  });
  
  const xmlData = response.data;
  const numberOfRecordsMatch = xmlData.match(/<numberOfRecords>(\d+)<\/numberOfRecords>/);
  const numberOfRecords = numberOfRecordsMatch ? parseInt(numberOfRecordsMatch[1]) : 0;
  
  console.log('検索結果件数:', numberOfRecords);
  
  if (numberOfRecords > 0) {
    console.log('✅ ヒットしました！');
    
    const titleMatches = xmlData.match(/<dc:title[^>]*>([^<]+)<\/dc:title>/g);
    if (titleMatches) {
      console.log('\n見つかったタイトル:');
      titleMatches.slice(0, 3).forEach((match, i) => {
        const title = match.replace(/<[^>]+>/g, '');
        console.log(`${i + 1}. ${title}`);
      });
    }
  } else {
    console.log('❌ まだヒットしません');
    
    // より緩い条件でテスト
    const looserCql = 'title="明代" AND title="税制"';
    console.log('\nより緩い条件でテスト:', looserCql);
    
    const looserResponse = await axios.get('https://ndlsearch.ndl.go.jp/api/sru', { 
      params: {
        operation: 'searchRetrieve',
        query: looserCql,
        recordSchema: 'dcndl',
        maximumRecords: 3
      },
      timeout: 10000
    });
    
    const looserXmlData = looserResponse.data;
    const looserNumberOfRecordsMatch = looserXmlData.match(/<numberOfRecords>(\d+)<\/numberOfRecords>/);
    const looserNumberOfRecords = looserNumberOfRecordsMatch ? parseInt(looserNumberOfRecordsMatch[1]) : 0;
    
    console.log('緩い条件の結果件数:', looserNumberOfRecords);
    
    if (looserNumberOfRecords > 0) {
      console.log('✅ 緩い条件でヒット！');
      
      const looserTitleMatches = looserXmlData.match(/<dc:title[^>]*>([^<]+)<\/dc:title>/g);
      if (looserTitleMatches) {
        console.log('\n緩い条件でのタイトル:');
        looserTitleMatches.slice(0, 2).forEach((match, i) => {
          const title = match.replace(/<[^>]+>/g, '');
          console.log(`${i + 1}. ${title}`);
        });
      }
    }
  }
  
} catch (error) {
  console.error('エラー:', error.message);
}