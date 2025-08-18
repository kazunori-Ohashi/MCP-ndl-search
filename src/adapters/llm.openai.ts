import OpenAI from 'openai';
import { readFileSync } from 'fs';
import { join } from 'path';
import { LLMClient } from './llm.types';

export interface OpenAIClientConfig {
  apiKey: string;
  model: string;
  temperature: number;
  topP: number;
}

export class OpenAILLMClient implements LLMClient {
  private client: OpenAI;
  private model: string;
  private temperature: number;
  private topP: number;
  private promptConfig: any;

  constructor(config: OpenAIClientConfig) {
    this.client = new OpenAI({ apiKey: config.apiKey });
    this.model = config.model;
    this.temperature = config.temperature;
    this.topP = config.topP;
    
    try {
      const promptPath = join(process.cwd(), 'config', 'LLM_PROMPT.json');
      this.promptConfig = JSON.parse(readFileSync(promptPath, 'utf-8'));
    } catch (error) {
      console.error('Failed to load LLM_PROMPT.json:', error instanceof Error ? error.message : String(error));
      this.promptConfig = { 
        system: 'You are a safe CQL generator for NDL SRU. Given a user natural language request, produce up to 3 candidate CQL queries using only allowed fields: title, creator, subject, isbn, issued, language. Output a JSON array of objects: { cql, confidence, explanation }.',
        few_shot: [] 
      };
    }
  }

  async generateCqlCandidates(
    naturalLanguage: string,
    options: { maxCandidates?: number } = {}
  ): Promise<Array<{ cql: string; confidence?: number; explanation?: string }>> {
    const { maxCandidates = 3 } = options;

    try {
      // Build messages from prompt config
      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        { role: 'system', content: this.promptConfig.system }
      ];

      // Add few-shot examples
      if (this.promptConfig.few_shot && Array.isArray(this.promptConfig.few_shot)) {
        for (const example of this.promptConfig.few_shot) {
          messages.push({ role: 'user', content: example.input });
          messages.push({ 
            role: 'assistant', 
            content: JSON.stringify(example.output) 
          });
        }
      }

      // Add current request (mask PII in logs)
      messages.push({ role: 'user', content: naturalLanguage });
      
      console.error(`llm.gen: request to ${this.model}, input_chars=${naturalLanguage.length}`);

      const response = await this.client.chat.completions.create({
        model: this.model,
        messages,
        temperature: this.temperature,
        top_p: this.topP,
        max_tokens: 800
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        console.error('llm.gen: OpenAI returned empty content');
        return [];
      }

      // Parse JSON response
      let parsedResponse: any;
      try {
        parsedResponse = JSON.parse(content);
      } catch (parseError) {
        console.error('llm.gen: Failed to parse OpenAI JSON response');
        return [];
      }

      // Extract candidates array
      let candidates: any[] = [];
      if (Array.isArray(parsedResponse)) {
        candidates = parsedResponse;
      } else if (parsedResponse.candidates && Array.isArray(parsedResponse.candidates)) {
        candidates = parsedResponse.candidates;
      } else {
        console.error('llm.gen: Response does not contain valid candidates array');
        return [];
      }

      // Validate and transform candidates
      const validCandidates = candidates
        .slice(0, maxCandidates)
        .map(candidate => ({
          cql: String(candidate.cql || ''),
          confidence: typeof candidate.confidence === 'number' ? candidate.confidence : undefined,
          explanation: typeof candidate.explanation === 'string' ? candidate.explanation : undefined
        }))
        .filter(candidate => candidate.cql.length > 0);

      console.error(`llm.gen: returned ${validCandidates.length} candidates`);
      return validCandidates;

    } catch (error) {
      console.error('llm.gen: OpenAI API call failed:', error instanceof Error ? error.message : String(error));
      return [];
    }
  }
}