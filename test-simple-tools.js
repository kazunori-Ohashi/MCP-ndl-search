// シンプルなツールをテスト
import { handleSearchByDescription } from './src/mcp/tools/searchByDescription.js';
import { handleSearchBySubject } from './src/mcp/tools/searchBySubject.js';
import { handleSearchByTitle } from './src/mcp/tools/searchByTitle.js';

async function testSimpleTools() {
  console.log('=== シンプルなNDL検索ツールテスト ===');
  
  // Test 1: Description search
  console.log('\n--- Test 1: Description Search ---');
  try {
    const descResult = await handleSearchByDescription({
      description: "伝記",
      titleKeyword: "聖徳太子",
      maxRecords: 3,
      publishToMcp: false
    });
    
    console.log(`Description Search: ${descResult.count}件`);
    console.log(`Query: ${descResult.query}`);
    if (descResult.records.length > 0) {
      console.log('結果例:');
      descResult.records.forEach((record, i) => {
        console.log(`${i + 1}. ${record.title}`);
      });
    }
  } catch (error) {
    console.error('Description search error:', error.message);
  }
  
  // Test 2: Subject search
  console.log('\n--- Test 2: Subject Search ---');
  try {
    const subjectResult = await handleSearchBySubject({
      subject: "聖徳太子",
      maxRecords: 3,
      publishToMcp: false
    });
    
    console.log(`Subject Search: ${subjectResult.count}件`);
    console.log(`Query: ${subjectResult.query}`);
    if (subjectResult.records.length > 0) {
      console.log('結果例:');
      subjectResult.records.forEach((record, i) => {
        console.log(`${i + 1}. ${record.title}`);
      });
    }
  } catch (error) {
    console.error('Subject search error:', error.message);
  }
  
  // Test 3: Title search
  console.log('\n--- Test 3: Title Search ---');
  try {
    const titleResult = await handleSearchByTitle({
      title: "聖徳太子",
      maxRecords: 3,
      publishToMcp: false
    });
    
    console.log(`Title Search: ${titleResult.count}件`);
    console.log(`Query: ${titleResult.query}`);
    if (titleResult.records.length > 0) {
      console.log('結果例:');
      titleResult.records.forEach((record, i) => {
        console.log(`${i + 1}. ${record.title}`);
      });
    }
  } catch (error) {
    console.error('Title search error:', error.message);
  }
  
  console.log('\n=== シンプルツールテスト完了 ===');
}

await testSimpleTools();