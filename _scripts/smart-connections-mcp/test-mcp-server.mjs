/**
 * Test MCP server by simulating MCP protocol calls
 */

import { spawn } from 'child_process';

const serverProcess = spawn('node', ['dist/index.js'], {
  cwd: '/path/to/smart-connections-mcp',
  env: {
    ...process.env,
    SMART_VAULT_PATH: '/path/to/your/vault'
  },
  stdio: ['pipe', 'pipe', 'pipe']
});

let buffer = '';

serverProcess.stdout.on('data', (data) => {
  buffer += data.toString();
  // Try to parse complete JSON messages
  const lines = buffer.split('\n');
  buffer = lines.pop(); // Keep incomplete line in buffer

  for (const line of lines) {
    if (line.trim()) {
      try {
        const message = JSON.parse(line);
        console.log('Server response:', JSON.stringify(message, null, 2));
      } catch (e) {
        // Not JSON, might be debug output
      }
    }
  }
});

serverProcess.stderr.on('data', (data) => {
  console.error('Server log:', data.toString().trim());
});

// Wait for initialization
await new Promise(resolve => setTimeout(resolve, 3000));

console.log('\n=== Test 1: get_stats ===');
const statsRequest = {
  jsonrpc: '2.0',
  id: 1,
  method: 'tools/call',
  params: {
    name: 'get_stats',
    arguments: {}
  }
};
serverProcess.stdin.write(JSON.stringify(statsRequest) + '\n');

await new Promise(resolve => setTimeout(resolve, 1000));

console.log('\n=== Test 2: get_similar_notes ===');
const similarRequest = {
  jsonrpc: '2.0',
  id: 2,
  method: 'tools/call',
  params: {
    name: 'get_similar_notes',
    arguments: {
      note_path: 'CLAUDE.md',
      threshold: 0.5,
      limit: 3
    }
  }
};
serverProcess.stdin.write(JSON.stringify(similarRequest) + '\n');

await new Promise(resolve => setTimeout(resolve, 2000));

console.log('\n=== Cleanup ===');
serverProcess.kill();
process.exit(0);
