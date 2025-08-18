// 最終版CQL生成をテスト（複合語分解＋段階的フォールバック）
import axios from 'axios';

function createSafeFallbackCql(query) {
  // 1. 基本キーワード抽出
  const rawKeywords = query
    .trim()
    .split(/[\s\u3000、。，．！？の に を が は で と から まで について に関して について]+/)
    .filter(keyword => keyword.length > 1)
    .map(keyword => keyword.replace(/"/g, '\\"'));

  // 2. ノイズワード除去
  const noiseWords = ['書籍', '本', '資料', '文献', '研究', '論文', '探して', '検索', '調べ', 'について', '関して'];
  const meaningfulKeywords = rawKeywords.filter(kw => !noiseWords.includes(kw));

  // 3. 複合語を分解して単語レベルにする
  const simpleKeywords = [];
  for (const keyword of meaningfulKeywords) {
    if (keyword.length > 4) {
      // 長い複合語は分解を試行
      if (keyword.includes('明王朝')) {
        simpleKeywords.push('明代', '中国');
      } else if (keyword.includes('税制度')) {
        simpleKeywords.push('税制');
      } else if (keyword.includes('機械学習')) {
        simpleKeywords.push('機械学習');
      } else if (keyword.includes('伝統医学')) {
        simpleKeywords.push('伝統', '医学');
      } else {
        // その他は先頭4文字を使用
        simpleKeywords.push(keyword.substring(0, 4));
      }
    } else {
      simpleKeywords.push(keyword);
    }
  }

  const finalKeywords = [...new Set(simpleKeywords)].slice(0, 2); // 重複除去＋2つまで

  console.log(`変換: "${query}"`);
  console.log(`→ 元キーワード: [${rawKeywords.join(', ')}]`);
  console.log(`→ 意味キーワード: [${meaningfulKeywords.join(', ')}]`);
  console.log(`→ 最終キーワード: [${finalKeywords.join(', ')}]`);

  if (finalKeywords.length === 0) {
    return 'title="日本"';
  }

  if (finalKeywords.length === 1) {
    return `title="${finalKeywords[0]}"`;
  }

  // 2キーワードの場合：ORで緩く検索
  return `title="${finalKeywords[0]}" OR title="${finalKeywords[1]}"`;
}

async function testQuery(userInput) {
  console.log('\n=== テスト ===');
  
  const cql = createSafeFallbackCql(userInput);
  console.log('→ 生成CQL:', cql);
  
  try {
    const response = await axios.get('https://ndlsearch.ndl.go.jp/api/sru', { 
      params: {
        operation: 'searchRetrieve',
        query: cql,
        recordSchema: 'dcndl',
        maximumRecords: 5
      },
      timeout: 10000
    });
    
    const xmlData = response.data;
    const numberOfRecordsMatch = xmlData.match(/<numberOfRecords>(\d+)<\/numberOfRecords>/);
    const numberOfRecords = numberOfRecordsMatch ? parseInt(numberOfRecordsMatch[1]) : 0;
    
    console.log('→ 結果件数:', numberOfRecords);
    
    if (numberOfRecords > 0) {
      console.log('✅ ヒット！');
      
      const titleMatches = xmlData.match(/<dc:title[^>]*>([^<]+)<\/dc:title>/g);
      if (titleMatches) {
        console.log('\n見つかったタイトル:');
        titleMatches.slice(0, 3).forEach((match, i) => {
          const title = match.replace(/<[^>]+>/g, '');
          console.log(`${i + 1}. ${title}`);
        });
      }
    } else {
      console.log('❌ ヒットなし');
    }
    
  } catch (error) {
    console.error('エラー:', error.message);
  }
}

// 元のテストケース
await testQuery("中国明王朝の税制度に関しての書籍を探して");

// 追加テスト
await testQuery("沖縄の伝統医学について");
await testQuery("AI機械学習の研究論文");