#!/usr/bin/env node

// Simple MCP test script
const { spawn } = require('child_process');

const server = spawn('/Users/kaz005/ndl/.mcp/run.sh', [], {
  stdio: ['pipe', 'pipe', 'inherit']
});

let initialized = false;

server.stdout.on('data', (data) => {
  const message = data.toString();
  console.log('Server response:', message);
  
  if (!initialized && message.includes('NDL MCP Server started')) {
    initialized = true;
    console.log('Server initialized, sending test request...');
    
    // Send initialize request
    const initRequest = {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2025-06-18",
        capabilities: {},
        clientInfo: { name: "test-client", version: "1.0.0" }
      }
    };
    
    server.stdin.write(JSON.stringify(initRequest) + '\n');
    
    setTimeout(() => {
      // Send search request
      const searchRequest = {
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: {
          name: "ndl_search_books",
          arguments: {
            query: "明代 税制 一条鞭法",
            maxRecords: 3,
            publishToMcp: false
          }
        }
      };
      
      console.log('Sending search request:', JSON.stringify(searchRequest));
      server.stdin.write(JSON.stringify(searchRequest) + '\n');
      
      setTimeout(() => {
        server.kill();
      }, 5000);
    }, 1000);
  }
});

server.on('error', (error) => {
  console.error('Server error:', error);
});

server.on('close', (code) => {
  console.log('Server closed with code:', code);
});