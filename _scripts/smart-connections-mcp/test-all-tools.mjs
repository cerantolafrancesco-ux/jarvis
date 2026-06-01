#!/usr/bin/env node

/**
 * Comprehensive test script for all Smart Connections MCP tools
 */

import { SmartConnectionsLoader } from './dist/smart-connections-loader.js';
import { SearchEngine } from './dist/search-engine.js';

const VAULT_PATH = process.env.SMART_VAULT_PATH;

if (!VAULT_PATH) {
  console.error('Error: SMART_VAULT_PATH environment variable is required');
  console.error('Usage: SMART_VAULT_PATH="/path/to/vault" node test-all-tools.mjs');
  process.exit(1);
}

async function testAllTools() {
  console.log('\n🔧 Initializing Smart Connections MCP Server...\n');

  const loader = new SmartConnectionsLoader(VAULT_PATH);
  await loader.initialize();

  const searchEngine = new SearchEngine(loader);

  console.log('═══════════════════════════════════════════════════════════');
  console.log('TEST 1: get_stats');
  console.log('═══════════════════════════════════════════════════════════');

  const stats = searchEngine.getStats();
  console.log(JSON.stringify(stats, null, 2));

  const embeddingOk = stats.embeddingDimension === 384;
  console.log(`\n✓ Embedding Dimension: ${stats.embeddingDimension} ${embeddingOk ? '✅' : '❌ FAILED'}`);
  console.log(`✓ Total Notes: ${stats.totalNotes}`);
  console.log(`✓ Total Blocks: ${stats.totalBlocks}`);
  console.log(`✓ Model Key: ${stats.modelKey}`);

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('TEST 2: get_similar_notes');
  console.log('═══════════════════════════════════════════════════════════');

  try {
    const similarNotes = searchEngine.getSimilarNotes('CLAUDE.md', 0.5, 5);
    console.log(`\nFound ${similarNotes.length} similar notes:\n`);

    similarNotes.forEach((note, idx) => {
      console.log(`${idx + 1}. ${note.path}`);
      console.log(`   Similarity: ${note.similarity.toFixed(3)}`);
      console.log(`   Blocks: ${note.blocks.slice(0, 3).join(', ')}${note.blocks.length > 3 ? '...' : ''}`);
    });

    const hasResults = similarNotes.length > 0;
    console.log(`\n${hasResults ? '✅ PASSED' : '❌ FAILED'} - Semantic similarity search working`);
  } catch (error) {
    console.log(`\n❌ FAILED - Error: ${error.message}`);
  }

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('TEST 3: get_connection_graph');
  console.log('═══════════════════════════════════════════════════════════');

  try {
    const graph = searchEngine.getConnectionGraph('CLAUDE.md', 2, 0.6, 3);
    console.log(`\nRoot: ${graph.root}`);
    console.log(`Total connections: ${graph.connections.length}`);

    if (graph.connections.length > 0) {
      console.log('\nFirst level connections:');
      graph.connections.slice(0, 3).forEach(conn => {
        console.log(`  → ${conn.path} (similarity: ${conn.similarity.toFixed(3)}, depth: ${conn.depth})`);
      });
    }

    const hasConnections = graph.connections.length > 0;
    console.log(`\n${hasConnections ? '✅ PASSED' : '❌ FAILED'} - Connection graph building working`);
  } catch (error) {
    console.log(`\n❌ FAILED - Error: ${error.message}`);
  }

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('TEST 4: search_notes (keyword search)');
  console.log('═══════════════════════════════════════════════════════════');

  try {
    const searchResults = searchEngine.searchByQuery('competitive intelligence', 5, 0.3);
    console.log(`\nFound ${searchResults.length} notes matching "competitive intelligence":\n`);

    searchResults.forEach((result, idx) => {
      console.log(`${idx + 1}. ${result.path}`);
      console.log(`   Similarity: ${result.similarity.toFixed(3)}`);
    });

    const hasSearchResults = searchResults.length > 0;
    console.log(`\n${hasSearchResults ? '✅ PASSED' : '❌ FAILED'} - Keyword search working`);
  } catch (error) {
    console.log(`\n❌ FAILED - Error: ${error.message}`);
  }

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('TEST 5: get_note_content');
  console.log('═══════════════════════════════════════════════════════════');

  try {
    const noteContent = searchEngine.getNoteWithContext('CLAUDE.md');
    console.log(`\nNote: ${noteContent.path}`);
    console.log(`Content length: ${noteContent.content.length} characters`);
    console.log(`Available blocks: ${noteContent.blocks.length}`);

    if (noteContent.blocks.length > 0) {
      console.log(`First few blocks: ${noteContent.blocks.slice(0, 3).join(', ')}`);
    }

    console.log(`\nFirst 150 characters of content:`);
    console.log(`"${noteContent.content.substring(0, 150)}..."`);

    const hasContent = noteContent.content.length > 0;
    console.log(`\n${hasContent ? '✅ PASSED' : '❌ FAILED'} - Note content retrieval working`);
  } catch (error) {
    console.log(`\n❌ FAILED - Error: ${error.message}`);
  }

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('TEST 6: get_embedding_neighbors');
  console.log('═══════════════════════════════════════════════════════════');

  try {
    // Get embedding from CLAUDE.md
    const claudeSource = loader.getSource('CLAUDE.md');
    const modelKey = loader.getEmbeddingModelKey();

    if (claudeSource && claudeSource.embeddings[modelKey]) {
      const embeddingVec = claudeSource.embeddings[modelKey].vec;

      const neighbors = searchEngine.getEmbeddingNeighbors(embeddingVec, 5, 0.5);
      console.log(`\nFound ${neighbors.length} neighbors for CLAUDE.md embedding:\n`);

      neighbors.forEach((neighbor, idx) => {
        console.log(`${idx + 1}. ${neighbor.path}`);
        console.log(`   Similarity: ${neighbor.similarity.toFixed(3)}`);
      });

      const hasNeighbors = neighbors.length > 0;
      console.log(`\n${hasNeighbors ? '✅ PASSED' : '❌ FAILED'} - Embedding neighbor search working`);
    } else {
      console.log('\n❌ FAILED - Could not get embedding for CLAUDE.md');
    }
  } catch (error) {
    console.log(`\n❌ FAILED - Error: ${error.message}`);
  }

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('SUMMARY');
  console.log('═══════════════════════════════════════════════════════════\n');
  console.log('All 6 MCP tools have been tested.');
  console.log('Review the results above to verify each tool is working correctly.\n');
  console.log('✅ = Working correctly');
  console.log('❌ = Failed (needs attention)\n');
}

// Run tests
testAllTools().catch(console.error);
