import * as xml2js from 'xml2js';
import { MCPRecord } from '../types/contracts';
import { v4 as uuidv4 } from 'uuid';

export function parseNdlXmlToRecords(rawXml: string): MCPRecord[] {
  try {
    let result: any;
    xml2js.parseString(rawXml, {
      explicitArray: false,
      ignoreAttrs: false,
      mergeAttrs: true
    }, (err, parsed) => {
      if (err) throw err;
      result = parsed;
    });
    
    const response = result.searchRetrieveResponse;

    if (!response || !response.records || !response.records.record) {
      return [];
    }

    // Handle single record vs array of records
    const records = Array.isArray(response.records.record) 
      ? response.records.record 
      : [response.records.record];

    const mcpRecords: MCPRecord[] = [];

    for (const record of records) {
      try {
        const mcpRecord = mapRecordToMCP(record);
        if (mcpRecord) {
          mcpRecords.push(mcpRecord);
        }
      } catch (error) {
        console.warn('Failed to map record:', error);
        // Continue processing other records
      }
    }

    return mcpRecords;
  } catch (error) {
    console.error('Failed to parse NDL XML:', error);
    throw new Error(`XML parsing failed: ${error}`);
  }
}

function mapRecordToMCP(record: any): MCPRecord | null {
  try {
    let recordData = record.recordData;
    
    // recordDataが文字列の場合、XMLとして再パース
    if (typeof recordData === 'string') {
      let parsedRecordData: any;
      xml2js.parseString(recordData, {
        explicitArray: false,
        ignoreAttrs: false,
        mergeAttrs: true
      }, (err, parsed) => {
        if (err) throw err;
        parsedRecordData = parsed;
      });
      recordData = parsedRecordData;
    }
    
    if (!recordData || !recordData['rdf:RDF'] || !recordData['rdf:RDF']['dcndl:BibResource']) {
      return null;
    }

    // Handle single BibResource vs array of BibResources
    const bibResources = recordData['rdf:RDF']['dcndl:BibResource'];
    const bibResourceArray = Array.isArray(bibResources) ? bibResources : [bibResources];
    
    // Find the main bibliographic resource (usually the first one with complete data)
    let bibResource = null;
    for (const resource of bibResourceArray) {
      if (resource && (resource['dcterms:title'] || resource['dc:title'])) {
        bibResource = resource;
        break;
      }
    }
    
    if (!bibResource) {
      console.warn('No valid BibResource with title found');
      return null;
    }

    // Extract title (required field)
    const title = extractTitle(bibResource);
    if (!title) {
      console.warn('Record missing required title, skipping');
      console.warn('bibResource keys:', Object.keys(bibResource || {}));
      console.warn('dcterms:title:', bibResource?.['dcterms:title']);
      console.warn('dc:title:', bibResource?.['dc:title']);
      return null;
    }

    // Extract NDL BibID for ID generation
    const ndlBibId = extractNDLBibID(bibResource);
    const id = ndlBibId ? `ndl:${ndlBibId}` : `ndl:${uuidv4()}`;

    // Extract creators
    const creators = extractCreators(bibResource);

    // Extract other fields
    const pub_date = extractIssuedDate(bibResource);
    const identifiers = ndlBibId ? { NDLBibID: ndlBibId } : undefined;
    const subjects = extractSubjects(bibResource);
    const language = extractLanguage(bibResource);

    // Generate source metadata
    const source = {
      provider: 'NDL' as const,
      retrieved_at: new Date().toISOString(),
      license: 'NDL Terms of Use',
      raw: bibResource
    };

    // Convert record back to XML string for raw_record
    const builder = new xml2js.Builder({ headless: true });
    const rawRecordXml = builder.buildObject({ record });

    const mcpRecord: MCPRecord = {
      id,
      title,
      creators,
      ...(pub_date && { pub_date }),
      ...(identifiers && { identifiers }),
      ...(subjects.length > 0 && { subjects }),
      source,
      raw_record: rawRecordXml
    };

    // Add optional fields if present
    if (language) {
      mcpRecord.description = `Language: ${language}`;
    }

    return mcpRecord;
  } catch (error) {
    console.error('Error mapping record to MCP:', error);
    return null;
  }
}

function extractTitle(bibResource: any): string | undefined {
  // Try dcterms:title first, then dc:title
  return bibResource['dcterms:title'] || bibResource['dc:title'];
}

function extractNDLBibID(bibResource: any): string | undefined {
  const identifier = bibResource['dcterms:identifier'];
  if (!identifier) return undefined;

  // Handle string content with datatype attribute
  if (typeof identifier === 'string') {
    return identifier;
  }

  // Handle object with datatype attribute
  if (typeof identifier === 'object') {
    // Check for merged attributes (mergeAttrs: true)
    if (identifier['rdf:datatype'] && identifier['rdf:datatype'].includes('NDLBibID')) {
      // Content is in the text property or root
      return identifier._ || identifier;
    }
    
    // Check for $ property structure
    if (identifier.$ && identifier.$['rdf:datatype'] && 
        identifier.$['rdf:datatype'].includes('NDLBibID')) {
      return identifier._;
    }
  }
  
  return undefined;
}

function extractCreators(bibResource: any): string[] {
  const creators: string[] = [];
  
  // Handle both dcterms:creator and dc:creator
  const creatorFields = [bibResource['dcterms:creator'], bibResource['dc:creator']];
  
  for (const creatorField of creatorFields) {
    if (!creatorField) continue;

    const creatorArray = Array.isArray(creatorField) ? creatorField : [creatorField];
    
    for (const creator of creatorArray) {
      let creatorName: string | undefined;

      if (typeof creator === 'string') {
        creatorName = creator;
      } else if (creator && creator['foaf:Agent'] && creator['foaf:Agent']['foaf:name']) {
        creatorName = creator['foaf:Agent']['foaf:name'];
      } else if (creator && creator['foaf:name']) {
        creatorName = creator['foaf:name'];
      }

      if (creatorName && !creators.includes(creatorName)) {
        creators.push(creatorName);
      }
    }
  }

  return creators;
}

function extractIssuedDate(bibResource: any): string | undefined {
  return bibResource['dcterms:issued'];
}

function extractSubjects(bibResource: any): string[] {
  const subjects: string[] = [];
  
  // Handle both dcterms:subject and dc:subject
  const subjectFields = [bibResource['dcterms:subject'], bibResource['dc:subject']];
  
  for (const subjectField of subjectFields) {
    if (!subjectField) continue;

    const subjectArray = Array.isArray(subjectField) ? subjectField : [subjectField];
    
    for (const subject of subjectArray) {
      if (typeof subject === 'string' && !subjects.includes(subject)) {
        subjects.push(subject);
      }
    }
  }

  return subjects;
}

function extractLanguage(bibResource: any): string | undefined {
  return bibResource['dcterms:language'];
}

// function extractPublisher(bibResource: any): string | undefined {
//   const publisher = bibResource['dcterms:publisher'];
//   if (!publisher) return undefined;

//   if (typeof publisher === 'string') {
//     return publisher;
//   }

//   // Handle foaf:Agent structure
//   if (publisher['foaf:Agent'] && publisher['foaf:Agent']['foaf:name']) {
//     return publisher['foaf:Agent']['foaf:name'];
//   }

//   return undefined;
// }