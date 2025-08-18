// LLM Adapter Interface
export interface LLMClient {
  generateCqlCandidates(
    naturalLanguage: string, 
    options?: { maxCandidates?: number }
  ): Promise<Array<{
    cql: string;
    confidence?: number;
    explanation?: string;
  }>>;
}

export interface LLMConfig {
  provider: 'openai' | 'anthropic' | 'azure' | 'ollama';
  model: string;
  temperature: number;
  topP: number;
  maxTokens?: number;
}

export interface LLMResponse {
  candidates: Array<{
    cql: string;
    confidence?: number;
    explanation?: string;
  }>;
  tokensUsed?: {
    input: number;
    output: number;
  };
  provider: string;
  model: string;
}