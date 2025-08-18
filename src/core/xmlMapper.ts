import * as xml2js from 'xml2js';
import { MCPRecord, LibraryHolding } from '../types/contracts';
import { NdlRecord } from '../types/ndl';
import { v4 as uuidv4 } from 'uuid';

export function parseNdlXmlToRecords(rawXml: string, includeHoldings = false): NdlRecord[] {
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

    const ndlRecords: NdlRecord[] = [];

    for (const record of records) {
      try {
        const ndlRecord = mapRecordToNDL(record, includeHoldings);
        if (ndlRecord) {
          ndlRecords.push(ndlRecord);
        }
      } catch (error) {
        console.warn('Failed to map record:', error);
        // Continue processing other records
      }
    }

    return ndlRecords;
  } catch (error) {
    console.error('Failed to parse NDL XML:', error);
    throw new Error(`XML parsing failed: ${error}`);
  }
}

function mapRecordToNDL(record: any, includeHoldings = false): NdlRecord | null {
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
    
    // 所蔵情報の抽出（dcndl:Itemエレメントから）
    const holdings = includeHoldings ? extractHoldings(recordData['rdf:RDF']) : [];

    // Generate source metadata (軽量化：rawフィールドと関連リンク情報を削除)
    const source = {
      provider: 'NDL' as const,
      retrieved_at: new Date().toISOString(),
      license: 'NDL Terms of Use'
      // raw: bibResource - 削除：データ量削減のため
    };

    // NdlRecord作成（所蔵情報含む）
    const ndlRecord: NdlRecord = {
      id,
      title,
      creators,
      subjects: subjects.length > 0 ? subjects : undefined,
      date: pub_date,
      language,
      holdings: holdings.length > 0 ? holdings : undefined,
      source: 'NDL',
      raw: bibResource
    };

    return ndlRecord;
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

/**
 * 所蔵情報を抽出する（dcndl:Itemエレメントから）
 */
function extractHoldings(rdfData: any): LibraryHolding[] {
  const holdings: LibraryHolding[] = [];
  
  // dcndl:Itemエレメントを探す
  const items = rdfData['dcndl:Item'];
  if (!items) {
    return holdings;
  }
  
  // 単一アイテムか配列かを判定
  const itemArray = Array.isArray(items) ? items : [items];
  
  for (const item of itemArray) {
    try {
      const holding = extractSingleHolding(item);
      if (holding) {
        holdings.push(holding);
      }
    } catch (error) {
      console.warn('Failed to extract holding information:', error);
    }
  }
  
  return holdings;
}

/**
 * 単一のdcndl:Itemから所蔵情報を抽出
 */
function extractSingleHolding(item: any): LibraryHolding | null {
  if (!item) return null;
  
  // 図書館情報の抽出（dcndl:holdingAgent > foaf:Agent）
  const holdingAgent = item['dcndl:holdingAgent'];
  if (!holdingAgent || !holdingAgent['foaf:Agent']) {
    return null;
  }
  
  const agent = holdingAgent['foaf:Agent'];
  const libraryName = agent['foaf:name'];
  if (!libraryName) {
    return null;
  }
  
  // NDL図書館コードの抽出
  let libraryCode: string | undefined;
  const identifier = agent['dcterms:identifier'];
  if (identifier && typeof identifier === 'object') {
    if (identifier['rdf:datatype'] && identifier['rdf:datatype'].includes('NDLLibCode')) {
      libraryCode = identifier._ || identifier;
    }
  }
  
  // その他の情報を抽出
  const callNumber = item['dcndl:callNumber'];
  const availability = item['dcndl:availability'];
  const opacUrl = item['rdfs:seeAlso'] && typeof item['rdfs:seeAlso'] === 'object' 
    ? item['rdfs:seeAlso']['rdf:resource'] 
    : item['rdfs:seeAlso'];
  
  // dcterms:descriptionから配架場所と資料種別を抽出
  let location: string | undefined;
  let materialType: string | undefined;
  
  const descriptions = item['dcterms:description'];
  if (descriptions) {
    const descArray = Array.isArray(descriptions) ? descriptions : [descriptions];
    for (const desc of descArray) {
      if (typeof desc === 'string') {
        if (desc.includes('配置場所') || desc.includes('配架場所')) {
          location = desc.replace(/^配[置架]場所\s*:\s*/, '');
        } else if (desc.includes('資料種別')) {
          materialType = desc.replace(/^資料種別\s*:\s*/, '');
        }
      }
    }
  }
  
  return {
    libraryName,
    libraryCode,
    callNumber,
    availability,
    location,
    materialType,
    opacUrl
  };
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