// MCPサーバーの実際の検索をテスト
import { handleSearchBooks } from './src/mcp/tools/searchBooks.js';

async function testMcpSearch() {
  console.log('=== MCP検索テスト ===');
  
  try {
    const result = await handleSearchBooks({
      query: "経済史",
      maxRecords: 3,
      publishToMcp: false  // MCP出力は無効化
    });
    
    console.log('検索結果:');
    console.log('- count:', result.count);
    console.log('- records length:', result.records.length);
    
    if (result.records.length > 0) {
      console.log('\n=== 最初のレコード ===');
      const first = result.records[0];
      console.log('ID:', first.id);
      console.log('Title:', first.title);
      console.log('Creators:', first.creators);
      console.log('Date:', first.date);
      console.log('Language:', first.language);
      console.log('Source:', first.source);
    }
    
  } catch (error) {
    console.error('検索エラー:', error.message);
    console.error('スタック:', error.stack);
  }
}

await testMcpSearch();