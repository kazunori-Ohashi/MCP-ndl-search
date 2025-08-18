import { Prompt } from '@modelcontextprotocol/sdk/types.js';

export const ndlSearchGuidePrompt: Prompt = {
  name: 'ndl_search_guide',
  description: 'NDL (National Diet Library) search tools usage guide and examples',
  arguments: [
    {
      name: 'search_type',
      description: 'Type of search guidance needed',
      required: false
    }
  ]
};

export function generateNDLSearchGuide(searchType?: string): string {
  const baseGuide = `
# NDL (National Diet Library) Search Tools Usage Guide

## Available Tools Overview

### 1. ndl_search_by_description
**Purpose**: Search books by content/topic keywords in descriptions
**Best for**: Finding books about specific topics, themes, or subjects
**Examples**:
- \`description: "伝記"\` → Find biographical works
- \`description: "研究"\` → Find research publications  
- \`description: "歴史"\` → Find historical works
- \`description: "経済", titleKeyword: "日本"\` → Find Japanese economic books

### 2. ndl_search_by_subject
**Purpose**: Search books by official subject classification
**Best for**: Finding books categorized under specific academic subjects
**Examples**:
- \`subject: "聖徳太子"\` → Books officially about Prince Shotoku
- \`subject: "仏教"\` → Books classified under Buddhism
- \`subject: "日本史", additionalSubject: "古代"\` → Ancient Japanese history
- \`subject: "経済史"\` → Economic history books

### 3. ndl_search_by_title  
**Purpose**: Search books by title keywords
**Best for**: Finding books with specific words in titles
**Examples**:
- \`title: "源氏物語"\` → Books with "Tale of Genji" in title
- \`title: "聖徳太子", additionalTitle: "伝記"\` → Prince Shotoku biographies
- \`title: "経済"\` → Books with "economics" in title

### 4. ndl_search_books (Advanced)
**Purpose**: AI-powered intelligent search with natural language
**Best for**: Complex queries requiring interpretation
**Examples**:
- \`query: "聖徳太子の生涯について詳しく知りたい", searchMode: "intelligent"\`
- \`query: "飛鳥時代の仏教伝来", searchMode: "advanced"\`

## 🚨 CRITICAL: Tool Selection Priority (Follow This Order!)

### 🥇 ALWAYS TRY FIRST: ndl_search_by_description
**Use for 90% of searches - This finds books by CONTENT, not just titles**

**When to use** (Almost always!):
- Research about ANY topic: "Buddhism", "economics", "history", "culture"
- Finding books that DISCUSS a subject: "tax systems", "economic policy", "biographical studies"
- Content-based discovery: Books that contain information about your topic

**Examples**:
- User wants "books about Ming Dynasty economics" → \`description: "経済", titleKeyword: "明"\`
- User wants "biographies of historical figures" → \`description: "伝記"\`
- User wants "research on tea ceremony" → \`description: "研究", titleKeyword: "茶道"\`

### 🥈 SECOND CHOICE: ndl_search_by_subject  
**Only when you need official academic classifications**

**When to use**:
- Academic research requiring formal subject headings
- Systematic literature reviews in specific fields
- When description search yields too few results

**Examples**:
- \`subject: "日本史"\` for official Japanese history classification
- \`subject: "聖徳太子", additionalSubject: "仏教"\` for related academic categories

### 🥉 THIRD CHOICE: ndl_search_by_title
**Only for specific title searches**

**When to use**:
- Looking for books with specific words in titles
- Finding particular editions or series
- When you know exact title elements

**Examples**:
- \`title: "源氏物語"\` for Tale of Genji editions
- \`title: "明治", additionalTitle: "経済"\` for books with both words in title

### 🔧 LAST RESORT: ndl_search_books
**Only for very complex, multi-concept queries that need AI interpretation**

**When to use**:
- Extremely complex research questions
- When simpler methods fail
- Multi-faceted academic inquiries

**Examples**:
- "Compare economic policies across three different historical periods"
- "Analyze the intersection of religion, politics, and culture in ancient Japan"

## 🎯 MANDATORY Best Practices

1. **🥇 DESCRIPTION FIRST**: Start with ndl_search_by_description for 90% of queries
2. **Content over titles**: Think about what the book DISCUSSES, not what it's CALLED
3. **Japanese keywords**: Use Japanese terms for best results ("経済" not "economy")
4. **Combine description + titleKeyword**: Most powerful combination for precision
5. **Start small**: Use maxRecords 3-10 initially to test relevance

## ⚠️ AVOID These Common Mistakes

❌ **Using ndl_search_books for simple topic searches**
→ ✅ Use ndl_search_by_description instead

❌ **Using ndl_search_by_title for research topics**  
→ ✅ Use ndl_search_by_description with titleKeyword

❌ **Skipping description search**
→ ✅ ALWAYS try description search first

❌ **English keywords for Japanese content**
→ ✅ Use Japanese academic terms

## 🔄 Recommended Search Patterns (Description First!)

### 🎯 Standard Research Pattern (Use This!):
1. **\`ndl_search_by_description\`** with topic keyword + titleKeyword
2. **\`ndl_search_by_subject\`** if you need official classifications  
3. **\`ndl_search_by_title\`** only for specific title elements

### 📚 Content Discovery Pattern:
1. **\`ndl_search_by_description\`** with broad topic ("歴史", "経済", "文化")
2. **Refine with titleKeyword** for specific focus
3. **\`ndl_search_by_subject\`** for academic categorization

### 👤 Biographical Research Pattern:
1. **\`ndl_search_by_description\`** with "伝記" + person's name as titleKeyword
2. **\`ndl_search_by_subject\`** with person's name
3. **\`ndl_search_by_title\`** only for known biographical works

### 🏛️ Historical Research Pattern:
1. **\`ndl_search_by_description\`** with period/topic + "歴史"/"研究"
2. **\`ndl_search_by_description\`** with specific aspect + period as titleKeyword
3. **\`ndl_search_by_subject\`** for systematic academic coverage
`;

  const specificGuides: Record<string, string> = {
    'description': `
# Description Search Deep Dive

Description search is the most powerful tool for finding books by content/topic.

## Key Strategies:
- Use topic keywords: "経済", "歴史", "文化", "研究"
- Combine with titleKeyword for precision: description="伝記", titleKeyword="織田信長"
- Think about what the book is ABOUT, not just title words

## High-Value Description Keywords:
- "伝記" (biography) - for biographical works
- "研究" (research) - for academic studies  
- "歴史" (history) - for historical works
- "分析" (analysis) - for analytical works
- "文化" (culture) - for cultural studies
- "経済" (economics) - for economic topics
- "政治" (politics) - for political topics
`,

    'subject': `
# Subject Search Deep Dive

Subject search finds books officially classified under specific academic subjects.

## Key Strategies:
- Use proper names: "聖徳太子", "源氏物語", "織田信長"
- Use academic fields: "日本史", "文学", "仏教"
- Combine subjects with additionalSubject for intersection
- More precise than description search

## High-Value Subject Categories:
- "日本史" - Japanese history
- "文学" - Literature  
- "仏教" - Buddhism
- "経済史" - Economic history
- "政治史" - Political history
`,

    'title': `
# Title Search Deep Dive

Title search finds books with specific keywords in their titles.

## Key Strategies:
- Use exact terms you expect in titles
- Good for finding specific works or series
- Combine multiple title keywords with additionalTitle
- Most precise but potentially most limiting

## Common Title Patterns:
- Person names: "聖徳太子", "織田信長"
- Work titles: "源氏物語", "平家物語"  
- Topic + type: "日本" + "歴史"
- Time periods: "明治", "江戸", "平安"
`
  };

  if (searchType && specificGuides[searchType]) {
    return baseGuide + specificGuides[searchType];
  }

  return baseGuide;
}