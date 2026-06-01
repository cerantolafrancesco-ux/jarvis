#!/usr/bin/env node
/*
 * semantic-query.mjs — ricerca semantica a TESTO LIBERO sul Vault JARVIS.
 * Embedda la query con bge-micro-v2 (lo STESSO modello di Smart Connections) e
 * trova le note più vicine riusando il loader + SearchEngine di smart-connections-mcp.
 *
 * Uso:  node semantic-query.mjs "la mia domanda" [k]
 * Env:  SMART_VAULT_PATH (default: il Vault JARVIS)
 */
import { SmartConnectionsLoader } from "./dist/smart-connections-loader.js";
import { SearchEngine } from "./dist/search-engine.js";
import { pipeline, env } from "@huggingface/transformers";

env.allowLocalModels = false; // scarica da Hugging Face se non in cache

const VAULT = process.env.SMART_VAULT_PATH
  || "C:\\Users\\ceran\\Documents\\Claude\\Projects\\JARVIS\\JARVIS-Vault";
const query = process.argv[2];
const k = parseInt(process.argv[3] || "10", 10);
if (!query) { console.error('Uso: node semantic-query.mjs "<query>" [k]'); process.exit(1); }

async function getExtractor() {
  // bge-micro-v2: prova prima l'id ufficiale, poi il mirror ONNX di Xenova.
  for (const id of ["TaylorAI/bge-micro-v2", "Xenova/bge-micro-v2"]) {
    try { return await pipeline("feature-extraction", id); }
    catch (e) { /* prova il prossimo */ }
  }
  throw new Error("Impossibile caricare il modello bge-micro-v2 (transformers.js).");
}

(async () => {
  const loader = new SmartConnectionsLoader(VAULT);
  await loader.initialize();
  const engine = new SearchEngine(loader);

  const extractor = await getExtractor();
  const out = await extractor(query, { pooling: "mean", normalize: true });
  const vec = Array.from(out.data);

  const results = engine.getEmbeddingNeighbors(vec, k, 0.0);
  if (!results || results.length === 0) {
    console.log("Nessun risultato (embedding generati? prova ad aumentare k).");
    return;
  }
  console.log(`\n🔎 Risultati semantici per: "${query}"\n`);
  results.forEach((r, i) => {
    const sim = typeof r.similarity === "number" ? r.similarity.toFixed(3) : r.similarity;
    console.log(`${String(i + 1).padStart(2)}. [${sim}] ${r.path}`);
  });
  console.log("");
})().catch((e) => { console.error("Errore:", e.message); process.exit(1); });
