// 新しい多角的検索戦略をテスト
import { handleSearchBooks } from './src/mcp/tools/searchBooks.js';

async function testAdvancedSearch() {
  console.log('=== 新しい多角的検索戦略テスト ===');
  
  const testCases = [
    {
      query: "聖徳太子の生涯について知りたい",
      expected: "biography type, subject-based search"
    },
    {
      query: "飛鳥時代の歴史背景",
      expected: "historical type, temporal context"
    },
    {
      query: "仏教伝来の研究論文",
      expected: "academic type, subject search"
    }
  ];
  
  for (const testCase of testCases) {
    console.log(`\n--- テストケース: "${testCase.query}" ---`);
    console.log(`期待: ${testCase.expected}`);
    
    try {
      const result = await handleSearchBooks({
        query: testCase.query,
        maxRecords: 3,
        publishToMcp: false
      });
      
      console.log(`結果: ${result.count}件`);
      
      if (result.records.length > 0) {
        console.log('トップ結果:');
        result.records.slice(0, 2).forEach((record, i) => {
          console.log(`${i + 1}. ${record.title}`);
          console.log(`   作者: ${record.creators?.join(', ') || 'なし'}`);
        });
      }
      
    } catch (error) {
      console.error(`エラー: ${error.message}`);
    }
  }
}

await testAdvancedSearch();