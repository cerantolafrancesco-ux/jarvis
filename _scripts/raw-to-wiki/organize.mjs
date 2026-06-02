// organize.mjs — RAW_SOURCE -> WIKI. Estrae il testo dai grezzi e produce note wiki organizzate.
// Uso:
//   node organize.mjs            un giro: processa i nuovi/aggiornati
//   node organize.mjs --watch    resta in ascolto, ogni JARVIS_WIKI_POLL ms
//   node organize.mjs --all      riprocessa tutto, ignora il ledger
// Difensivo: un errore su un file non blocca gli altri ne' il watch.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { VAULT, embedText, loadHot, saveHot, absPath, relPath, cosine } from "../smart-connections-mcp/embedder.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OLLAMA = process.env.OLLAMA_URL || "http://localhost:11434";
const MODEL  = process.env.JARVIS_WIKI_MODEL || process.env.JARVIS_WORKER_MODEL || "qwen3:8b";
const RAW    = path.join(VAULT, "RAW_SOURCE");
const WIKI   = path.join(VAULT, "WIKI");
// cartelle esterne (es. Dropbox/Drive sincronizzati) da organizzare in WIKI, SOLA LETTURA (originali mai spostati)
const EXTRA_DIRS = (process.env.JARVIS_RAW_EXTRA_DIRS ||
  "C:\\Users\\ceran\\Dropbox\\jarvis;G:\\Il mio Drive\\JARVIS")
  .split(";").map(s=>s.trim()).filter(Boolean);
const PROMPT_FILE = path.join(VAULT, "00_CORE", "WIKI_ORGANIZER.md");
const LEDGER = path.join(__dirname, "..", "logs", "wiki-processed.json");
const POLL_MS = parseInt(process.env.JARVIS_WIKI_POLL || "15000", 10);
const MAX_CHARS = parseInt(process.env.JARVIS_WIKI_MAXCHARS || "24000", 10);
const REDO_ALL = process.argv.includes("--all");
const RETENTION = (process.env.JARVIS_WIKI_RETENTION || "auto").toLowerCase(); // auto = JARVIS decide; keep = conserva sempre il grezzo
const WIKI_LINK_K = parseInt(process.env.JARVIS_WIKI_LINK_K || "3", 10);          // quante note WIKI affini collegare
const WIKI_LINK_THR = parseFloat(process.env.JARVIS_WIKI_LINK_THR || "0.55");     // soglia di similarità per collegarle
const DEFAULT_SPEAKER = process.env.JARVIS_DEFAULT_SPEAKER || "Fra";
const TRASH = path.join(RAW, "_cestino");

const TEXT_EXT = new Set([".md",".txt",".markdown",".csv",".tsv",".json",".log"]);
const HTML_EXT = new Set([".html",".htm"]);
const PDF_EXT  = new Set([".pdf"]);
const AV_EXT   = new Set([".mp3",".wav",".m4a",".flac",".ogg",".mp4",".mkv",".mov",".webm",".avi"]);

function log(...a){ console.log("[WIKI]", ...a); }
function loadLedger(){ try{ return JSON.parse(fs.readFileSync(LEDGER,"utf8")); }catch{ return {}; } }
function saveLedger(l){ try{ fs.mkdirSync(path.dirname(LEDGER),{recursive:true}); fs.writeFileSync(LEDGER, JSON.stringify(l,null,2)); }catch(e){ log("ledger:", e.message); } }
function slugify(s){ return String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,60) || "nota"; }

function walk(dir){
  const out=[]; let ents=[];
  try{ ents=fs.readdirSync(dir,{withFileTypes:true}); }catch{ return out; }
  for(const e of ents){
    if(e.name.startsWith(".") || e.name.startsWith("_") || /^readme/i.test(e.name) || e.name.endsWith(".meta.json")) continue;
    const p=path.join(dir,e.name);
    if(e.isDirectory()) out.push(...walk(p)); else out.push(p);
  }
  return out;
}

