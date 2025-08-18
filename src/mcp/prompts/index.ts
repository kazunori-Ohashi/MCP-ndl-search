import { ndlSearchGuidePrompt, generateNDLSearchGuide } from './ndlSearchGuide';
import { searchExamplesPrompt, generateSearchExamples } from './searchExamples';
import { ndlSearchMethodologyPrompt, generateNDLSearchMethodology } from './ndlSearchMethodology';
import { ndlQualityControlPrompt, generateNDLQualityControl } from './ndlQualityControl';
import { ndlSearchOptimizationPrompt, generateNDLSearchOptimization } from './ndlSearchOptimization';

export { ndlSearchGuidePrompt, generateNDLSearchGuide } from './ndlSearchGuide';
export { searchExamplesPrompt, generateSearchExamples } from './searchExamples';
export { ndlSearchMethodologyPrompt, generateNDLSearchMethodology } from './ndlSearchMethodology';
export { ndlQualityControlPrompt, generateNDLQualityControl } from './ndlQualityControl';
export { ndlSearchOptimizationPrompt, generateNDLSearchOptimization } from './ndlSearchOptimization';

// Export all available prompts for MCP server registration
export const NDL_PROMPTS = [
  ndlSearchGuidePrompt,
  searchExamplesPrompt,
  ndlSearchMethodologyPrompt,
  ndlQualityControlPrompt,
  ndlSearchOptimizationPrompt
] as const;

// Prompt handlers map for easy lookup
export const PROMPT_HANDLERS = {
  'ndl_search_guide': generateNDLSearchGuide,
  'ndl_search_examples': generateSearchExamples,
  'ndl_search_methodology': generateNDLSearchMethodology,
  'ndl_quality_control': generateNDLQualityControl,
  'ndl_search_optimization': generateNDLSearchOptimization
} as const;

export type PromptName = keyof typeof PROMPT_HANDLERS;