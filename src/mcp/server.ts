import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { 
  CallToolRequestSchema, 
  ListToolsRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
import { NDL_TOOLS, TOOL_HANDLERS, type ToolName } from './tools/index';
import { NDL_PROMPTS, PROMPT_HANDLERS, type PromptName } from './prompts/index';
import { env } from '../utils/env';

// Server metadata
const SERVER_INFO = {
  name: 'ndl-mcp-pipeline',
  version: '1.0.0',
  description: 'National Diet Library MCP Pipeline - Search books and publish to MCP'
};

export class NDLMCPServer {
  private server: Server;

  constructor() {
    this.server = new Server(SERVER_INFO, {
      capabilities: {
        tools: {},
        prompts: {}
      }
    });

    this.setupHandlers();
  }

  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: NDL_TOOLS
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      if (!(name in TOOL_HANDLERS)) {
        throw new Error(`Unknown tool: ${name}`);
      }

      const toolName = name as ToolName;
      const handler = TOOL_HANDLERS[toolName];

      try {
        // Validate arguments based on tool name
        const validatedArgs = this.validateToolArguments(toolName, args);
        
        // Execute the tool handler
        const result = await handler(validatedArgs as any);

        return {
          content: [{
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }]
        };

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`Tool execution failed for ${name}:`, errorMessage);
        
        return {
          content: [{
            type: 'text', 
            text: JSON.stringify({
              success: false,
              error: errorMessage,
              tool: name
            }, null, 2)
          }],
          isError: true
        };
      }
    });

    // List available prompts
    this.server.setRequestHandler(ListPromptsRequestSchema, async () => {
      return {
        prompts: NDL_PROMPTS
      };
    });

    // Handle prompt requests
    this.server.setRequestHandler(GetPromptRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      if (!(name in PROMPT_HANDLERS)) {
        throw new Error(`Unknown prompt: ${name}`);
      }

      try {
        const promptName = name as PromptName;
        const handler = PROMPT_HANDLERS[promptName];
        
        // Extract argument based on prompt type
        let argument: string | undefined;
        if (args) {
          const argsObj = args as Record<string, unknown>;
          argument = (argsObj.search_type || argsObj.scenario || argsObj.focus_area || argsObj.quality_aspect || argsObj.search_scenario) as string;
        }
        
        const content = handler(argument);
        
        return {
          description: `NDL search guidance: ${name}`,
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: content
              }
            }
          ]
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`Prompt generation failed for ${name}:`, errorMessage);
        
        return {
          description: `Error generating prompt: ${name}`,
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: `Error: ${errorMessage}`
              }
            }
          ]
        };
      }
    });
  }

  private validateToolArguments(toolName: ToolName, args: unknown): object {
    if (!args || typeof args !== 'object') {
      throw new Error(`Invalid arguments for tool ${toolName}: expected object`);
    }

    const argsObj = args as Record<string, unknown>;

    switch (toolName) {
      case 'ndl_search_books':
        if (!argsObj.query || typeof argsObj.query !== 'string') {
          throw new Error('ndl_search_books requires a "query" string parameter');
        }
        return {
          query: argsObj.query,
          maxRecords: typeof argsObj.maxRecords === 'number' ? argsObj.maxRecords : 20,
          publishToMcp: typeof argsObj.publishToMcp === 'boolean' ? argsObj.publishToMcp : true
        };

      case 'ndl_sru_search':
        if (!argsObj.cql || typeof argsObj.cql !== 'string') {
          throw new Error('ndl_sru_search requires a "cql" string parameter');
        }
        return {
          cql: argsObj.cql,
          maxRecords: typeof argsObj.maxRecords === 'number' ? argsObj.maxRecords : 20,
          startRecord: typeof argsObj.startRecord === 'number' ? argsObj.startRecord : 1,
          format: typeof argsObj.format === 'string' ? argsObj.format : 'dcndl'
        };

      case 'ndl_search_by_description':
        if (!argsObj.description || typeof argsObj.description !== 'string') {
          throw new Error('ndl_search_by_description requires a "description" string parameter');
        }
        return {
          description: argsObj.description,
          titleKeyword: typeof argsObj.titleKeyword === 'string' ? argsObj.titleKeyword : '',
          maxRecords: typeof argsObj.maxRecords === 'number' ? argsObj.maxRecords : 20,
          publishToMcp: typeof argsObj.publishToMcp === 'boolean' ? argsObj.publishToMcp : true,
          output_format: typeof argsObj.output_format === 'string' ? argsObj.output_format : undefined,
          includeHoldings: typeof argsObj.includeHoldings === 'boolean' ? argsObj.includeHoldings : false
        };

      case 'ndl_search_by_subject':
        if (!argsObj.subject || typeof argsObj.subject !== 'string') {
          throw new Error('ndl_search_by_subject requires a "subject" string parameter');
        }
        return {
          subject: argsObj.subject,
          additionalSubject: typeof argsObj.additionalSubject === 'string' ? argsObj.additionalSubject : '',
          maxRecords: typeof argsObj.maxRecords === 'number' ? argsObj.maxRecords : 20,
          publishToMcp: typeof argsObj.publishToMcp === 'boolean' ? argsObj.publishToMcp : true,
          output_format: typeof argsObj.output_format === 'string' ? argsObj.output_format : undefined,
          includeHoldings: typeof argsObj.includeHoldings === 'boolean' ? argsObj.includeHoldings : false
        };

      case 'ndl_search_by_title':
        if (!argsObj.title || typeof argsObj.title !== 'string') {
          throw new Error('ndl_search_by_title requires a "title" string parameter');
        }
        return {
          title: argsObj.title,
          additionalTitle: typeof argsObj.additionalTitle === 'string' ? argsObj.additionalTitle : '',
          maxRecords: typeof argsObj.maxRecords === 'number' ? argsObj.maxRecords : 20,
          publishToMcp: typeof argsObj.publishToMcp === 'boolean' ? argsObj.publishToMcp : true,
          output_format: typeof argsObj.output_format === 'string' ? argsObj.output_format : undefined,
          includeHoldings: typeof argsObj.includeHoldings === 'boolean' ? argsObj.includeHoldings : false
        };

      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  }

  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    console.error(`NDL MCP Server started on stdio`);
    console.error(`Environment: ${env.NODE_ENV}`);
    console.error(`Available tools: ${NDL_TOOLS.map(tool => tool.name).join(', ')}`);
    console.error(`Available prompts: ${NDL_PROMPTS.map(prompt => prompt.name).join(', ')}`);
  }

  async stop(): Promise<void> {
    await this.server.close();
    console.error('NDL MCP Server stopped');
  }
}

// CLI entry point
export async function startMCPServer(): Promise<void> {
  const server = new NDLMCPServer();
  
  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.error('Received SIGINT, shutting down gracefully...');
    await server.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.error('Received SIGTERM, shutting down gracefully...');
    await server.stop();
    process.exit(0);
  });

  await server.start();
}

// Auto-start if this module is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startMCPServer().catch(error => {
    console.error('Failed to start MCP server:', error);
    process.exit(1);
  });
}