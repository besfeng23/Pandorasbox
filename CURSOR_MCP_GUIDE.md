# Using Pandora MCP Server in Cursor

The Pandora MCP server gives Cursor direct access to your Pandora's Box knowledge base. Here's what you can do:

## Available Tools

### 1. `add_memory` - Store Information
Save any information to your knowledge base with automatic embedding and indexing.

**Use Cases:**
- Store coding patterns and solutions you discover
- Save project-specific knowledge and decisions
- Remember user preferences and requirements
- Document architectural decisions
- Store debugging solutions and fixes

**Example Prompts in Cursor:**
```
"Use add_memory to store that I prefer TypeScript over JavaScript for new projects"
"Add a memory that this project uses Firebase App Hosting for deployment"
"Store in memory that the user prefers dark mode interfaces"
"Remember that we're using Next.js 15 with App Router"
```

### 2. `query_knowledge` - Search Your Knowledge Base
Semantically search across all your stored memories and conversation history.

**Use Cases:**
- Find previous solutions to similar problems
- Recall project decisions and context
- Search for user preferences
- Find related code patterns or architectures
- Retrieve debugging solutions from past issues

**Example Prompts in Cursor:**
```
"Query my knowledge base for information about Firebase deployment"
"Search for memories about user interface preferences"
"Find what I know about TypeScript best practices"
"Look up previous solutions for authentication issues"
```

## Real-World Use Cases

### 1. **Context-Aware Code Assistance**
When working on a feature, Cursor can:
- Search your knowledge base for similar implementations
- Recall project-specific patterns you've used before
- Remember architectural decisions that affect the current task

**Example:**
```
"I'm building a new API route. Query my knowledge base for how I've structured 
similar routes in this project, then help me create one following that pattern."
```

### 2. **Learning and Documentation**
As you learn new things or make decisions:
- Store them in your knowledge base
- Cursor can reference them later when relevant

**Example:**
```
"Add a memory that we decided to use React Server Components for this feature 
because of performance requirements. Then query for other performance-related 
decisions I've made."
```

### 3. **Project Continuity**
When returning to a project after time away:
- Query your knowledge base to refresh context
- Recall why certain decisions were made
- Remember user requirements and preferences

**Example:**
```
"I'm back on this project after a month. Query my knowledge base for the key 
decisions and patterns I established, then help me continue where I left off."
```

### 4. **Debugging and Problem Solving**
- Store solutions to bugs you've encountered
- Search for similar issues you've solved before
- Build a knowledge base of debugging patterns

**Example:**
```
"I'm getting a Firebase authentication error. Query my knowledge base for 
similar authentication issues I've solved before."
```

### 5. **User Preference Management**
- Store user preferences and requirements
- Recall them when making UI/UX decisions
- Maintain consistency across features

**Example:**
```
"Before designing this new feature, query my knowledge base for the user's 
preferences on UI patterns and accessibility requirements."
```

## How to Use in Cursor

### Step 1: Restart Cursor
After setting up the MCP server, restart Cursor completely to activate it.

### Step 2: Natural Language Requests
Just ask Cursor naturally - it will automatically use the MCP tools when appropriate:

**Good prompts:**
- "Remember that I prefer functional components over class components"
- "What do I know about Firebase App Hosting from my previous work?"
- "Store in my knowledge base that this project uses Tailwind CSS"
- "Search my memories for information about authentication patterns"

### Step 3: Direct Tool Usage
You can also explicitly request tool usage:

**Explicit prompts:**
- "Use the add_memory tool to store [information]"
- "Query my knowledge base using query_knowledge for [topic]"
- "Call the Pandora MCP tools to [action]"

## Integration with Your Pandora's Box App

The MCP server connects to the **same Firestore database** as your Pandora's Box application:

- ✅ Memories stored via MCP appear in your Pandora's Box app
- ✅ Memories from your app are searchable via MCP
- ✅ Conversation history is included in searches
- ✅ All data uses the same vector embeddings and search infrastructure

## Best Practices

1. **Be Specific**: When storing memories, include context:
   - ❌ "User likes dark mode"
   - ✅ "User prefers dark mode interfaces with high contrast for accessibility"

2. **Use Semantic Queries**: Search naturally, not with exact keywords:
   - ❌ "dark mode"
   - ✅ "user interface color preferences"

3. **Store Decision Rationale**: When storing decisions, include why:
   - ❌ "Using TypeScript"
   - ✅ "Using TypeScript for type safety and better IDE support in this large codebase"

4. **Regular Updates**: Store new learnings and decisions as you make them

5. **Search Before Deciding**: Query your knowledge base before making similar decisions

## Example Workflow

```
1. You: "I'm implementing authentication. Query my knowledge base for 
   how I've handled auth in similar projects."

2. Cursor: [Uses query_knowledge tool, finds relevant memories]
   "Found 3 relevant memories about authentication patterns..."

3. You: "Based on that, I'm going with Firebase Auth. Store that decision 
   and the reasons."

4. Cursor: [Uses add_memory tool]
   "Stored your authentication decision in the knowledge base."

5. Later: "Query my knowledge base for the authentication approach I decided on."
```

## Troubleshooting

**MCP server not working?**
- Restart Cursor completely
- Check that `.cursor/mcp.json` has the `pandora` entry
- Verify `OPENAI_API_KEY` is set in `.env.local`

**Tools not appearing?**
- The tools are available automatically - just ask Cursor naturally
- Cursor will use them when your request matches their capabilities

**Search not finding results?**
- Try more semantic/natural language queries
- Check that memories exist for that user email
- Verify the user email matches your Firebase Auth account

## Next Steps

1. **Restart Cursor** to activate the MCP server
2. **Try a simple query**: "Query my knowledge base for any stored memories"
3. **Store a test memory**: "Add a memory that I'm testing the MCP integration"
4. **Search for it**: "Find the test memory I just stored"

The Pandora MCP server makes Cursor context-aware of your entire knowledge base, enabling more intelligent and personalized assistance!

