// jarvis-memory.mjs — memoria condivisa lato ponte, DETERMINISTICA.
//   recall(text) -> note pertinenti dal Vault (.smart-env + indice caldo), sopra soglia
//   ingest(u,a)  -> distilla lo scambio con Ollama (qwen3) e lo salva in 01_INBOX + indice caldo
// Tutto difensivo: qualunque errore qui NON deve mai rompere il turno dell'utente.
import fs from "node:fs";
import path from "node:path";
import { SmartConnectionsLoader } from "../smart-connections-mcp/dist/smart-connections-loader.js";
import { SearchEngine } from "../smart-connections-mcp/dist/search-engine.js";
import { fileURLToPath } from "node:url";
import { VAULT, embedText, loadHot, saveHot, cosine, absPath } from "../smart-connections-mcp/embedder.mjs";

const OLLAMA = process.env.OLLAMA_URL || "http://localhost:11434";
const MODEL  = process.env.JARVIS_WORKER_MODEL || "qwen3:8b";
const CHAT_MODEL = process.env.JARVIS_CHAT_MODEL || MODEL;  // modello veloce per la chat spiccia (consiglio un piccolo: qwen3:1.7b)
const LOCAL_MODEL = process.env.JARVIS_LOCAL_MODEL || MODEL;  // modello per la modalita' offline (consiglio piu' potente: qwen3:14b)
export const MODELS = { worker: MODEL, chat: CHAT_MODEL, local: LOCAL_MODEL };
const THRESH = parseFloat(process.env.JARVIS_RECALL_THRESHOLD || "0.5");
const INBOX  = path.join(VAULT, "01_INBOX");
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOGS = path.join(__dirname, "..", "logs");
const INTERACT_DIR = path.join(VAULT, "06_INTERAZIONI");
const INTERACT_LOG = path.join(LOGS, "interactions.jsonl");
const EXCLUDE_RECALL = "06_INTERAZIONI/";   // i nodi comportamentali NON entrano nel recall semantico
const RECALL_SKIP = ["06_INTERAZIONI/", "09_PROFILI/"];   // esclusi dal recall (telemetria + profili: iniettati a parte)
const CAP_FILE = path.join(VAULT, "00_CORE", "CAPABILITIES.md");   // manifesto capacità per l'interprete
const PROFILI_DIR = path.join(VAULT, "09_PROFILI");   // profili personali per utente

// Preambolo persona condiviso: Ollama non legge CLAUDE.md (lo fa solo Claude via SDK),
// quindi la persona JARVIS va iniettata qui in ogni system prompt locale.
const JARVIS = "Sei JARVIS, l'assistente personale di Fra: professionale, formale, arguto, conciso. Dai del «Signore» all'utente con parsimonia: al massimo una volta per risposta, in apertura o chiusura, MAI a fine di ogni frase. Verifica prima di affermare; non inventare. Rispondi in italiano, diretto, senza preamboli ne' ragionamento esposto. Non ripetere la domanda dell'utente.";

let _engine = null;
async function engine(){
  if(_engine) return _engine;
  const loader = new SmartConnectionsLoader(VAULT);
  await loader.initialize();
  _engine = new SearchEngine(loader);
  return _engine;
}

// ---- LETTURA: recall dal Vault (cold .smart-env + hot index), solo sopra soglia ----
export async function recall(text, k = 4){
  try{
    const vec = await embedText(text);
    let cold = [];
    try{ cold = (await engine()).getEmbeddingNeighbors(vec, k + 4, 0.0) || []; }catch(_){}
    const hot = loadHot().filter(e => fs.existsSync(absPath(e.path)))
      .map(e => ({ path: e.path, similarity: cosine(vec, e.vector) }));
    const byPath = new Map();
    for(const r of [...cold, ...hot]){ const p = byPath.get(r.path); if(!p || r.similarity > p.similarity) byPath.set(r.path, { path:r.path, similarity:r.similarity }); }
    const hits = [...byPath.values()].filter(r => r.similarity >= THRESH && !RECALL_SKIP.some(p=>r.path.startsWith(p))).sort((a,b)=>b.similarity-a.similarity).slice(0,k);
    for(const r of hits){ try{ const raw = fs.readFileSync(absPath(r.path),"utf8"); const mm = raw.match(/interlocutore:\s*(.+)/i); r.speaker = mm ? mm[1].trim() : ""; const t = raw.replace(/^---[\s\S]*?---/,"").replace(/\s+/g," ").trim(); r.snippet = t.slice(0,280); }catch(_){ r.snippet = ""; r.speaker = ""; } }
    return hits;
  }catch(_){ return []; }
}

