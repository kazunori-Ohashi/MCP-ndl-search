import { searchBooksTool, handleSearchBooks } from './searchBooks';
import { sruSearchTool, handleSruSearch } from './sruSearch';
import { searchByDescriptionTool, handleSearchByDescription } from './searchByDescription';
import { searchBySubjectTool, handleSearchBySubject } from './searchBySubject';
import { searchByTitleTool, handleSearchByTitle } from './searchByTitle';

export { searchBooksTool, handleSearchBooks, type SearchBooksArgs, type SearchBooksResult } from './searchBooks';
export { sruSearchTool, handleSruSearch, type SruSearchArgs, type SruSearchResult } from './sruSearch';
export { searchByDescriptionTool, handleSearchByDescription, type SearchByDescriptionArgs, type SearchByDescriptionResult } from './searchByDescription';
export { searchBySubjectTool, handleSearchBySubject, type SearchBySubjectArgs, type SearchBySubjectResult } from './searchBySubject';
export { searchByTitleTool, handleSearchByTitle, type SearchByTitleArgs, type SearchByTitleResult } from './searchByTitle';

// Export all available tools for MCP server registration
export const NDL_TOOLS = [
  searchBooksTool,
  sruSearchTool,
  searchByDescriptionTool,
  searchBySubjectTool,
  searchByTitleTool
] as const;

// Tool handlers map for easy lookup
export const TOOL_HANDLERS = {
  'ndl_search_books': handleSearchBooks,
  'ndl_sru_search': handleSruSearch,
  'ndl_search_by_description': handleSearchByDescription,
  'ndl_search_by_subject': handleSearchBySubject,
  'ndl_search_by_title': handleSearchByTitle
} as const;

export type ToolName = keyof typeof TOOL_HANDLERS;