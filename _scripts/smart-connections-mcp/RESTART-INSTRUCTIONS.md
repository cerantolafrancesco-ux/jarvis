# 🔄 How to Restart Claude Desktop with Fixed MCP Server

## TL;DR - Quick Fix

```bash
# 1. Build the fixed server (already done)
cd ~/smart-connections-mcp && npm run build

# 2. Kill any orphaned servers
pkill -f "smart-connections-mcp"

# 3. Quit Claude Desktop COMPLETELY
# Press Cmd+Q or Right-click dock icon → Quit

# 4. Wait 5 seconds, then reopen Claude Desktop

# 5. Test with: "Use get_stats to show Smart Connections statistics"
# Should show embeddingDimension: 384 (not 0!)
```

## Detailed Steps

### Step 1: Verify the Fix is Built ✅

The server has been rebuilt with the embedding fix. Verify:

```bash
ls -lh ~/smart-connections-mcp/dist/index.js
```

The file should exist and have today's timestamp.

### Step 2: Kill Orphaned Processes

```bash
pkill -f "smart-connections-mcp"
```

This ensures no old server instances are running.

### Step 3: Completely Quit Claude Desktop

**CRITICAL**: You MUST quit completely, not just close windows!

**Method 1 - Keyboard**:
- Focus Claude Desktop
- Press **Cmd+Q**

**Method 2 - Dock**:
- Right-click Claude icon in Dock
- Click **Quit**

**Verify it quit**:
```bash
ps aux | grep -i claude
```
Should show nothing (or only the grep itself).

### Step 4: Wait & Reopen

1. **Wait 5 seconds**
2. **Reopen Claude Desktop**
3. **Wait 10-15 seconds** for full initialization

### Step 5: Test the Fixed Server

Ask Claude Desktop:

**Test 1: Check Statistics**
```
Use the get_stats tool to show me Smart Connections statistics
```

Expected result:
```json
{
  "totalNotes": 131,
  "totalBlocks": 12500,
  "embeddingDimension": 384,  ← Should be 384, not 0!
  "modelKey": "TaylorAI/bge-micro-v2"
}
```

**Test 2: Semantic Search**
```
Use get_similar_notes to find notes similar to "CLAUDE.md" with threshold 0.5 and limit 5
```

Expected: Should return 5 notes with similarity scores like:
- tags.md (0.821)
- Vault Structure and Organization.md (0.796)
- etc.

**Test 3: Connection Graph**
```
Use get_connection_graph to build a graph from "CLAUDE.md" with depth 2
```

Expected: Should return a graph with connections (not empty).

## Troubleshooting

### Issue: Still Shows `embeddingDimension: 0`

**Cause**: Old server still running

**Fix**:
```bash
# Nuclear option - kill ALL node processes
pkill -9 node

# Then restart Claude Desktop
```

### Issue: "No embeddings found" Error

**Cause**: Claude Desktop using cached/old server

**Fix**:
1. Open Activity Monitor (Cmd+Space, type "Activity Monitor")
2. Search for "Claude"
3. Force Quit all Claude processes
4. Search for "node"
5. Force Quit any "smart-connections-mcp" processes
6. Reopen Claude Desktop

### Issue: Server Not Loading at All

**Check Config**:
```bash
cat ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

Should contain:
```json
{
  "mcpServers": {
    "smart-connections": {
      "command": "node",
      "args": [
        "/ABSOLUTE/PATH/TO/smart-connections-mcp/dist/index.js"
      ],
      "env": {
        "SMART_VAULT_PATH": "/ABSOLUTE/PATH/TO/YOUR/OBSIDIAN/VAULT"
      }
    }
  }
}
```

Replace with your actual paths. If the config is wrong, fix it and restart Claude Desktop.

## What Should Work After Restart

### ✅ All 6 Tools Should Work:

1. **get_stats** - Show knowledge base statistics
   - 131 notes, 12500 blocks, 384-dim embeddings

2. **get_similar_notes** - Semantic similarity search
   - Find conceptually related notes
   - Returns similarity scores 0.0-1.0

3. **get_connection_graph** - Build knowledge graphs
   - Multi-level relationships
   - Shows how notes connect

4. **search_notes** - Keyword search
   - Full-text search across vault
   - Case-insensitive matching

5. **get_note_content** - Read note contents
   - Full markdown content
   - Extract specific sections

6. **get_embedding_neighbors** - Vector search
   - Advanced embedding queries
   - 384-dimensional similarity

### Example Queries That Should Work:

- "Find notes similar to [your note name]"
- "Show me a connection graph of [your topic]"
- "What notes discuss [your topic]?"
- "Get the content of [your note name]"
- "Search for all notes mentioning [your search term]"

## Success Indicators

You'll know it's working when:

1. **get_stats shows dimension 384** (not 0)
2. **get_similar_notes returns actual results** (not "no embeddings")
3. **get_connection_graph shows connections** (not empty)
4. **Similarity scores are realistic** (0.6-0.9 for related content)

## Files to Reference

- **Full Fix Details**: `~/smart-connections-mcp/FIXED.md`
- **Troubleshooting Guide**: `~/smart-connections-mcp/TROUBLESHOOTING.md`
- **Original Docs**: `~/smart-connections-mcp/README.md`
- **Quick Start**: `~/smart-connections-mcp/QUICKSTART.md`

## Support Commands

Test the server standalone:
```bash
cd ~/smart-connections-mcp
node test-search.mjs
```

Should output:
```
Found 5 similar notes:
1. tags.md (similarity: 0.821)
2. Vault Structure and Organization.md (similarity: 0.796)
...
```

If standalone test works but Claude Desktop doesn't, the issue is with Claude Desktop's server reload process.

---

**Summary**: The fix is complete and working! You just need to ensure Claude Desktop loads the new version by doing a complete restart (Cmd+Q, not just window close).
