#!/usr/bin/env node
/*
 * vault-verifier.mjs — VERIFICATORE delle 3:00, STADIO 1 (Ollama, locale, gratuito).
 * Legge le note grezze in 01_INBOX, le distilla in record, scarta il rumore e
 * MARCA in verifier-flagged.json cio' che richiede il giudizio/verifica web di Claude (stadio 2).
 * Non cancella nulla: le note lavorate finiscono in 01_INBOX/_processed/.
 *
 * Uso:  node vault-verifier.mjs
 * Env:  OLLAMA_URL, JARVIS_WORKER_MODEL (default qwen3:8b)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { VAULT, embedText, loadHot, saveHot, absPath } from "./smart-connections-mcp/embedder.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OLLAMA = process.env.OLLAMA_URL || "http://localhost:11434";
const MODEL  = process.env.JARVIS_WORKER_MODEL || "qwen3:8b";
const INBOX     = path.join(VAULT, "01_INBOX");
const PROCESSED = path.join(INBOX, "_processed");
const LOGS      = path.join(__dirname, "logs");
const FLAGGED   = path.join(LOGS, "verifier-flagged.json");

async function ollama(system, prompt){
  const res = await fetch(OLLAMA + "/api/generate", { method:"POST", headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({ model:MODEL, system, prompt, stream:false, think:false, options:{ temperature:0.1 } }) });
  if(!res.ok) throw new Error("ollama HTTP " + res.status);
  const j = await res.json();
  return (j.response || "").replace(/<think>[\s\S]*?<\/think>/g,"").trim();
}
function slug(s){ return String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,40) || "nota"; }
function jsonFrom(t){ const m = t.match(/\{[\s\S]*\}/); if(!m) return null; try{ return JSON.parse(m[0]); }catch{ return null; } }

async function main(){
  fs.mkdirSync(LOGS,{recursive:true}); fs.mkdirSync(PROCESSED,{recursive:true});
  let files=[]; try{ files = fs.readdirSync(INBOX).filter(f=>f.endsWith(".md")); }catch{}
  const flagged=[]; const report=[]; let promoted=0, dropped=0;

  for(const f of files){
    const abs = path.join(INBOX, f);
    let content=""; try{ content = fs.readFileSync(abs,"utf8"); }catch{ continue; }
    const sys = "Sei un verificatore della memoria di un assistente. Valuti una nota grezza e decidi cosa farne. Rispondi SOLO con JSON valido, nient'altro.";
    const prompt = `NOTA:\n${content.slice(0,2000)}\n\nDecidi e rispondi con questo JSON:\n{"azione":"promote|drop|flag","titolo":"...","fatto":"<normalizzato e conciso>","tag":["..."],"verifica":true|false,"claim":"<affermazione fattuale da verificare, o vuoto>","motivo":"<breve>"}\n- promote: fatto utile e stabile, nessun dubbio.\n- flag: utile ma incerto o con un'affermazione da verificare.\n- drop: rumore, banale o effimero.\n/no_think`;
    let dec=null; try{ dec = jsonFrom(await ollama(sys, prompt)); }catch{ dec=null; }
    if(!dec){ report.push(`? ${f}: decisione illeggibile, lasciata in inbox`); continue; }

    if(dec.azione === "drop"){ try{ fs.renameSync(abs, path.join(PROCESSED,f)); }catch{} dropped++; report.push(`- drop ${f}: ${dec.motivo||""}`); continue; }

    const titolo = dec.titolo || "Record";
    const fatto  = dec.fatto  || content;
    const tags   = "[" + (Array.isArray(dec.tag)?dec.tag:[]).map(s=>String(s).trim()).filter(Boolean).slice(0,6).join(", ") + "]";
    const conf   = dec.azione === "flag" ? 0.5 : 0.6;
    const date   = new Date().toISOString().slice(0,10);
    const recRel = "03_RECORDS/REC-" + date + "-" + slug(titolo) + ".md";
    const body = `---\ntipo: record\ncreated: ${new Date().toISOString()}\nconfidence: ${conf}\nverificato: false\nfonti: []\ntag: ${tags}\n---\n\n# ${titolo}\n\n${fatto}\n\n> Promosso dall'inbox dal verificatore (stadio 1, Ollama).${dec.verifica?" DA VERIFICARE (stadio 2).":""}\n`;
    try{ fs.writeFileSync(absPath(recRel), body); }catch{ report.push(`! ${f}: errore scrittura record`); continue; }
    try{ const vec = await embedText(recRel.replace(/\.md$/,"") + "\n" + titolo + "\n" + fatto); const e = loadHot().filter(x=>x.path!==recRel); e.push({ path:recRel, mtime:Date.now(), vector:vec }); saveHot(e); }catch{}
    try{ fs.renameSync(abs, path.join(PROCESSED,f)); }catch{}
    promoted++;
    if(dec.azione === "flag" || dec.verifica){ flagged.push({ record:recRel, claim:dec.claim||"", motivo:dec.motivo||"", origine:f }); }
    report.push(`+ ${dec.azione} ${f} -> ${recRel}${dec.verifica?" [verifica]":""}`);
  }

  try{ fs.writeFileSync(FLAGGED, JSON.stringify(flagged, null, 2)); }catch{}
  const summary = `Verificatore stadio 1 (${new Date().toISOString()}): ${files.length} note inbox, ${promoted} promosse, ${dropped} scartate, ${flagged.length} da verificare (stadio 2).`;
  try{ fs.appendFileSync(path.join(LOGS,"verifier.log"), summary + "\n" + report.join("\n") + "\n\n"); }catch{}
  console.log(summary);
  console.log("Voci per lo stadio 2 (Claude):", FLAGGED);
}
main().catch(e => { console.error("Errore verificatore:", e.message); process.exit(1); });
