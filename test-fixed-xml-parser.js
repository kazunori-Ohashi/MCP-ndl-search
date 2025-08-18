// 修正版XMLパーサーをテスト
import * as xml2js from 'xml2js';

// 実際のrecordData文字列（デバッグ結果から）
const recordDataString = `
      <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:rdfs="http://www.w3.org/2000/01/rdf-schema#" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcndl="http://ndl.go.jp/dcndl/terms/" xmlns:foaf="http://xmlns.com/foaf/0.1/" xmlns:owl="http://www.w3.org/2002/07/owl#" >
          <dcndl:BibAdminResource rdf:about="https://ndlsearch.ndl.go.jp/books/R000000004-I2860002">
              <dcndl:catalogingStatus>C7</dcndl:catalogingStatus>
              <dcterms:description>type : article</dcterms:description>
              <dcndl:bibRecordCategory>R000000004</dcndl:bibRecordCategory>
              <dcndl:bibRecordSubCategory>632</dcndl:bibRecordSubCategory>
              <dcndl:record rdf:resource="https://ndlsearch.ndl.go.jp/books/R000000004-I2860002#material" />
          </dcndl:BibAdminResource>
          <dcndl:BibResource rdf:about="https://ndlsearch.ndl.go.jp/books/R000000004-I2860002#material">
              <rdfs:seeAlso rdf:resource="http://id.ndl.go.jp/bib/2860002"/>
              <dcterms:identifier rdf:datatype="http://ndl.go.jp/dcndl/terms/NDLBibID">2860002</dcterms:identifier>
              <dcterms:title>「アーサー伝説--歴史とロマンスの交錯」青山吉信</dcterms:title>
              <dc:title><rdf:Description>
              <rdf:value>「アーサー伝説--歴史とロマンスの交錯」青山吉信</rdf:value>
              <dcndl:transcription>アーサー デンセツ レキシ ト ロマンス ノ コウサク アオヤマヨシノブ</dcndl:transcription>
          </rdf:Description></dc:title>
                  <dcterms:creator><foaf:Agent>
              <foaf:name>三好 洋子</foaf:name>
          </foaf:Agent></dcterms:creator>
              <dc:creator>三好 洋子</dc:creator>
              <dcterms:publisher><foaf:Agent>
              <foaf:name>東京 : 社会経済史学会 ; 1931-</foaf:name>
          </foaf:Agent></dcterms:publisher>
              <dcndl:publicationPlace rdf:datatype="http://purl.org/dc/terms/ISO3166">JP</dcndl:publicationPlace>
              <dcterms:date>53(4) 1987.10</dcterms:date>
              <dcterms:issued rdf:datatype="http://purl.org/dc/terms/W3CDTF">1987-10</dcterms:issued>
              <dcterms:description>記事分類: 学術・文化--書評--歴史・地理・哲学・心理学・宗教 ; 学術・文化--書評--芸術・文学・語学</dcterms:description><dcterms:description>記事種別: 書評</dcterms:description>
              <dcterms:subject rdf:resource="http://id.ndl.go.jp/class/ndlc/ZD12"/>
              <dcterms:language rdf:datatype="http://purl.org/dc/terms/ISO639-2">jpn</dcterms:language>
              <dcndl:materialType rdf:resource="http://ndl.go.jp/ndltype/Article" rdfs:label="記事・論文"/>
                  <dcndl:publicationName>社会経済史学 = Socio-economic history / 社会経済史学会 編</dcndl:publicationName>
                  <dcndl:publicationVolume>53</dcndl:publicationVolume>
                  <dcndl:number>4</dcndl:number>
                  <dcndl:pageRange>p590～593</dcndl:pageRange>
              <dcterms:audience>一般</dcterms:audience>
                  <rdfs:seeAlso rdf:resource="https://ndlsearch.ndl.go.jp/books/R000000004-I2860002"/>
              <dcterms:isPartOf/>
              <dcterms:isPartOf rdf:resource="http://iss.ndl.go.jp/issn/00380113"/>
              <dcterms:isPartOf rdf:resource="http://iss.ndl.go.jp/issnl/00380113"/>
          </dcndl:BibResource>
      </rdf:RDF>
    `;

console.log('=== XMLパース修正版テスト ===');

let parsedRecordData;
xml2js.parseString(recordDataString, {
  explicitArray: false,
  ignoreAttrs: false,
  mergeAttrs: true
}, (err, parsed) => {
  if (err) {
    console.error('エラー:', err);
    return;
  }
  parsedRecordData = parsed;
});

console.log('パース成功:', !!parsedRecordData);
console.log('rdf:RDF存在:', !!parsedRecordData['rdf:RDF']);
console.log('dcndl:BibResource存在:', !!parsedRecordData['rdf:RDF']?.['dcndl:BibResource']);

if (parsedRecordData['rdf:RDF']?.['dcndl:BibResource']) {
  const bibResource = parsedRecordData['rdf:RDF']['dcndl:BibResource'];
  console.log('\n=== 抽出結果 ===');
  console.log('title:', bibResource['dcterms:title']);
  console.log('creator:', bibResource['dcterms:creator']?.['foaf:Agent']?.['foaf:name']);
  console.log('date:', bibResource['dcterms:issued']);
  console.log('identifier:', bibResource['dcterms:identifier']);
}