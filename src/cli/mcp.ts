#!/usr/bin/env node

import { startMCPServer } from '../mcp/server';

// Start the MCP server
startMCPServer().catch(error => {
  console.error('Failed to start NDL MCP server:', error);
  process.exit(1);
});