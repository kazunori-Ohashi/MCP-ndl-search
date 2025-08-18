// NDL APIに直接CQLを投げてテスト
import axios from 'axios';

const testCql = 'subject="中国明王朝" AND subject="税制度" AND (subject="書籍") AND language="jpn"';
console.log('テスト CQL:', testCql);

const params = {
  operation: 'searchRetrieve',
  query: testCql,
  recordSchema: 'dcndl',
  maximumRecords: 5
};

console.log('NDL API パラメータ:', params);

try {
  const response = await axios.get('https://ndlsearch.ndl.go.jp/api/sru', { 
    params,
    timeout: 10000
  });
  
  console.log('NDL API ステータス:', response.status);
  
  // XMLから件数を抽出
  const xmlData = response.data;
  const numberOfRecordsMatch = xmlData.match(/<numberOfRecords>(\d+)<\/numberOfRecords>/);
  const numberOfRecords = numberOfRecordsMatch ? parseInt(numberOfRecordsMatch[1]) : 0;
  
  console.log('検索結果件数:', numberOfRecords);
  
  if (numberOfRecords > 0) {
    console.log('✅ ヒットしました！');
    
    // タイトルを抽出してみる
    const titleMatches = xmlData.match(/<dc:title[^>]*>([^<]+)<\/dc:title>/g);
    if (titleMatches) {
      console.log('見つかったタイトル例:');
      titleMatches.slice(0, 3).forEach((match, i) => {
        const title = match.replace(/<[^>]+>/g, '');
        console.log(`${i + 1}. ${title}`);
      });
    }
  } else {
    console.log('❌ ヒットしませんでした');
    
    // より広い検索で試してみる
    console.log('\n代替案として、より広い検索を試します...');
    const alternateCql = '(subject="明朝" OR subject="明代") AND (subject="税制" OR subject="財政") AND language="jpn"';
    console.log('代替 CQL:', alternateCql);
    
    const altResponse = await axios.get('https://ndlsearch.ndl.go.jp/api/sru', { 
      params: { ...params, query: alternateCql },
      timeout: 10000
    });
    
    const altXmlData = altResponse.data;
    const altNumberOfRecordsMatch = altXmlData.match(/<numberOfRecords>(\d+)<\/numberOfRecords>/);
    const altNumberOfRecords = altNumberOfRecordsMatch ? parseInt(altNumberOfRecordsMatch[1]) : 0;
    
    console.log('代替検索結果件数:', altNumberOfRecords);
    
    if (altNumberOfRecords > 0) {
      console.log('✅ 代替検索はヒットしました！');
    }
  }
  
} catch (error) {
  console.error('NDL API エラー:', error.message);
}