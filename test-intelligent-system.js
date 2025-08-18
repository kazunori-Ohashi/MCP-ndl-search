// 新しいインテリジェント検索システムをテスト
import { handleSearchBooks } from './src/mcp/tools/searchBooks.js';

async function testAllSearchModes() {
  console.log('=== 新しいインテリジェント検索システム テスト ===');
  
  const testQuery = "聖徳太子の生誕について詳しく知りたい";
  
  // Test 1: Intelligent Mode (LLMが無効でもフォールバック)
  console.log('\n--- Test 1: Intelligent Mode ---');
  try {
    const intelligentResult = await handleSearchBooks({
      query: testQuery,
      maxRecords: 3,
      searchMode: 'intelligent',
      publishToMcp: false
    });
    
    console.log(`Intelligent Mode: ${intelligentResult.count}件`);
    if (intelligentResult.records.length > 0) {
      console.log('トップ結果:', intelligentResult.records[0].title);
    }
  } catch (error) {
    console.error('Intelligent mode error:', error.message);
  }
  
  // Test 2: Advanced Mode (Rule-based multi-field)
  console.log('\n--- Test 2: Advanced Mode ---');
  try {
    const advancedResult = await handleSearchBooks({
      query: testQuery,
      maxRecords: 3,
      searchMode: 'advanced',
      publishToMcp: false
    });
    
    console.log(`Advanced Mode: ${advancedResult.count}件`);
    if (advancedResult.records.length > 0) {
      console.log('トップ結果:', advancedResult.records[0].title);
      if (advancedResult.records[0].relevanceScore) {
        console.log('関連度スコア:', advancedResult.records[0].relevanceScore.toFixed(2));
      }
    }
  } catch (error) {
    console.error('Advanced mode error:', error.message);
  }
  
  // Test 3: Simple Mode (Basic title search)
  console.log('\n--- Test 3: Simple Mode ---');
  try {
    const simpleResult = await handleSearchBooks({
      query: testQuery,
      maxRecords: 3,
      searchMode: 'simple',
      publishToMcp: false
    });
    
    console.log(`Simple Mode: ${simpleResult.count}件`);
    if (simpleResult.records.length > 0) {
      console.log('トップ結果:', simpleResult.records[0].title);
    }
  } catch (error) {
    console.error('Simple mode error:', error.message);
  }
  
  console.log('\n=== 検索モード比較完了 ===');
}

await testAllSearchModes();