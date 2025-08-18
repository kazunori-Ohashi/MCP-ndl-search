// 両方のエンドポイントをテストして正しいものを確認
import axios from 'axios';

async function testEndpoint(baseUrl, description) {
  console.log(`\n=== ${description} ===`);
  console.log('エンドポイント:', baseUrl);
  
  try {
    // シンプルなクエリでテスト
    const response = await axios.get(baseUrl, { 
      params: {
        operation: 'searchRetrieve',
        query: 'title="日本"',
        recordSchema: 'dcndl',
        maximumRecords: 1
      },
      timeout: 10000
    });
    
    console.log('ステータス:', response.status);
    
    const xmlData = response.data;
    console.log('レスポンス先頭:', xmlData.substring(0, 200) + '...');
    
    const numberOfRecordsMatch = xmlData.match(/<numberOfRecords>(\d+)<\/numberOfRecords>/);
    const numberOfRecords = numberOfRecordsMatch ? parseInt(numberOfRecordsMatch[1]) : 0;
    
    console.log('結果件数:', numberOfRecords);
    
    if (numberOfRecords > 0) {
      console.log('✅ このエンドポイントは動作します');
      return true;
    } else {
      console.log('⚠️ レスポンスはあるが件数0');
      return false;
    }
    
  } catch (error) {
    console.error('❌ エラー:', error.message);
    if (error.response) {
      console.error('ステータス:', error.response.status);
      console.error('レスポンス:', error.response.data?.substring(0, 200));
    }
    return false;
  }
}

// 両方のエンドポイントをテスト
const endpoint1 = await testEndpoint('https://ndlsearch.ndl.go.jp/api/sru', 'NDL Search API (SRU)');
const endpoint2 = await testEndpoint('https://iss.ndl.go.jp/api/opensearch', 'NDL ISS API (OpenSearch)');

console.log('\n=== 結論 ===');
if (endpoint1) {
  console.log('✅ NDL Search API (SRU) が正常');
} else if (endpoint2) {
  console.log('✅ NDL ISS API (OpenSearch) が正常');
} else {
  console.log('❌ 両方のエンドポイントで問題あり');
}