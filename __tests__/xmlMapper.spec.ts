import { parseNdlXmlToRecords } from '../src/core/xmlMapper';
import fs from 'fs';
import path from 'path';

describe('XMLMapper', () => {
  let sampleXml: string;

  beforeAll(() => {
    sampleXml = fs.readFileSync(path.join(__dirname, '../fixtures/ndl_result_sample.xml'), 'utf8');
  });

  describe('Successful mapping', () => {
    test('should parse sample XML and convert to MCPRecords', () => {
      const records = parseNdlXmlToRecords(sampleXml);

      expect(records).toHaveLength(3);

      // Check first record (Japanese magazine article)
      const firstRecord = records[0];
      expect(firstRecord.id).toBe('ndl:030474683');
      expect(firstRecord.title).toBe('アーカイブズ : 温故知新(その1)昭和四一年...');
      expect(firstRecord.creators).toEqual([]);
      expect(firstRecord.pub_date).toBe('2020-06');
      expect(firstRecord.identifiers?.NDLBibID).toBe('030474683');
      expect(firstRecord.subjects).toContain('茶道');
      expect(firstRecord.source.provider).toBe('NDL');
      expect(firstRecord.source.retrieved_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(firstRecord.raw_record).toContain('<dcterms:title>');
    });

    test('should handle multiple creators correctly', () => {
      const records = parseNdlXmlToRecords(sampleXml);
      
      // Second record should have multiple creators
      const secondRecord = records[1];
      expect(secondRecord.id).toBe('ndl:030474684');
      expect(secondRecord.creators).toEqual(['田中, 太郎', '山田, 花子']);
      expect(secondRecord.subjects).toContain('茶道具');
      expect(secondRecord.subjects).toContain('工芸');
    });

    test('should handle English content correctly', () => {
      const records = parseNdlXmlToRecords(sampleXml);
      
      // Third record is in English
      const thirdRecord = records[2];
      expect(thirdRecord.id).toBe('ndl:000123456');
      expect(thirdRecord.title).toBe('Tea Culture in Modern Japan');
      expect(thirdRecord.creators).toEqual(['Smith, John']);
      expect(thirdRecord.pub_date).toBe('2019-03');
      expect(thirdRecord.subjects).toContain('tea ceremony');
      expect(thirdRecord.subjects).toContain('Japanese culture');
    });

    test('should generate proper source metadata', () => {
      const records = parseNdlXmlToRecords(sampleXml);
      
      records.forEach(record => {
        expect(record.source.provider).toBe('NDL');
        expect(record.source.retrieved_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
        expect(record.raw_record).toBeTruthy();
      });
    });
  });

  describe('Edge cases', () => {
    test('should handle empty XML response', () => {
      const emptyXml = `<?xml version="1.0" encoding="UTF-8"?>
<searchRetrieveResponse>
  <numberOfRecords>0</numberOfRecords>
  <records></records>
</searchRetrieveResponse>`;

      const records = parseNdlXmlToRecords(emptyXml);
      expect(records).toHaveLength(0);
    });

    test('should handle record without title (should be filtered out)', () => {
      const invalidXml = `<?xml version="1.0" encoding="UTF-8"?>
<searchRetrieveResponse>
  <records>
    <record>
      <recordData>
        <rdf:RDF xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcndl="http://ndl.go.jp/dcndl/terms/">
          <dcndl:BibResource>
            <dcterms:identifier rdf:datatype="http://ndl.go.jp/dcndl/terms/NDLBibID">123456</dcterms:identifier>
            <!-- No title element -->
            <dcterms:creator>Test Author</dcterms:creator>
          </dcndl:BibResource>
        </rdf:RDF>
      </recordData>
    </record>
  </records>
</searchRetrieveResponse>`;

      const records = parseNdlXmlToRecords(invalidXml);
      expect(records).toHaveLength(0); // Record without title should be filtered out
    });

    test('should handle missing NDLBibID gracefully', () => {
      const xmlWithoutId = `<?xml version="1.0" encoding="UTF-8"?>
<searchRetrieveResponse>
  <records>
    <record>
      <recordData>
        <rdf:RDF xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcndl="http://ndl.go.jp/dcndl/terms/">
          <dcndl:BibResource>
            <dcterms:title>Book Without ID</dcterms:title>
            <dcterms:creator>Anonymous</dcterms:creator>
          </dcndl:BibResource>
        </rdf:RDF>
      </recordData>
    </record>
  </records>
</searchRetrieveResponse>`;

      const records = parseNdlXmlToRecords(xmlWithoutId);
      expect(records).toHaveLength(1);
      expect(records[0].id).toMatch(/^ndl:[a-f0-9-]{36}$/); // Should generate UUID
      expect(records[0].title).toBe('Book Without ID');
    });

    test('should handle malformed XML gracefully', () => {
      const malformedXml = `<?xml version="1.0" encoding="UTF-8"?>
<searchRetrieveResponse>
  <records>
    <record>
      <recordData>
        <rdf:RDF xmlns:dcterms="http://purl.org/dc/terms/">
          <unclosed-tag>
            <dcterms:title>This XML is malformed</dcterms:title>
        </rdf:RDF>
      </recordData>
    </record>
  </records>
</searchRetrieveResponse>`;

      expect(() => parseNdlXmlToRecords(malformedXml)).toThrow();
    });

    test('should handle missing optional fields', () => {
      const minimalXml = `<?xml version="1.0" encoding="UTF-8"?>
<searchRetrieveResponse>
  <records>
    <record>
      <recordData>
        <rdf:RDF xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcndl="http://ndl.go.jp/dcndl/terms/">
          <dcndl:BibResource>
            <dcterms:identifier rdf:datatype="http://ndl.go.jp/dcndl/terms/NDLBibID">minimal123</dcterms:identifier>
            <dcterms:title>Minimal Record</dcterms:title>
          </dcndl:BibResource>
        </rdf:RDF>
      </recordData>
    </record>
  </records>
</searchRetrieveResponse>`;

      const records = parseNdlXmlToRecords(minimalXml);
      expect(records).toHaveLength(1);
      
      const record = records[0];
      expect(record.id).toBe('ndl:minimal123');
      expect(record.title).toBe('Minimal Record');
      expect(record.creators).toEqual([]);
      expect(record.pub_date).toBeUndefined();
      expect(record.subjects).toBeUndefined();
    });
  });

  describe('Field mapping validation', () => {
    test('should correctly map all NDL fields to MCP fields', () => {
      const complexXml = `<?xml version="1.0" encoding="UTF-8"?>
<searchRetrieveResponse>
  <records>
    <record>
      <recordData>
        <rdf:RDF xmlns:dc="http://purl.org/dc/elements/1.1/" 
                 xmlns:dcterms="http://purl.org/dc/terms/" 
                 xmlns:dcndl="http://ndl.go.jp/dcndl/terms/"
                 xmlns:foaf="http://xmlns.com/foaf/0.1/">
          <dcndl:BibResource>
            <dcterms:identifier rdf:datatype="http://ndl.go.jp/dcndl/terms/NDLBibID">complex123</dcterms:identifier>
            <dcterms:title>Complex Test Record</dcterms:title>
            <dcterms:creator><foaf:Agent><foaf:name>Last, First</foaf:name></foaf:Agent></dcterms:creator>
            <dcterms:issued>2023-12-25</dcterms:issued>
            <dcndl:publicationName>Test Journal</dcndl:publicationName>
            <dcndl:pageRange>1-10</dcndl:pageRange>
            <dcterms:publisher><foaf:Agent><foaf:name>Test Publisher</foaf:name></foaf:Agent></dcterms:publisher>
            <dcterms:language>jpn</dcterms:language>
            <dcterms:subject>test</dcterms:subject>
            <dcterms:subject>mapping</dcterms:subject>
          </dcndl:BibResource>
        </rdf:RDF>
      </recordData>
    </record>
  </records>
</searchRetrieveResponse>`;

      const records = parseNdlXmlToRecords(complexXml);
      expect(records).toHaveLength(1);
      
      const record = records[0];
      expect(record.id).toBe('ndl:complex123');
      expect(record.title).toBe('Complex Test Record');
      expect(record.creators).toEqual(['Last, First']);
      expect(record.pub_date).toBe('2023-12-25');
      expect(record.identifiers?.NDLBibID).toBe('complex123');
      expect(record.subjects).toEqual(['test', 'mapping']);
    });
  });
});