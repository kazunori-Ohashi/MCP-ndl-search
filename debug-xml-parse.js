// XML解析をデバッグ
import axios from 'axios';
import * as xml2js from 'xml2js';

async function debugXmlParsing() {
  console.log('=== XML解析デバッグ ===');
  
  const cql = 'title="経済史"';
  console.log('CQL:', cql);
  
  try {
    const response = await axios.get('https://ndlsearch.ndl.go.jp/api/sru', {
      params: {
        operation: 'searchRetrieve',
        query: cql,
        recordSchema: 'dcndl',
        maximumRecords: 2
      }
    });
    
    const rawXml = response.data;
    console.log('\n=== 生XMLのサンプル ===');
    console.log(rawXml.substring(0, 1000) + '...');
    
    // numberOfRecords確認
    const numberOfRecordsMatch = rawXml.match(/<numberOfRecords>(\d+)<\/numberOfRecords>/);
    const numberOfRecords = numberOfRecordsMatch ? parseInt(numberOfRecordsMatch[1]) : 0;
    console.log('\n検索ヒット件数:', numberOfRecords);
    
    // XML解析
    console.log('\n=== XML解析 ===');
    xml2js.parseString(rawXml, {
      explicitArray: false,
      ignoreAttrs: false,
      mergeAttrs: true
    }, (err, parsed) => {
      if (err) {
        console.error('XML解析エラー:', err);
        return;
      }
      
      console.log('解析成功');
      
      const response = parsed.searchRetrieveResponse;
      console.log('response存在:', !!response);
      console.log('records存在:', !!response?.records);
      console.log('record存在:', !!response?.records?.record);
      
      if (response?.records?.record) {
        const records = Array.isArray(response.records.record) 
          ? response.records.record 
          : [response.records.record];
        
        console.log('レコード数:', records.length);
        
        if (records.length > 0) {
          const firstRecord = records[0];
          console.log('\n=== 最初のレコード構造 ===');
          console.log('recordData存在:', !!firstRecord.recordData);
          console.log('rdf:RDF存在:', !!firstRecord.recordData?.['rdf:RDF']);
          console.log('dcndl:BibResource存在:', !!firstRecord.recordData?.['rdf:RDF']?.['dcndl:BibResource']);
          
          if (firstRecord.recordData?.['rdf:RDF']?.['dcndl:BibResource']) {
            const bibResource = firstRecord.recordData['rdf:RDF']['dcndl:BibResource'];
            console.log('title:', bibResource['dcterms:title'] || bibResource['dc:title']);
            console.log('creator:', bibResource['dcterms:creator'] || bibResource['dc:creator']);
          }
        }
      } else {
        console.log('❌ レコードが見つかりません');
        console.log('response keys:', Object.keys(response || {}));
        if (response?.records) {
          console.log('records keys:', Object.keys(response.records));
        }
      }
    });
    
  } catch (error) {
    console.error('リクエストエラー:', error.message);
  }
}

await debugXmlParsing();