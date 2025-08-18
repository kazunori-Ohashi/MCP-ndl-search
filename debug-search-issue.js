// 検索問題のデバッグ
import { handleSearchBySubject } from './src/mcp/tools/searchBySubject.js';

async function debugSearchIssue() {
  console.log('=== 検索問題デバッグ ===');
  
  try {
    // 問題のクエリを実行
    console.log('\n--- 問題のクエリ: subject="明朝", additionalSubject="税制" ---');
    const problemResult = await handleSearchBySubject({
      subject: "明朝",
      additionalSubject: "税制",
      maxRecords: 20,
      publishToMcp: false
    });
    
    console.log(`結果: ${problemResult.count}件`);
    console.log(`生成CQL: ${problemResult.query}`);
    
    // より一般的な検索で確認
    console.log('\n--- 個別検索: subject="明朝" のみ ---');
    const mingResult = await handleSearchBySubject({
      subject: "明朝",
      maxRecords: 5,
      publishToMcp: false
    });
    
    console.log(`結果: ${mingResult.count}件`);
    console.log(`生成CQL: ${mingResult.query}`);
    if (mingResult.records.length > 0) {
      console.log('結果例:');
      mingResult.records.slice(0, 3).forEach((record, i) => {
        console.log(`${i + 1}. ${record.title}`);
      });
    }
    
    console.log('\n--- 個別検索: subject="税制" のみ ---');
    const taxResult = await handleSearchBySubject({
      subject: "税制",
      maxRecords: 5,
      publishToMcp: false
    });
    
    console.log(`結果: ${taxResult.count}件`);
    console.log(`生成CQL: ${taxResult.query}`);
    if (taxResult.records.length > 0) {
      console.log('結果例:');
      taxResult.records.slice(0, 3).forEach((record, i) => {
        console.log(`${i + 1}. ${record.title}`);
      });
    }
    
    // より確実にヒットしそうなクエリで検証
    console.log('\n--- より一般的な検索: subject="中国" ---');
    const chinaResult = await handleSearchBySubject({
      subject: "中国",
      maxRecords: 5,
      publishToMcp: false
    });
    
    console.log(`結果: ${chinaResult.count}件`);
    console.log(`生成CQL: ${chinaResult.query}`);
    if (chinaResult.records.length > 0) {
      console.log('結果例:');
      chinaResult.records.slice(0, 3).forEach((record, i) => {
        console.log(`${i + 1}. ${record.title}`);
      });
    }
    
    // Description検索での比較
    console.log('\n--- Description検索比較: "明" AND "税制" ---');
    const { handleSearchByDescription } = await import('./src/mcp/tools/searchByDescription.js');
    const descResult = await handleSearchByDescription({
      description: "税制",
      titleKeyword: "明",
      maxRecords: 5,
      publishToMcp: false
    });
    
    console.log(`結果: ${descResult.count}件`);
    console.log(`生成CQL: ${descResult.query}`);
    if (descResult.records.length > 0) {
      console.log('結果例:');
      descResult.records.slice(0, 3).forEach((record, i) => {
        console.log(`${i + 1}. ${record.title}`);
      });
    }
    
  } catch (error) {
    console.error('デバッグエラー:', error.message);
  }
  
  console.log('\n=== デバッグ完了 ===');
}

await debugSearchIssue();