// 軽量化フォーマッターの完全統合テスト
import { handleSearchByDescription } from './src/mcp/tools/searchByDescription.js';
import { handleSearchBySubject } from './src/mcp/tools/searchBySubject.js';
import { handleSearchBooks } from './src/mcp/tools/searchBooks.js';

async function testFullIntegration() {
  console.log('=== NDL MCP 軽量化統合テスト ===');
  
  try {
    // Test 1: Description検索でJSON軽量化
    console.log('\n--- Test 1: Description検索 + JSON軽量化 ---');
    const descResult = await handleSearchByDescription({
      description: "経済",
      titleKeyword: "日本",
      maxRecords: 2,
      publishToMcp: false,
      output_format: "json"
    });
    
    console.log(`結果: ${descResult.count}件`);
    console.log(`元データサイズ: ${JSON.stringify(descResult.records).length}文字`);
    console.log(`軽量データサイズ: ${descResult.formatted_records?.length || 0}文字`);
    
    if (descResult.formatted_records) {
      const data = JSON.parse(descResult.formatted_records);
      console.log(`軽量データ例: ${data.books[0]?.title || 'なし'}`);
    }
    
    // Test 2: Subject検索でYAML軽量化
    console.log('\n--- Test 2: Subject検索 + YAML軽量化 ---');
    const subjectResult = await handleSearchBySubject({
      subject: "仏教",
      maxRecords: 1,
      publishToMcp: false,
      output_format: "yaml"
    });
    
    console.log(`結果: ${subjectResult.count}件`);
    console.log(`YAMLサイズ: ${subjectResult.formatted_records?.length || 0}文字`);
    console.log('YAMLフォーマット:', subjectResult.formatted_records?.substring(0, 200) + '...');
    
    // Test 3: インテリジェント検索でJSON軽量化
    console.log('\n--- Test 3: インテリジェント検索 + JSON軽量化 ---');
    const intelligentResult = await handleSearchBooks({
      query: "明治時代の経済発展について",
      maxRecords: 2,
      searchMode: "intelligent",
      publishToMcp: false,
      output_format: "json"
    });
    
    console.log(`結果: ${intelligentResult.count}件`);
    if (intelligentResult.formatted_records) {
      const data = JSON.parse(intelligentResult.formatted_records);
      console.log(`軽量データ書籍数: ${data.books.length}`);
      console.log(`最初の書籍: ${data.books[0]?.title || 'なし'}`);
    }
    
    // Test 4: データ削減効果の総合評価
    console.log('\n--- Test 4: データ削減効果まとめ ---');
    const testCases = [
      { name: 'Description検索', raw: descResult.records, formatted: descResult.formatted_records },
      { name: 'Subject検索', raw: subjectResult.records, formatted: subjectResult.formatted_records },
      { name: 'インテリジェント検索', raw: intelligentResult.records, formatted: intelligentResult.formatted_records }
    ];
    
    for (const testCase of testCases) {
      const rawSize = JSON.stringify(testCase.raw).length;
      const formattedSize = testCase.formatted?.length || 0;
      const reduction = formattedSize > 0 ? Math.round((1 - formattedSize / rawSize) * 100) : 0;
      console.log(`${testCase.name}: ${rawSize}→${formattedSize}文字 (${reduction}%削減)`);
    }
    
  } catch (error) {
    console.error('統合テストエラー:', error.message);
  }
  
  console.log('\n=== 統合テスト完了 ===');
}

await testFullIntegration();