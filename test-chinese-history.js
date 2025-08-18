// 中国史の検索を実際にテスト
import { handleSearchBooks } from './src/mcp/tools/searchBooks.js';

async function testChineseHistory() {
  console.log('=== 中国史検索テスト ===');
  
  try {
    const result = await handleSearchBooks({
      query: "中国史",
      maxRecords: 5,
      publishToMcp: false
    });
    
    console.log('検索結果:');
    console.log('- count:', result.count);
    console.log('- records length:', result.records.length);
    
    if (result.records.length > 0) {
      console.log('\n=== レコード詳細 ===');
      result.records.forEach((record, i) => {
        console.log(`${i + 1}. ${record.title}`);
        console.log(`   作者: ${record.creators?.join(', ') || 'なし'}`);
        console.log(`   日付: ${record.date || 'なし'}`);
      });
    } else {
      console.log('❌ レコードが見つかりません');
    }
    
  } catch (error) {
    console.error('❌ 検索エラー:', error.message);
    console.error('スタック:', error.stack);
  }
}

await testChineseHistory();