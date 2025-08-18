// NDL SRU APIで使用可能な検索フィールドをテスト
import axios from 'axios';

async function testField(field, value, description) {
  console.log(`\n=== ${description} ===`);
  console.log(`CQL: ${field}="${value}"`);
  
  try {
    const response = await axios.get('https://ndlsearch.ndl.go.jp/api/sru', {
      params: {
        operation: 'searchRetrieve',
        query: `${field}="${value}"`,
        recordSchema: 'dcndl',
        maximumRecords: 1
      },
      timeout: 10000
    });
    
    const xmlData = response.data;
    const numberOfRecordsMatch = xmlData.match(/<numberOfRecords>(\d+)<\/numberOfRecords>/);
    const numberOfRecords = numberOfRecordsMatch ? parseInt(numberOfRecordsMatch[1]) : 0;
    
    console.log(`結果: ${numberOfRecords}件`);
    if (numberOfRecords > 0) {
      console.log('✅ 利用可能');
    } else {
      console.log('❌ ヒットなし（フィールド非対応の可能性）');
    }
    
  } catch (error) {
    console.log('❌ エラー:', error.response?.status || error.message);
  }
}

async function testAllFields() {
  console.log('=== NDL SRU API 利用可能フィールド調査 ===');
  
  // 基本フィールド
  await testField('title', '聖徳太子', 'タイトル検索');
  await testField('creator', '山田', '作者検索');
  
  // その他可能性のあるフィールド
  await testField('subject', '日本史', '件名検索');
  await testField('publisher', '岩波', '出版社検索');
  await testField('description', '伝説', '概要検索');
  await testField('any', '聖徳太子', '全フィールド検索');
  await testField('keyword', '聖徳太子', 'キーワード検索');
  await testField('all', '聖徳太子', '全文検索');
  
  // Dublin Core要素
  await testField('dc.title', '聖徳太子', 'DC:タイトル');
  await testField('dc.creator', '山田', 'DC:作者');
  await testField('dc.subject', '日本史', 'DC:件名');
  await testField('dc.description', '伝説', 'DC:概要');
  
  // より詳細な検索
  await testField('isbn', '9784000', 'ISBN検索');
  await testField('issn', '0385', 'ISSN検索');
  await testField('ndc', '210', '日本十進分類検索');
}

await testAllFields();