// ---- gate di salienza: niente saluti/conferme/risposte banali ----
function salient(u, a){
  const t = (u||"").trim();
  if(t.length < 12) return false;
  if(/^(ciao|salve|grazie|ok|okay|va bene|perfetto|s[iì]|no|buongiorno|buonasera|ehi|hey)\b/i.test(t)) return false;
  if((a||"").trim().length < 120) return false;
  return true;
}

async function ollama(system, prompt, model){
  const res = await fetch(OLLAMA + "/api/generate", {
    method:"POST", headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({ model: model||MODEL, system, prompt, stream:false, think:false, options:{ temperature:0.2 } })
  });
  if(!res.ok) throw new Error("ollama HTTP " + res.status);
  const j = await res.json();
  return (j.response || "").replace(/<think>[\s\S]*?<\/think>/g,"").trim();
}

// ---- CHAT veloce (Ollama, NON salvata in memoria; opzionalmente osservata per lo schema comportamentale) ----
export async function chat(userText, speaker){
  let reply = "";
  try{
    const sys = JARVIS + " Modalita' CHAT veloce: scambio breve, una o due frasi.";
    reply = await ollama(sys, String(userText) + "\n/no_think", CHAT_MODEL);
  }catch(e){ reply = "(modello locale non raggiungibile: " + e.message + ")"; }
  try{ observe(userText, reply, speaker); }catch(_){}   // canale comportamentale; MAI ingest in memoria
  return reply;
}

// ---- MODALITA' LOCALE (offline): risposta via Ollama con la memoria gia' iniettata dal ponte ----
export async function localChat(augmentedPrompt, speaker){
  const sys = JARVIS + " MODALITA' LOCALE (offline): usa la memoria fornita nel prompt. Se ti viene chiesta un'azione che richiede strumenti (file, codice, web), spiega che in locale puoi consigliare ma non eseguire.";
  return await ollama(sys, String(augmentedPrompt) + "\n/no_think", LOCAL_MODEL);
}

// ---- INTERPRETE/router del canale generale: legge il manifesto capacità e decide l'azione ----
let _cap = null;
function capManifest(){ if(_cap != null) return _cap; try{ _cap = fs.readFileSync(CAP_FILE, "utf8"); }catch{ _cap = ""; } return _cap; }
export async function interpret(text){
  const man = capManifest();
  if(!man) return null;
  const sys = JARVIS + "\n\nQui agisci come ROUTER: usa queste capacità per decidere l'azione del messaggio dell'utente. Rispondi SOLO con un oggetto JSON valido, nient'altro.\n\n" + man;
  let raw;
  try{ raw = await ollama(sys, "Messaggio dell'utente: " + String(text) + "\n/no_think\nJSON:", MODEL); }
  catch(e){ return null; }
  const m = raw.match(/\{[\s\S]*\}/);
  if(!m) return null;
  try{ return JSON.parse(m[0]); }catch{ return null; }
}

// ---- SCRITTURA: distilla lo scambio e salvalo nell'inbox + indice caldo ----
export async function ingest(userText, answer, speaker){
  if(!salient(userText, answer)) return { skipped:true };
  const sys = "Sei un archivista. Dato uno scambio utente/assistente, estrai SOLO il fatto saliente da ricordare. Italiano, conciso, niente ragionamento ne' preamboli.";
  const prompt = `SCAMBIO\nUtente: ${userText}\nAssistente: ${answer}\n\nProduci ESATTAMENTE in questo formato:\nTITOLO: <max 8 parole>\nFATTO: <2-4 frasi, solo l'esito/decisione/informazione utile>\nTAG: <3-5 tag separati da virgola>\n/no_think`;
  let raw;
  try{ raw = await ollama(sys, prompt); }catch(e){ return { error: "ollama: " + e.message }; }
  const grab = (re) => { const m = raw.match(re); return m ? m[1].trim() : ""; };
  const titolo = grab(/TITOLO:\s*(.+)/i) || "Nota di sessione";
  const fatto  = grab(/FATTO:\s*([\s\S]*?)(?:\nTAG:|$)/i) || raw;
  const tagRaw = grab(/TAG:\s*(.+)/i) || "sessione";
  const tags = "[" + tagRaw.split(/[,;]/).map(s=>s.trim()).filter(Boolean).slice(0,6).join(", ") + "]";
  const now = new Date();
  const stamp = now.toISOString().replace(/[:.]/g,"-").slice(0,19);
  const rel = "01_INBOX/CONV-" + stamp + ".md";
  const body = `---\ntipo: inbox\ninterlocutore: ${speaker||'?'}\ncreated: ${now.toISOString()}\nconfidence: 0.4\nverificato: false\ntag: ${tags}\n---\n\n# ${titolo}\n\n${fatto}\n\n> Origine: scambio di JARVIS con ${speaker||'?'} del ${now.toLocaleString("it-IT")}. Da promuovere o potare dal verificatore 3:00.\n`;
  try{ fs.mkdirSync(INBOX, { recursive:true }); fs.writeFileSync(absPath(rel), body); }catch(e){ return { error: "write: " + e.message }; }
  try{ const vec = await embedText(rel.replace(/\.md$/,"") + "\n" + titolo + "\n" + fatto); const entries = loadHot().filter(e=>e.path!==rel); entries.push({ path:rel, mtime:Date.now(), vector:vec }); saveHot(entries); }catch(_){}
  return { saved: rel, titolo };
}

