// 生データの詳細分析用デバッグスクリプト
import { handleSearchByDescription } from './src/mcp/tools/searchByDescription.js';

async function debugRawData() {
  console.log('=== NDL生データ分析 ===');
  
  try {
    const result = await handleSearchByDescription({
      description: "伝記",
      titleKeyword: "聖徳太子", 
      maxRecords: 1,
      publishToMcp: false
    });
    
    if (result.records && result.records.length > 0) {
      const record = result.records[0];
      console.log('\n=== 書誌レコード構造 ===');
      console.log('基本情報:');
      console.log(`- id: ${record.id}`);
      console.log(`- title: ${record.title}`);
      console.log(`- creators: ${JSON.stringify(record.creators)}`);
      console.log(`- date: ${JSON.stringify(record.date)}`);
      console.log(`- language: ${record.language}`);
      console.log(`- source: ${record.source}`);
      
      console.log('\n=== raw フィールド構造 ===');
      const raw = record.raw;
      console.log('rawのキー:', Object.keys(raw || {}));
      
      // raw_recordの確認
      if (raw?.raw_record) {
        console.log('\n=== raw.raw_record 構造 ===');
        const rawRecord = JSON.parse(raw.raw_record);
        console.log('raw_recordのキー:', Object.keys(rawRecord || {}));
        console.log('raw.rawのキー:', Object.keys(rawRecord || {}));
        
        // dcterms:creator の確認
        if (rawRecord['dcterms:creator']) {
          console.log('\n=== dcterms:creator 構造 ===');
          console.log(JSON.stringify(rawRecord['dcterms:creator'], null, 2));
        }
        
        // dcterms:publisher の確認
        if (rawRecord['dcterms:publisher']) {
          console.log('\n=== dcterms:publisher 構造 ===');
          console.log(JSON.stringify(rawRecord['dcterms:publisher'], null, 2));
        }
        
        // dcterms:issued の確認
        if (rawRecord['dcterms:issued']) {
          console.log('\n=== dcterms:issued 構造 ===');
          console.log(JSON.stringify(rawRecord['dcterms:issued'], null, 2));
        }
        
        // dcterms:identifier の確認
        if (rawRecord['dcterms:identifier']) {
          console.log('\n=== dcterms:identifier 構造 ===');
          console.log(JSON.stringify(rawRecord['dcterms:identifier'], null, 2));
        }
        
        // dcterms:subject の確認
        if (rawRecord['dcterms:subject']) {
          console.log('\n=== dcterms:subject 構造 ===');
          console.log(JSON.stringify(rawRecord['dcterms:subject'], null, 2));
        }
        
        // dcterms:description の確認
        if (rawRecord['dcterms:description']) {
          console.log('\n=== dcterms:description 構造 ===');
          console.log(JSON.stringify(rawRecord['dcterms:description'], null, 2));
        }
      }
      
      console.log('\n=== link情報 ===');
      console.log(`raw.link: ${raw?.link}`);
      console.log(`raw.recordData?.link: ${raw?.recordData?.link}`);
    }
    
  } catch (error) {
    console.error('デバッグエラー:', error.message);
  }
}

await debugRawData();