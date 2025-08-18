// スコアリング機能付き検索をテスト
import { handleSearchBooks } from './src/mcp/tools/searchBooks.js';

async function testScoredSearch() {
  console.log('=== スコアリング機能付き検索テスト ===');
  
  const testQuery = "聖徳太子の生涯について詳しく知りたい";
  console.log(`\nテストクエリ: "${testQuery}"`);
  
  try {
    const result = await handleSearchBooks({
      query: testQuery,
      maxRecords: 5,
      publishToMcp: false
    });
    
    console.log(`\n検索結果: ${result.count}件`);
    
    if (result.records.length > 0) {
      console.log('\n=== スコア付き結果一覧 ===');
      result.records.forEach((record, i) => {
        console.log(`\n${i + 1}. ${record.title}`);
        console.log(`   作者: ${record.creators?.join(', ') || 'なし'}`);
        console.log(`   日付: ${typeof record.date === 'object' ? record.date._ : record.date || 'なし'}`);
        
        // スコア情報が利用可能な場合
        if (record.relevanceScore !== undefined) {
          console.log(`   関連度スコア: ${record.relevanceScore.toFixed(2)}`);
          if (record.scoreBreakdown) {
            console.log(`   スコア内訳:`);
            console.log(`     - 件名マッチ: ${record.scoreBreakdown.subjectMatch}`);
            console.log(`     - タイトルマッチ: ${record.scoreBreakdown.titleMatch}`);
            console.log(`     - 品質指標: ${record.scoreBreakdown.quality}`);
            console.log(`     - 時代的関連性: ${record.scoreBreakdown.temporal}`);
          }
        }
      });
    }
    
  } catch (error) {
    console.error(`❌ 検索エラー: ${error.message}`);
    console.error('スタック:', error.stack);
  }
}

await testScoredSearch();