// ---- CANALE COMPORTAMENTALE: osserva OGNI interazione (niente gate di salienza) ----
function slugify(s){ return String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,40) || "vario"; }

function upsertTopic(topic, coOccur, now, speaker){
  const slug = slugify(topic);
  const rel = EXCLUDE_RECALL + slug + ".md";
  const abs = absPath(rel);
  let content;
  if(fs.existsSync(abs)){ content = fs.readFileSync(abs, "utf8"); }
  else { content = `---\ntipo: interazione-topic\ntopic: ${topic}\ncreated: ${now.toISOString()}\n---\n\n# ${topic}\n\nNodo di interazione (telemetria comportamentale). Escluso dal recall semantico.\n\n## Occorrenze\n\n## Affini\n`; }
  content = content.replace("## Occorrenze\n", `## Occorrenze\n- ${now.toISOString()} (con ${speaker||'?'})\n`);
  for(const c of coOccur){ const cs = slugify(c); const link = "[[" + cs + "]]"; if(cs!==slug && !content.includes(link)) content = content.replace("## Affini\n", `## Affini\n- ${link}\n`); }
  fs.writeFileSync(abs, content);
}

async function classifyTopics(userText, answer){
  const sys = "Classifica l'argomento della richiesta in 1-3 etichette brevi (1-2 parole, minuscolo, italiano). Rispondi SOLO con le etichette separate da virgola, niente altro.";
  const p = `Richiesta: ${userText}\n(risposta, estratto: ${(answer||"").slice(0,200)})\nEtichette:\n/no_think`;
  return await ollama(sys, p);
}

export async function observe(userText, answer, speaker){
  try{
    const raw = await classifyTopics(userText, answer);
    const topics = raw.split(/[,;\n]/).map(s=>s.trim().replace(/^[-*\d.\s]+/,"")).filter(Boolean).slice(0,3);
    if(topics.length === 0) return { topics: [] };
    const now = new Date();
    try{ fs.mkdirSync(LOGS, { recursive:true }); fs.appendFileSync(INTERACT_LOG, JSON.stringify({ ts:now.toISOString(), speaker:speaker||'?', hour:now.getHours(), dow:now.getDay(), topics, len:(userText||"").length }) + "\n"); }catch(_){}
    try{ fs.mkdirSync(INTERACT_DIR, { recursive:true }); for(const t of topics) upsertTopic(t, topics, now, speaker); }catch(_){}
    return { topics };
  }catch(e){ return { error: e.message }; }
}

// ---- ANALIZZATORE ABITUDINI + DOMANDE DI CURIOSITA' (deterministico, locale) ----
const HABIT_MIN  = parseInt(process.env.JARVIS_HABIT_MIN  || "3", 10);  // tarabili strada facendo
const HABIT_DAYS = parseInt(process.env.JARVIS_HABIT_DAYS || "2", 10);
const ASKED = path.join(LOGS, "curiosity-asked.json");

function readEvents(){
  try{ return fs.readFileSync(INTERACT_LOG,"utf8").trim().split("\n").filter(Boolean).map(l=>{ try{ return JSON.parse(l); }catch{ return null; } }).filter(Boolean); }
  catch{ return []; }
}
function aggregate(){
  const ev = readEvents(); const byTopic = new Map(); const pair = new Map();
  for(const e of ev){
    const ts = e.ts || ""; const day = ts.slice(0,10); const ts2 = (e.topics||[]).map(x=>String(x).toLowerCase());
    for(const k of ts2){ if(!byTopic.has(k)) byTopic.set(k,{topic:k,count:0,days:new Set(),hours:[],last:ts}); const o=byTopic.get(k); o.count++; o.days.add(day); if(typeof e.hour==="number") o.hours.push(e.hour); if(ts>o.last) o.last=ts; }
    for(let i=0;i<ts2.length;i++) for(let j=i+1;j<ts2.length;j++){ const kk=[ts2[i],ts2[j]].sort().join(" ↔ "); pair.set(kk,(pair.get(kk)||0)+1); }
  }
  const topics=[...byTopic.values()].map(o=>({topic:o.topic,count:o.count,days:o.days.size,hour:o.hours.length?Math.round(o.hours.reduce((a,b)=>a+b,0)/o.hours.length):null,last:o.last})).sort((a,b)=>b.count-a.count);
  const pairs=[...pair.entries()].map(([k,v])=>({pair:k,count:v})).filter(p=>p.count>=2).sort((a,b)=>b.count-a.count);
  return { topics, pairs };
}
function isHabit(t){ return t.count>=HABIT_MIN && t.days>=HABIT_DAYS; }

