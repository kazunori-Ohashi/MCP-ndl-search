#!/usr/bin/env node

const { spawn } = require('child_process');

// MCPサーバープロセスを起動
const server = spawn('npm', ['run', 'mcp:server'], {
  cwd: process.cwd(),
  stdio: ['pipe', 'pipe', 'pipe']
});

// MCPフレーム送信関数
function sendMCPFrame(jsonrpcMessage) {
  const message = JSON.stringify(jsonrpcMessage);
  const frame = `Content-Length: ${Buffer.byteLength(message, 'utf8')}\r\n\r\n${message}`;
  
  console.log('=== 送信フレーム ===');
  console.log(frame);
  console.log('=== 送信完了 ===\n');
  
  server.stdin.write(frame);
}

// レスポンス受信ハンドラ
let buffer = '';
server.stdout.on('data', (data) => {
  buffer += data.toString();
  
  // Content-Lengthヘッダをパース
  const headerMatch = buffer.match(/Content-Length: (\d+)\r?\n\r?\n/);
  if (headerMatch) {
    const contentLength = parseInt(headerMatch[1]);
    const headerEnd = buffer.indexOf('\r\n\r\n') + 4;
    
    if (buffer.length >= headerEnd + contentLength) {
      const jsonContent = buffer.slice(headerEnd, headerEnd + contentLength);
      
      console.log('=== 受信フレーム ===');
      console.log(`Content-Length: ${contentLength}`);
      console.log('');
      console.log(JSON.stringify(JSON.parse(jsonContent), null, 2));
      console.log('=== 受信完了 ===\n');
      
      buffer = buffer.slice(headerEnd + contentLength);
    }
  }
});

server.stderr.on('data', (data) => {
  console.log('=== サーバーログ ===');
  console.log(data.toString());
  console.log('=== ログ終了 ===\n');
});

// テストシーケンス
setTimeout(() => {
  console.log('📋 テスト1: ツール一覧取得\n');
  sendMCPFrame({
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list"
  });
}, 1000);

setTimeout(() => {
  console.log('📋 テスト2: SRU検索ツール実行\n');
  sendMCPFrame({
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "ndl_sru_search",
      "arguments": {
        "cql": "isbn=9784334779146",
        "maximumRecords": 1
      }
    }
  });
}, 3000);

setTimeout(() => {
  console.log('📋 テスト3: 自然言語検索ツール実行\n');
  sendMCPFrame({
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "ndl_search_books",
      "arguments": {
        "query": "沖縄 薬草 2015年以降",
        "maxRecords": 3,
        "preferLanguage": "jpn",
        "publishToMcp": false
      }
    }
  });
}, 5000);

// 10秒後に終了
setTimeout(() => {
  console.log('テスト完了。サーバーを終了します。');
  server.kill();
  process.exit(0);
}, 10000);

server.on('exit', (code) => {
  console.log(`MCPサーバーが終了しました (exit code: ${code})`);
});