import { Prompt } from '@modelcontextprotocol/sdk/types.js';

export const searchExamplesPrompt: Prompt = {
  name: 'ndl_search_examples',
  description: 'Practical examples of NDL search queries for different research scenarios',
  arguments: [
    {
      name: 'scenario',
      description: 'Research scenario type (biography, history, literature, economics, culture)',
      required: false
    }
  ]
};

export function generateSearchExamples(scenario?: string): string {
  const examples = {
    biography: `
# Biographical Research Examples

## Scenario: Research about Prince Shotoku (聖徳太子)

### Step 1: Get official biographical materials
\`\`\`
Tool: ndl_search_by_subject
Parameters: {
  "subject": "聖徳太子",
  "maxRecords": 10
}
\`\`\`

### Step 2: Find biographical works specifically  
\`\`\`
Tool: ndl_search_by_description
Parameters: {
  "description": "伝記",
  "titleKeyword": "聖徳太子",
  "maxRecords": 10
}
\`\`\`

### Step 3: Find books with Prince Shotoku in title
\`\`\`
Tool: ndl_search_by_title
Parameters: {
  "title": "聖徳太子",
  "maxRecords": 10
}
\`\`\`

### Alternative: Natural language approach
\`\`\`
Tool: ndl_search_books
Parameters: {
  "query": "聖徳太子の生涯と業績について詳しく知りたい",
  "searchMode": "intelligent",
  "maxRecords": 10
}
\`\`\`
`,

    history: `
# Historical Research Examples

## Scenario: Research about Meiji Restoration economic impact

### Step 1: Find economic history materials
\`\`\`
Tool: ndl_search_by_subject
Parameters: {
  "subject": "経済史",
  "additionalSubject": "明治時代",
  "maxRecords": 10
}
\`\`\`

### Step 2: Search for economic analysis content
\`\`\`
Tool: ndl_search_by_description
Parameters: {
  "description": "経済",
  "titleKeyword": "明治",
  "maxRecords": 10
}
\`\`\`

### Step 3: Find books about Meiji economic policy
\`\`\`
Tool: ndl_search_by_title
Parameters: {
  "title": "明治",
  "additionalTitle": "経済",
  "maxRecords": 10
}
\`\`\`
`,

    literature: `
# Literature Research Examples

## Scenario: Research about Tale of Genji (源氏物語)

### Step 1: Find academic literature studies
\`\`\`
Tool: ndl_search_by_subject
Parameters: {
  "subject": "源氏物語",
  "maxRecords": 15
}
\`\`\`

### Step 2: Find research and analysis works
\`\`\`
Tool: ndl_search_by_description
Parameters: {
  "description": "研究",
  "titleKeyword": "源氏物語",
  "maxRecords": 10
}
\`\`\`

### Step 3: Find commentaries and interpretations
\`\`\`
Tool: ndl_search_by_description
Parameters: {
  "description": "分析",
  "titleKeyword": "源氏物語",
  "maxRecords": 10
}
\`\`\`

### Step 4: Find specific editions and translations
\`\`\`
Tool: ndl_search_by_title
Parameters: {
  "title": "源氏物語",
  "maxRecords": 20
}
\`\`\`
`,

    economics: `
# Economic Research Examples

## Scenario: Research about post-war Japanese economic miracle

### Step 1: Find economic history materials
\`\`\`
Tool: ndl_search_by_subject
Parameters: {
  "subject": "経済史",
  "additionalSubject": "戦後",
  "maxRecords": 10
}
\`\`\`

### Step 2: Find economic growth studies
\`\`\`
Tool: ndl_search_by_description
Parameters: {
  "description": "経済成長",
  "maxRecords": 15
}
\`\`\`

### Step 3: Find policy analysis works
\`\`\`
Tool: ndl_search_by_description
Parameters: {
  "description": "政策",
  "titleKeyword": "戦後",
  "maxRecords": 10
}
\`\`\`

### Step 4: Find books about economic miracle
\`\`\`
Tool: ndl_search_by_title
Parameters: {
  "title": "経済",
  "additionalTitle": "戦後",
  "maxRecords": 10
}
\`\`\`
`,

    culture: `
# Cultural Research Examples

## Scenario: Research about traditional Japanese tea ceremony

### Step 1: Find cultural studies materials
\`\`\`
Tool: ndl_search_by_subject
Parameters: {
  "subject": "茶道",
  "maxRecords": 15
}
\`\`\`

### Step 2: Find books about tea ceremony culture
\`\`\`
Tool: ndl_search_by_description
Parameters: {
  "description": "文化",
  "titleKeyword": "茶道",
  "maxRecords": 10
}
\`\`\`

### Step 3: Find historical development studies
\`\`\`
Tool: ndl_search_by_description
Parameters: {
  "description": "歴史",
  "titleKeyword": "茶道",
  "maxRecords": 10
}
\`\`\`

### Step 4: Find tea ceremony manuals and guides
\`\`\`
Tool: ndl_search_by_title
Parameters: {
  "title": "茶道",
  "maxRecords": 20
}
\`\`\`
`
  };

  const generalExamples = `
# General NDL Search Strategy Examples

## Quick Reference by Research Goal

### 🎯 Want books ABOUT a topic?
**Use: ndl_search_by_description**
- Research: \`description: "研究"\`
- History: \`description: "歴史"\`
- Biography: \`description: "伝記"\`

### 📚 Want academically classified books?
**Use: ndl_search_by_subject**  
- \`subject: "日本史"\`
- \`subject: "文学"\`
- \`subject: "仏教"\`

### 📖 Know specific title words?
**Use: ndl_search_by_title**
- \`title: "源氏物語"\`
- \`title: "明治"\`
- \`title: "経済"\`

### 🤖 Complex natural language query?
**Use: ndl_search_books**
- \`query: "戦国時代の武将について学びたい"\`
- \`searchMode: "intelligent"\`

## Pro Tips for Better Results

1. **Start with subject search** for academic materials
2. **Use description search** for topic-based research  
3. **Combine multiple tools** for comprehensive coverage
4. **Use Japanese keywords** for best results
5. **Start with 3-10 records** to test relevance
6. **Refine searches** based on initial results

## Common Mistakes to Avoid

❌ Using English keywords (use Japanese)
❌ Too broad searches without refinement
❌ Not checking different search types
❌ Requesting too many records initially
✅ Start specific, broaden if needed
✅ Use appropriate tool for search goal
✅ Combine tools for comprehensive research
✅ Use Japanese academic terminology
`;

  if (scenario && examples[scenario as keyof typeof examples]) {
    return examples[scenario as keyof typeof examples] + '\n\n' + generalExamples;
  }

  return generalExamples + '\n\n' + Object.values(examples).join('\n\n');
}