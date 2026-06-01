# Troubleshooting Smart Connections MCP Server

## Issue: "No embeddings found" Error in Claude Desktop

### Symptoms
- ✅ `get_stats` works
- ✅ `search_notes` works (keyword search)
- ✅ `get_note_content` works
- ❌ `get_similar_notes` fails with "No embeddings found for note"
- ❌ `get_connection_graph` returns empty connections

### Root Cause
Claude Desktop may be running an older version of the server that hasn't been restarted since the fix was applied.

### Complete Fix Procedure

#### Step 1: Verify the Fix is Built
```bash
cd ~/smart-connections-mcp
npm run build
```

This should complete without errors.

#### Step 2: Test Locally (Should Work)
```bash
cd ~/smart-connections-mcp
node test-search.mjs
```

Expected output:
```
Found 5 similar notes:
1. tags.md (similarity: 0.821)
2. Vault Structure and Organization.md (similarity: 0.796)
... etc
```

If this works, the server code is correct!

#### Step 3: Restart Claude Desktop COMPLETELY

**IMPORTANT**: You must do a COMPLETE restart, not just refresh:

1. **Quit Claude Desktop completely**:
   - Press **Cmd+Q** (not just closing the window!)
   - Or: Right-click Claude icon in Dock → Quit

2. **Verify it's completely stopped**:
   ```bash
   ps aux | grep -i claude
   ```
   Should show nothing (or only the grep command itself)

3. **Kill any orphaned MCP servers**:
   ```bash
   pkill -f "smart-connections-mcp"
   ```

4. **Wait 5 seconds**, then reopen Claude Desktop

5. **Wait for it to fully initialize** (may take 10-15 seconds)

#### Step 4: Verify in Claude Desktop

Ask Claude to run these tests:

1. **"Use get_stats to show me my Smart Connections statistics"**

   Expected: Should show `embeddingDimension: 384`

   If it shows `0`, the old server is still running!

2. **"Find notes similar to CLAUDE.md using get_similar_notes"**

   Expected: Should return 5-10 similar notes with similarity scores

   If it fails, Claude Desktop didn't reload the server.

3. **"Build a connection graph from CLAUDE.md"**

   Expected: Should return a graph with connections

   If empty, the old server is still running.

### Advanced Troubleshooting

#### Check Which Server Claude Desktop is Using

1. **Find the running process**:
   ```bash
   ps aux | grep smart-connections-mcp
   ```

2. **Check the config Claude Desktop is using**:
   ```bash
   cat ~/Library/Application\ Support/Claude/claude_desktop_config.json
   ```

   Should show:
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

   Replace with your actual paths.

3. **Force kill all Node processes** (nuclear option):
   ```bash
   pkill -9 node
   ```
   Then restart Claude Desktop.

#### Check Server Logs

If Claude Desktop has a log viewer or console, check for:
- "Loading 135 source files..."
- "Loaded 131 sources successfully"
- "Smart Connections MCP Server initialized successfully"
- "Loaded 131 notes"

The key line is: **"Loaded 131 notes"** (not 0!)

#### Manual Server Test

Test the server exactly as Claude Desktop would:

```bash
cd ~/smart-connections-mcp
export SMART_VAULT_PATH="/path/to/your/vault"
node dist/index.js
```

Look for:
```
Loaded 131 sources successfully
Smart Connections MCP Server initialized successfully
Loaded 131 notes
```

Press Ctrl+C to stop.

### What Was Fixed

#### The Embedding Model Key Bug

**Problem**: The code was looking for embeddings under the key `"transformers"` but they were stored under `"TaylorAI/bge-micro-v2"`.

**Fix Location**: `src/smart-connections-loader.ts` lines 125-154

**Before**:
```javascript
// Wrong: returned "transformers"
return modelKeys[0];
```

**After**:
```javascript
// Correct: returns "TaylorAI/bge-micro-v2"
const adapter = embedModel.adapter;
const adapterConfig = embedModel[adapter];
return adapterConfig.model_key;
```

#### The Null Path Bug

**Problem**: Some source entries had `null` paths, causing crashes.

**Fix Location**: `src/smart-connections-loader.ts` lines 88-91

**Added**:
```javascript
if (sourceData && sourceData.path) {
  this.sources.set(sourceData.path, sourceData);
}
```

### Verification Checklist

- [ ] Built code exists: `~/smart-connections-mcp/dist/index.js`
- [ ] Direct test works: `node test-search.mjs` returns results
- [ ] Claude Desktop fully quit (Cmd+Q)
- [ ] No orphaned processes: `ps aux | grep smart-connections-mcp` shows nothing
- [ ] Claude Desktop restarted
- [ ] Waited 15 seconds for initialization
- [ ] `get_stats` shows `embeddingDimension: 384`
- [ ] `get_similar_notes` returns results
- [ ] `get_connection_graph` returns connections

### Still Not Working?

If all else fails:

1. **Remove the MCP server from config temporarily**:
   - Edit `~/Library/Application Support/Claude/claude_desktop_config.json`
   - Remove the entire `"smart-connections"` entry
   - Save and restart Claude Desktop
   - Verify Smart Connections tools are gone

2. **Add it back**:
   - Edit the config again
   - Add back the smart-connections entry
   - Save and restart Claude Desktop
   - Test again

3. **Check for multiple Node versions**:
   ```bash
   which node
   node --version
   ```

   Should be v22.18.0 or similar. If different, update the config to use the full path.

### Success Indicators

When working correctly, you should be able to:

1. **Find conceptually similar notes** (not just keyword matches):
   - "Find notes similar to competitive analysis"
   - Returns notes about competition, battlecards, market research

2. **Build knowledge graphs**:
   - "Show me a connection graph of product features"
   - Returns multi-level graph of related feature docs

3. **Semantic search**:
   - "What notes discuss enterprise buyers?"
   - Returns notes mentioning enterprises, B2B, large organizations

All with similarity scores between 0.6-0.9 for well-matched content!

### Contact Information

If you've followed all steps and it still doesn't work:

1. Check the server was rebuilt: `ls -la ~/smart-connections-mcp/dist/index.js`
2. Verify the timestamp is recent (today's date)
3. Review Claude Desktop's MCP server connection status
4. Try the manual server test to confirm the code works standalone

The issue is almost always that Claude Desktop hasn't fully restarted and is running a cached version of the old server.
