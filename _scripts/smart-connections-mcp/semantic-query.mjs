#!/usr/bin/env node
/*
 * semantic-query.mjs — ricerca semantica a TESTO LIBERO sul Vault JARVIS.
 * Embedda la query con bge-micro-v2 (lo STESSO modello di Smart Connections) e cerca:
 *   1) nell'indice UFFICIALE (.smart-env, via smart-connections-mcp);
 *   2) nell'indice CALDO (hot-index.json) delle note appena scritte e non ancora
 *      re-indicizzate da Smart Connections → recall ISTANTANEO.
 * I risultati vengono uniti e deduplicati per percorso (vince la similarità più alta).
 *
 * Uso:  node semantic-query.mjs "la mia domanda" [k]
 * Env:  SMART_VAULT_PATH (default: il Vault JARVIS)
 * Le note calde sono marcate con "~".
 */
import fs from "node:fs";
import { SmartConnectionsLoader } from "./dist/smart-connections-loader.js";
import { SearchEngine } from "./dist/search-engine.js";
import { VAULT, embedText, loadHot, cosine, absPath } from "./embedder.mjs";

const query = process.argv[2];
const k = parseInt(process.argv[3] || "10", 10);
if (!query) { console.error('Uso: node semantic-query.mjs "<query>" [k]'); process.exit(1); }

(async () => {
  const vec = await embedText(query);

  // 1) indice ufficiale (.smart-env)
  let cold = [];
  try {
    const loader = new SmartConnectionsLoader(VAULT);
    await loader.initialize();
    const engine = new SearchEngine(loader);
    cold = engine.getEmbeddingNeighbors(vec, k, 0.0) || [];
  } catch (e) {
    console.error("(indice .smart-env non disponibile: " + e.message + ")");
  }

  // 2) indice caldo (note fresche); scarta voci di file ormai inesistenti
  const hot = loadHot().filter(e => fs.existsSync(absPath(e.path)));
  const hotResults = hot.map(e => ({ path: e.path, similarity: cosine(vec, e.vector), hot: true }));

  // 3) merge + dedup per percorso (tieni la similarità più alta)
  const byPath = new Map();
  for (const r of [...cold, ...hotResults]) {
    const prev = byPath.get(r.path);
    if (!prev || r.similarity > prev.similarity) byPath.set(r.path, { path: r.path, similarity: r.similarity, hot: !!r.hot });
  }
  const merged = [...byPath.values()].filter(r => !r.path.startsWith("06_INTERAZIONI/")).sort((a, b) => b.similarity - a.similarity).slice(0, k);

  if (merged.length === 0) { console.log("Nessun risultato (embedding generati? prova ad aumentare k)."); return; }
  console.log(`\n🔎 Risultati semantici per: "${query}"\n`);
  merged.forEach((r, i) => {
    const sim = typeof r.similarity === "number" ? r.similarity.toFixed(3) : r.similarity;
    console.log(`${String(i + 1).padStart(2)}. [${sim}]${r.hot ? " ~" : "  "} ${r.path}`);
  });
  console.log("");
})().catch((e) => { console.error("Errore:", e.message); process.exit(1); });