function stripHtml(h){ return h.replace(/<script[\s\S]*?<\/script>/gi,"").replace(/<style[\s\S]*?<\/style>/gi,"").replace(/<[^>]+>/g," ").replace(/&nbsp;/g," ").replace(/&amp;/g,"&").replace(/\s+/g," ").trim(); }
function extractPdf(file){ try{ return execFileSync("pdftotext", ["-layout", file, "-"], { encoding:"utf8", maxBuffer:64*1024*1024 }); }catch{ return null; } }
function transcribeAV(file){ try{ return execFileSync("python", [path.join(__dirname,"transcribe.py"), file], { encoding:"utf8", maxBuffer:64*1024*1024 }); }catch{ return null; } }

function extract(file){
  const ext=path.extname(file).toLowerCase();
  try{
    if(TEXT_EXT.has(ext)) return { text: fs.readFileSync(file,"utf8"), kind:"testo" };
    if(HTML_EXT.has(ext)) return { text: stripHtml(fs.readFileSync(file,"utf8")), kind:"html" };
    if(PDF_EXT.has(ext)){ const t=extractPdf(file); return t!=null?{text:t,kind:"pdf"}:{text:null,kind:"pdf",err:"pdftotext non disponibile (installa poppler)"}; }
    if(AV_EXT.has(ext)){ const t=transcribeAV(file); return t!=null?{text:t,kind:"audio/video"}:{text:null,kind:"audio/video",err:"trascrizione non disponibile (python/faster-whisper)"}; }
  }catch(e){ return { text:null, kind:ext||"?", err:e.message }; }
  return { text:null, kind:ext||"?", err:"tipo non supportato" };
}

let _prompt=null;
function organizerPrompt(){ if(_prompt!=null) return _prompt; try{ _prompt=fs.readFileSync(PROMPT_FILE,"utf8").replace(/^---[\s\S]*?---/,"").trim(); }catch{ _prompt=""; } return _prompt; }

async function ollama(system, prompt){
  const res = await fetch(OLLAMA+"/api/generate",{ method:"POST", headers:{"Content-Type":"application/json"},
    body: JSON.stringify({ model:MODEL, system, prompt, stream:false, think:false, options:{ temperature:0.2 } }) });
  if(!res.ok) throw new Error("ollama HTTP "+res.status);
  const j=await res.json();
  return (j.response||"").replace(/<think>[\s\S]*?<\/think>/g,"").trim();
}

async function organize(file){
  const ex = extract(file);
  const name = path.basename(file);
  if(!ex.text || !ex.text.trim()) return { stub:true, kind:ex.kind, err:ex.err||"vuoto" };
  const body = ex.text.slice(0, MAX_CHARS);
  const sys = organizerPrompt() || "Organizza il testo in una nota wiki strutturata in italiano. Conserva dati, numeri, nomi, codice.";
  const task = `FONTE: ${name} (tipo: ${ex.kind})\n\nCONTENUTO GREZZO:\n"""\n${body}\n"""\n\nProduci una nota WIKI in Markdown italiano con ESATTAMENTE questa struttura:\n# <titolo sintetico>\n\n**Sintesi:** <2-4 frasi>\n\n## Punti chiave\n- ...\n\n## Dettagli\n<paragrafi organizzati; conserva dati, numeri, nomi, codice/comandi letterali>\n\n## Tag\n<3-6 tag separati da virgola>\n\nSolo la nota, nessun commento.\n/no_think`;
  return { md: await ollama(sys, task), kind: ex.kind };
}

