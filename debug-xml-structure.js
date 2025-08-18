// 実際のXML構造を調査
import axios from 'axios';
import * as xml2js from 'xml2js';

async function debugXmlStructure() {
  console.log('=== XML構造詳細調査 ===');
  
  try {
    const response = await axios.get('https://ndlsearch.ndl.go.jp/api/sru', {
      params: {
        operation: 'searchRetrieve',
        query: 'title="経済史"',
        recordSchema: 'dcndl',
        maximumRecords: 1
      }
    });
    
    const rawXml = response.data;
    
    xml2js.parseString(rawXml, {
      explicitArray: false,
      ignoreAttrs: false,
      mergeAttrs: true
    }, (err, parsed) => {
      if (err) {
        console.error('XML解析エラー:', err);
        return;
      }
      
      const firstRecord = parsed.searchRetrieveResponse.records.record;
      console.log('=== 第1レコードの完全構造 ===');
      console.log(JSON.stringify(firstRecord, null, 2));
      
      console.log('\n=== recordData構造 ===');
      if (firstRecord.recordData) {
        console.log(JSON.stringify(firstRecord.recordData, null, 2));
      }
      
      console.log('\n=== recordDataのキー ===');
      if (firstRecord.recordData) {
        console.log(Object.keys(firstRecord.recordData));
      }
    });
    
  } catch (error) {
    console.error('エラー:', error.message);
  }
}

await debugXmlStructure();