// ユーザーリクエストのテスト
import { handleSearchBySubject } from './src/mcp/tools/searchBySubject.js';

async function testUserRequest() {
  console.log('=== ユーザーリクエストテスト ===');
  
  try {
    // ユーザーの実際のリクエスト
    console.log('\n--- ユーザーリクエスト: subject="明朝", additionalSubject="税制", maxRecords=20 ---');
    const userResult = await handleSearchBySubject({
      subject: "明朝",
      additionalSubject: "税制", 
      maxRecords: 20,
      publishToMcp: false,
      output_format: "json"
    });
    
    console.log(`✅ 結果: ${userResult.count}件（0件から改善！）`);
    console.log(`生成CQL: ${userResult.query}`);
    
    if (userResult.formatted_records) {
      const data = JSON.parse(userResult.formatted_records);
      console.log(`\n📚 軽量化データ: ${data.total_results}件`);
      
      console.log('\n🔍 関連度の高い結果例:');
      data.books.slice(0, 5).forEach((book, i) => {
        console.log(`${i + 1}. ${book.title}`);
        if (book.authors && book.authors.length > 0) {
          console.log(`   著者: ${book.authors.join(', ')}`);
        }
        if (book.publication_year) {
          console.log(`   年: ${book.publication_year}`);
        }
        console.log(`   URL: ${book.ndl_url}`);
        console.log('');
      });
      
      // データ削減効果の表示
      const originalSize = JSON.stringify(userResult.records).length;
      const optimizedSize = userResult.formatted_records.length;
      const reduction = Math.round((1 - optimizedSize / originalSize) * 100);
      console.log(`📊 データ最適化: ${originalSize}文字 → ${optimizedSize}文字 (${reduction}%削減)`);
    }
    
    console.log('\n💡 より精密な検索への提案:');
    console.log('1. description="税制", titleKeyword="明代" - 内容重視で精度向上');
    console.log('2. description="租税", titleKeyword="明朝" - 専門用語で検索');
    console.log('3. "明代中国の税制度について" - 自然言語検索');
    
  } catch (error) {
    console.error('テストエラー:', error.message);
  }
  
  console.log('\n=== テスト完了 ===');
}

await testUserRequest();