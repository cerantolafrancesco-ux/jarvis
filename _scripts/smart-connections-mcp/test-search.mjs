import {SmartConnectionsLoader} from './dist/smart-connections-loader.js';
import {SearchEngine} from './dist/search-engine.js';

const loader = new SmartConnectionsLoader('/path/to/your/vault');
await loader.initialize();

const searchEngine = new SearchEngine(loader);

console.log('=== Testing get_similar_notes ===');
try {
  const results = searchEngine.getSimilarNotes('CLAUDE.md', 0.5, 5);
  console.log(`Found ${results.length} similar notes:`);
  results.forEach((note, i) => {
    console.log(`${i+1}. ${note.path} (similarity: ${note.similarity.toFixed(3)})`);
  });
} catch (error) {
  console.error('Error:', error.message);
}

console.log('\n=== Testing get_connection_graph ===');
try {
  const graph = searchEngine.getConnectionGraph('CLAUDE.md', 2, 0.6, 3);
  console.log('Root:', graph.path);
  console.log('Connections:', graph.connections.length);
  if (graph.connections.length > 0) {
    console.log('First connection:', graph.connections[0].path, '(similarity:', graph.connections[0].similarity.toFixed(3) + ')');
  }
} catch (error) {
  console.error('Error:', error.message);
}

console.log('\n=== All tests completed! ===');
