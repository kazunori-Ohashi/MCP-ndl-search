// NDLデータフォーマッターのテスト
import { handleSearchByDescription } from './src/mcp/tools/searchByDescription.js';

async function testFormatter() {
  console.log('=== NDL書誌データフォーマッターテスト ===');
  
  try {
    // Test 1: 通常のJSONフォーマット（デフォルト）
    console.log('\n--- Test 1: デフォルト出力（フォーマットなし） ---');
    const defaultResult = await handleSearchByDescription({
      description: "伝記",
      titleKeyword: "聖徳太子",
      maxRecords: 2,
      publishToMcp: false
    });
    
    console.log(`結果件数: ${defaultResult.count}`);
    console.log(`生データサイズ: ${JSON.stringify(defaultResult).length} 文字`);
    console.log(`フォーマット済みデータ: ${defaultResult.formatted_records ? 'あり' : 'なし'}`);
    
    // Test 2: JSON形式での軽量化
    console.log('\n--- Test 2: JSON軽量化フォーマット ---');
    const jsonResult = await handleSearchByDescription({
      description: "伝記", 
      titleKeyword: "聖徳太子",
      maxRecords: 2,
      publishToMcp: false,
      output_format: "json"
    });
    
    console.log(`結果件数: ${jsonResult.count}`);
    console.log(`生データサイズ: ${JSON.stringify(jsonResult.records).length} 文字`);
    if (jsonResult.formatted_records) {
      console.log(`軽量データサイズ: ${jsonResult.formatted_records.length} 文字`);
      console.log(`データ削減率: ${Math.round((1 - jsonResult.formatted_records.length / JSON.stringify(jsonResult.records).length) * 100)}%`);
      
      // 軽量データの内容確認
      const parsedData = JSON.parse(jsonResult.formatted_records);
      console.log('\n軽量データ構造:');
      if (parsedData.books && parsedData.books[0]) {
        const firstBook = parsedData.books[0];
        console.log(`- タイトル: ${firstBook.title}`);
        console.log(`- 著者: ${firstBook.authors?.join(', ') || 'なし'}`);
        console.log(`- 出版年: ${firstBook.publication_year || 'なし'}`);
        console.log(`- 出版社: ${firstBook.publisher || 'なし'}`);
        console.log(`- ISBN: ${firstBook.isbn || 'なし'}`);
        console.log(`- 件名: ${firstBook.subjects?.join(', ') || 'なし'}`);
        console.log(`- NDL URL: ${firstBook.ndl_url}`);
      }
    }
    
    // Test 3: YAML形式での軽量化
    console.log('\n--- Test 3: YAML軽量化フォーマット ---');
    const yamlResult = await handleSearchByDescription({
      description: "研究",
      titleKeyword: "経済",
      maxRecords: 1,
      publishToMcp: false,
      output_format: "yaml"
    });
    
    console.log(`結果件数: ${yamlResult.count}`);
    if (yamlResult.formatted_records) {
      console.log(`YAMLデータサイズ: ${yamlResult.formatted_records.length} 文字`);
      console.log('\nYAMLフォーマット例:');
      console.log(yamlResult.formatted_records.substring(0, 500) + '...');
    }
    
    // Test 4: 空結果での動作確認
    console.log('\n--- Test 4: 空結果での動作確認 ---');
    const emptyResult = await handleSearchByDescription({
      description: "この検索語は存在しないはずの専用語句999888777",
      maxRecords: 5,
      publishToMcp: false,
      output_format: "json"
    });
    
    console.log(`空結果件数: ${emptyResult.count}`);
    if (emptyResult.formatted_records) {
      const emptyData = JSON.parse(emptyResult.formatted_records);
      console.log(`空フォーマットデータ: total_results=${emptyData.total_results}, books.length=${emptyData.books.length}`);
    }
    
  } catch (error) {
    console.error('テストエラー:', error.message);
  }
  
  console.log('\n=== フォーマッターテスト完了 ===');
}

await testFormatter();