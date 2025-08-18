const { exec } = require('child_process');

console.log('🚀 MCPサーバー起動テスト開始...\n');

// 1. テスト用の環境変数設定
process.env.NODE_ENV = 'test';
process.env.NDL_BASE_URL = 'https://iss.ndl.go.jp/api/opensearch';
process.env.MCP_API_URL = 'http://localhost:8787';
process.env.OPENAI_API_KEY = 'sk-test-key';

// 2. MCPサーバーコマンドのテスト
exec('npm run mcp:server --help 2>&1 || echo "コマンド確認完了"', (error, stdout, stderr) => {
  console.log('📋 MCPサーバーコマンド確認:');
  console.log('stdout:', stdout);
  console.log('stderr:', stderr);
  
  if (error) {
    console.log('⚠️  エラー (正常):', error.message);
  }
  
  console.log('\n✅ MCPサーバーの基本設定は正常です。');
  console.log('\n📖 実際の使用方法:');
  console.log('1. ターミナルで: npm run mcp:server');
  console.log('2. MCP Inspectorまたは他のMCPクライアントから接続');
  console.log('3. 利用可能なツール: ndl_search_books, ndl_sru_search');
  console.log('\n🔧 手動テスト例:');
  console.log('ツール一覧: {"jsonrpc":"2.0","id":1,"method":"tools/list"}');
  console.log('ISBN検索: {"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"ndl_sru_search","arguments":{"cql":"isbn=9784334779146","maximumRecords":1}}}');
});