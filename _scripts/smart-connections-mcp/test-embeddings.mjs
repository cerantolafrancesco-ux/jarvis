import {SmartConnectionsLoader} from './dist/smart-connections-loader.js';
import {SearchEngine} from './dist/search-engine.js';

const VAULT_PATH = process.env.SMART_VAULT_PATH;

if (!VAULT_PATH) {
  console.error('Error: SMART_VAULT_PATH environment variable is required');
  console.error('Usage: SMART_VAULT_PATH="/path/to/vault" node test-embeddings.mjs');
  process.exit(1);
}

const loader = new SmartConnectionsLoader(VAULT_PATH);
await loader.initialize();

console.log('=== Configuration ===');
console.log('Model key from config:', loader.getEmbeddingModelKey());

console.log('\n=== Sources ===');
const sources = loader.getSources();
console.log('Total sources loaded:', sources.size);

console.log('\n=== First Source ===');
const firstSource = Array.from(sources.values())[0];
console.log('Path:', firstSource.path);
console.log('Has embeddings object:', !!firstSource.embeddings);
console.log('Embedding model keys in source:', Object.keys(firstSource.embeddings));

const modelKey = loader.getEmbeddingModelKey();
const emb = firstSource.embeddings[modelKey];
console.log('\n=== Embedding for model key:', modelKey, '===');
console.log('Has embeddings for this key:', !!emb);
if (emb) {
  console.log('Has vec:', !!emb.vec);
  console.log('Vec length:', emb.vec?.length);
}

console.log('\n=== Search Engine Stats ===');
const searchEngine = new SearchEngine(loader);
const stats = searchEngine.getStats();
console.log('Stats:', JSON.stringify(stats, null, 2));