export function analyzeHabits(){
  try{
    const { topics, pairs } = aggregate();
    const habits = topics.filter(isHabit);
    const rows = habits.map(h=>`| ${h.topic} | ${h.count} | ${h.days} | ${h.hour!=null?String(h.hour).padStart(2,"0")+":00":"—"} | ${h.last.slice(0,10)} |`).join("\n");
    const aff = pairs.slice(0,12).map(p=>`- ${p.pair.split(" ↔ ").map(s=>"[["+slugify(s)+"]]").join(" ↔ ")} (${p.count})`).join("\n");
    const body = `---\ntipo: profilo-abitudini\naggiornato: ${new Date().toISOString()}\n---\n\n# Profilo abitudini (telemetria comportamentale)\nGenerato dall'analizzatore. Escluso dal recall semantico.\n\n## Abitudini ricorrenti\n| Topic | Volte | Giorni | Ora tipica | Ultima |\n|---|---|---|---|---|\n${rows||"| (nessuna ancora) |  |  |  |  |"}\n\n## Affinita' (co-occorrenze)\n${aff||"- (nessuna ancora)"}\n`;
    fs.mkdirSync(INTERACT_DIR,{recursive:true}); fs.writeFileSync(absPath("06_INTERAZIONI/_PROFILO.md"), body);
    return { habits: habits.length, pairs: pairs.length };
  }catch(e){ return { error: e.message }; }
}

export function habitsContext(){
  try{
    const habits = aggregate().topics.filter(isHabit).slice(0,4);
    if(habits.length===0) return "";
    const h = new Date().getHours();
    const fascia = h<6?"notte":h<12?"mattina":h<18?"pomeriggio":"sera";
    const list = habits.map(t=>`${t.topic}${t.hour!=null?` (~${String(t.hour).padStart(2,"0")}:00)`:""}`).join(", ");
    return `## Profilo abitudini (telemetria; usalo per essere proattivo, con discrezione)\nAbitudini ricorrenti dell'utente: ${list}.\nOra attuale: ${String(h).padStart(2,"0")}:00 (${fascia}). Se pertinente all'orario/abitudine, anticipa con naturalezza cio' che l'utente di solito chiede.`;
  }catch{ return ""; }
}

// ---- PROFILO PERSONALE: contesto dell'interlocutore (iniettato al primo turno, non nel recall) ----
export function profileContext(speaker){
  try{
    const f = path.join(PROFILI_DIR, "PROFILO_" + slugify(speaker||"Fra") + ".md");
    if(!fs.existsSync(f)) return "";
    let raw = fs.readFileSync(f,"utf8").replace(/^---[\s\S]*?---/,"").trim();
    const cut = raw.indexOf("## Storico versioni");   // solo il profilo corrente, non lo storico
    if(cut > 0) raw = raw.slice(0, cut).trim();
    if(!raw) return "";
    if(raw.length > 4000) raw = raw.slice(0, 4000);
    return "## Profilo dell'interlocutore (" + (speaker||"Fra") + ") — usalo per calibrare tono, priorita' e contesto; non citarlo se non richiesto\n" + raw;
  }catch{ return ""; }
}

function loadAsked(){ try{ return new Set(JSON.parse(fs.readFileSync(ASKED,"utf8"))); }catch{ return new Set(); } }
function saveAsked(s){ try{ fs.mkdirSync(LOGS,{recursive:true}); fs.writeFileSync(ASKED, JSON.stringify([...s])); }catch{} }
export function nextCuriosity(){
  try{
    const asked = loadAsked();
    const cand = aggregate().topics.find(t=>isHabit(t) && !asked.has(t.topic));
    if(!cand) return null;
    asked.add(cand.topic); saveAsked(asked);
    const ora = cand.hour!=null?` di solito verso le ${String(cand.hour).padStart(2,"0")}:00`:"";
    return `Una curiosita', Signore: noto che torna spesso su "${cand.topic}" (${cand.count} volte${ora}). Come mai? Capirlo mi aiuta a esserLe piu' utile.`;
  }catch{ return null; }
}
