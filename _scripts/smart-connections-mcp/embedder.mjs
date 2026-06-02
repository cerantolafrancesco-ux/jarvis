// embedder.mjs — utilità condivise per l'indice "caldo" del recall istantaneo.
// Usa lo STESSO modello (bge-micro-v2, pooling mean, normalize) di semantic-query,
// così i vettori dell'indice caldo sono confrontabili con la query.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pipeline, env } from "@huggingface/transformers";

env.allowLocalModels = false; // scarica da Hugging Face se non in cache

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const HOT_PATH = path.join(__dirname, "hot-index.json");

export const VAULT = process.env.SMART_VAULT_PATH
  || path.resolve(__dirname, "..", "..", "JARVIS-Vault");  // auto-localizzato dalla posizione dello script

let _extractor = null;
export async function getExtractor() {
  if (_extractor) return _extractor;
  for (const id of ["TaylorAI/bge-micro-v2", "Xenova/bge-micro-v2"]) {
    try { _extractor = await pipeline("feature-extraction", id); return _extractor; }
    catch (e) { /* prova il prossimo */ }
  }
  throw new Error("Impossibile caricare il modello bge-micro-v2 (transformers.js).");
}

// bge-micro-v2 ha un limite di 512 token e transformers.js NON tronca da solo.
// Spezziamo in blocchi piccoli (sicuri sotto soglia), embeddiamo ciascuno e
// facciamo la media dei vettori, poi rinormalizziamo → un solo vettore per l'intero testo.
export async function embedText(text) {
  const ex = await getExtractor();
  const s = String(text);
  const CH = 800;                 // ~300 token a blocco, ben sotto i 512
  const MAX_CHUNKS = 15;          // limita il lavoro su note enormi (~12k char)
  const chunks = [];
  for (let i = 0; i < s.length && chunks.length < MAX_CHUNKS; i += CH) chunks.push(s.slice(i, i + CH));
  if (chunks.length === 0) chunks.push("");

  let acc = null;
  for (const c of chunks) {
    const out = await ex(c, { pooling: "mean", normalize: true });
    const v = out.data;
    if (!acc) acc = new Float64Array(v.length);
    for (let i = 0; i < v.length; i++) acc[i] += v[i];
  }
  let norm = 0;
  for (let i = 0; i < acc.length; i++) norm += acc[i] * acc[i];
  norm = Math.sqrt(norm) || 1;
  return Array.from(acc, (x) => x / norm);
}

// percorso nota normalizzato: relativo al Vault, con slash avanti (come Smart Connections)
export function relPath(p) {
  const abs = path.isAbsolute(p) ? p : path.join(VAULT, p);
  return path.relative(VAULT, abs).split(path.sep).join("/");
}
export function absPath(p) {
  return path.isAbsolute(p) ? p : path.join(VAULT, p);
}

export function loadHot() {
  try { const j = JSON.parse(fs.readFileSync(HOT_PATH, "utf8")); return Array.isArray(j) ? j : []; }
  catch { return []; }
}
export function saveHot(entries) {
  fs.writeFileSync(HOT_PATH, JSON.stringify(entries));
}

// vettori già normalizzati → la cosine è il prodotto scalare
export function cosine(a, b) {
  let s = 0; const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) s += a[i] * b[i];
  return s;
}