function frontmatter(rel, kind, tags, attr, keep){
  const orig = (attr.origine||"").replace(/"/g,"'").replace(/\s+/g," ").trim();
  return `---\ntipo: wiki\nfonte: "${rel}"\nkind: ${kind}\ninterlocutore: ${attr.interlocutore||'?'}\norigine: "${orig}"\ngrezzo_conservato: ${keep}\ncreated: ${new Date().toISOString()}\nconfidence: 0.6\ntag: [${tags}]\n---\n`;
}
function grabTags(md){ const m=md.match(/##\s*Tag\s*\n([^\n]+)/i); return m? m[1].split(/[,;]/).map(s=>s.trim().replace(/^#/,"")).filter(Boolean).slice(0,6).join(", ") : "wiki"; }

// chi ha generato il grezzo: sidecar <file>.meta.json, poi frontmatter (solo sorgenti testuali), poi default
function attribution(file){
  let interlocutore = DEFAULT_SPEAKER, origine = "";
  try{ const m = JSON.parse(fs.readFileSync(file + ".meta.json","utf8")); if(m.interlocutore) interlocutore = m.interlocutore; if(m.origine) origine = m.origine; return { interlocutore, origine }; }catch{}
  const ext = path.extname(file).toLowerCase();
  if(TEXT_EXT.has(ext) || HTML_EXT.has(ext)){
    try{ const head = fs.readFileSync(file,"utf8").slice(0,600); const mm = head.match(/interlocutore:\s*(.+)/i); if(mm) interlocutore = mm[1].trim(); const mo = head.match(/origine:\s*(.+)/i); if(mo) origine = mo[1].trim(); }catch{}
  }
  return { interlocutore, origine };
}

// check di ritenzione: vale la pena conservare il GREZZO o basta la wiki? In dubbio si conserva.
async function keepRaw(name, kind, md){
  if(RETENTION === "keep") return { keep:true, reason:"policy=keep" };
  try{
    const sys = "Decidi se il DOCUMENTO GREZZO originale va conservato per consultazione futura o se basta la sintesi wiki. CONSERVA il grezzo se: fonte primaria/di riferimento (contratto, fattura, dataset, paper, manuale, codice sorgente), valore probatorio/legale, o dettagli non riassumibili senza perdita. SCARTA il grezzo se effimero e la wiki ne cattura l'essenza (articolo divulgativo, pagina web generica, nota breve). Nel dubbio, conserva. Rispondi SOLO con JSON: {\"keep\":true|false,\"reason\":\"<breve>\"}.";
    const p = `Documento: ${name} (tipo: ${kind})\nSintesi wiki:\n${md.slice(0,1500)}\n/no_think\nJSON:`;
    const raw = await ollama(sys, p);
    const m = raw.match(/\{[\s\S]*\}/); if(!m) return { keep:true, reason:"check non interpretabile -> conservo" };
    const j = JSON.parse(m[0]); return { keep: j.keep !== false, reason: String(j.reason||"") };
  }catch(e){ return { keep:true, reason:"check fallito -> conservo ("+e.message+")" }; }
}

// soft-delete: sposta il grezzo (e il sidecar) nel cestino, MAI cancellazione irreversibile
function moveToTrash(file){
  try{
    fs.mkdirSync(TRASH,{recursive:true});
    const base = path.basename(file);
    let dest = path.join(TRASH, base);
    if(fs.existsSync(dest)) dest = path.join(TRASH, Date.now()+"_"+base);
    fs.renameSync(file, dest);
    const meta = file + ".meta.json"; if(fs.existsSync(meta)){ try{ fs.renameSync(meta, dest + ".meta.json"); }catch{} }
    return relPath(dest);
  }catch(e){ return null; }
}

async function processFile(file, ledger){
  const abs = path.resolve(file);
  const isExternal = !abs.startsWith(path.resolve(VAULT) + path.sep);
  const rel = isExternal ? abs : relPath(file);
  const srcLink = isExternal ? rel : "[[" + rel + "]]";   // wikilink solo per i file dentro il Vault
  let st; try{ st=fs.statSync(file); }catch{ return; }
  const prev = ledger[rel];
  if(prev && prev.mtime === st.mtimeMs && !REDO_ALL) return;
  log("processo:", rel);
  let res;
  try{ res = await organize(file); }catch(e){ log("errore organizzazione", rel, e.message); return; }

  const attr = attribution(file);
  const baseSlug = slugify(path.basename(file, path.extname(file)));
  const wikiRel = "WIKI/" + baseSlug + ".md";

  // uno stub non e' riassumibile: il grezzo si conserva sempre
  let decision = { keep:true, reason:"stub" };
  if(!res.stub) decision = isExternal ? { keep:true, reason:"fonte esterna (cloud): originale mai spostato" } : await keepRaw(path.basename(file), res.kind, res.md);

  let content;
  if(res.stub){
    content = frontmatter(rel, res.kind, "wiki, da-processare", attr, true) + `\n# ${path.basename(file)}\n\n**Sintesi:** Fonte non ancora estraibile automaticamente (${res.err}).\n\n> Fonte grezza: ${srcLink} · generato da: ${attr.interlocutore||'?'}. Estrazione non riuscita; processare a mano o con Claude.\n`;
  } else {
    const footer = decision.keep
      ? `> Fonte grezza: ${srcLink} · generato da: ${attr.interlocutore||'?'}\n`
      : `> Grezzo non conservato (solo sintesi) · generato da: ${attr.interlocutore||'?'} · motivo: ${decision.reason}. Originale in RAW_SOURCE/_cestino.\n`;
    content = frontmatter(rel, res.kind, grabTags(res.md), attr, decision.keep) + "\n" + res.md + "\n\n" + footer;
  }
  // cross-link: embedda il contenuto, trova 2-3 note WIKI affini e aggiunge una sezione "Collegati"
  let vec = null;
  try{ vec = await embedText(wikiRel.replace(/\.md$/,"") + "\n" + content); }catch(e){ log("embed (per affini) posticipato:", e.message); }
  if(vec){
    try{
      const hot = loadHot().filter(e => e.path.startsWith("WIKI/") && e.path !== wikiRel && Array.isArray(e.vector));
      const aff = hot.map(e => ({ path:e.path, s: cosine(vec, e.vector) })).filter(x => x.s >= WIKI_LINK_THR).sort((a,b)=>b.s-a.s).slice(0, WIKI_LINK_K);
      if(aff.length) content += "\n\n## Collegati\n" + aff.map(x => "- [[" + path.basename(x.path, ".md") + "]]").join("\n") + "\n";
    }catch(e){ log("cross-link fallito:", e.message); }
  }
  try{ fs.mkdirSync(WIKI,{recursive:true}); fs.writeFileSync(absPath(wikiRel), content); }catch(e){ log("scrittura wiki fallita", e.message); return; }
  if(vec){ try{ const entries = loadHot().filter(e=>e.path!==wikiRel); entries.push({ path:wikiRel, mtime:Date.now(), vector:vec }); saveHot(entries); }catch(e){ log("hot save posticipato:", e.message); } }

  let trashed = null;
  if(!res.stub && !decision.keep){ trashed = moveToTrash(file); log("grezzo nel cestino:", trashed||"(spostamento fallito, lasciato in sede)", "-", decision.reason); }

  ledger[rel] = { mtime: st.mtimeMs, wiki: wikiRel, at: new Date().toISOString(), stub: !!res.stub, interlocutore: attr.interlocutore||'?', grezzo_conservato: res.stub ? true : decision.keep, motivo: decision.reason, cestino: trashed };
  log("scritto:", wikiRel, res.stub?"(stub)":(decision.keep?"(grezzo conservato)":"(solo wiki)"));
}

async function runOnce(){
  fs.mkdirSync(RAW,{recursive:true}); fs.mkdirSync(WIKI,{recursive:true});
  const ledger = loadLedger();
  for(const d of [RAW, ...EXTRA_DIRS]){
    if(!fs.existsSync(d)){ log("cartella assente, salto:", d); continue; }
    for(const f of walk(d)) await processFile(f, ledger);
  }
  saveLedger(ledger);
}

async function main(){
  if(process.argv.includes("--watch")){
    log("watch RAW_SOURCE ogni", POLL_MS, "ms (modello:", MODEL + "). Ctrl+C per uscire.");
    for(;;){ try{ await runOnce(); }catch(e){ log("giro:", e.message); } await new Promise(r=>setTimeout(r, POLL_MS)); }
  } else { await runOnce(); log("fatto."); }
}
main();
