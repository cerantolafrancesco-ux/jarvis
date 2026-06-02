// synthesize-profile.mjs — Sintetizzatore di Profilo Personale per utente.
// Pesca dal Vault (note attribuite, WIKI, abitudini/telemetria) un corpus per interlocutore,
// applica il prompt 00_CORE/PROFILE_SYNTH.md e scrive 09_PROFILI/PROFILO_<utente>.md.
// VERSIONATO: non elimina le versioni vecchie -> storico inline (<details>) + archivio _storico/.
// Uso: node synthesize-profile.mjs [utente] [--force]
//   senza argomenti: tutti gli utenti con dati, con throttle settimanale.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { VAULT } from "../smart-connections-mcp/embedder.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OLLAMA = process.env.OLLAMA_URL || "http://localhost:11434";
const MODEL  = process.env.JARVIS_PROFILE_MODEL || process.env.JARVIS_WORKER_MODEL || "qwen3:8b";
// motore di sintesi: "claude" (qualità, via claude.exe) con ripiego su Ollama; "ollama" per restare in locale
const ENGINE = (process.env.JARVIS_PROFILE_ENGINE || "claude").toLowerCase();
const CLAUDE_EXE = process.env.JARVIS_CLAUDE_EXE || "C:\\Users\\ceran\\.local\\bin\\claude.exe";
const CLAUDE_MODEL = process.env.JARVIS_PROFILE_CLAUDE_MODEL || "sonnet";
const PROMPT_FILE = path.join(VAULT, "00_CORE", "PROFILE_SYNTH.md");
const PROFILI = path.join(VAULT, "09_PROFILI");
const STORICO = path.join(PROFILI, "_storico");
const RUNS = path.join(__dirname, "..", "logs", "profile-runs.json");
const EVERY_DAYS = parseInt(process.env.JARVIS_PROFILE_EVERY_DAYS || "7", 10);
const MAX_CHARS = parseInt(process.env.JARVIS_PROFILE_MAXCHARS || "40000", 10);
const INLINE_HISTORY = 5;
const SOURCE_DIRS = (process.env.JARVIS_PROFILE_DIRS || "03_RECORDS,04_SYNTHESIS,02_MEMORY_NODES,01_INBOX,WIKI").split(",").map(s=>s.trim()).filter(Boolean);
const FORCE = process.argv.includes("--force");
const ONLY_USER = process.argv.slice(2).find(a=>!a.startsWith("--"));

const log = (...a)=>console.log("[PROFILO]", ...a);
function slugify(s){ return String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,40) || "utente"; }
function fmField(raw, field){ const m = raw.match(new RegExp("^"+field+":\\s*(.+)$","im")); return m ? m[1].trim().replace(/^["']|["']$/g,"") : ""; }
function loadRuns(){ try{ return JSON.parse(fs.readFileSync(RUNS,"utf8")); }catch{ return {}; } }
function saveRuns(r){ try{ fs.mkdirSync(path.dirname(RUNS),{recursive:true}); fs.writeFileSync(RUNS, JSON.stringify(r,null,2)); }catch{} }

function walkMd(dir){
  const out=[]; let e=[];
  try{ e=fs.readdirSync(dir,{withFileTypes:true}); }catch{ return out; }
  for(const x of e){
    if(x.name.startsWith(".")||x.name.startsWith("_")||/^readme/i.test(x.name)) continue;
    const p=path.join(dir,x.name);
    if(x.isDirectory()) out.push(...walkMd(p)); else if(x.name.endsWith(".md")) out.push(p);
  }
  return out;
}

function ollama(system, prompt){
  return fetch(OLLAMA+"/api/generate",{ method:"POST", headers:{"Content-Type":"application/json"},
    body: JSON.stringify({ model:MODEL, system, prompt, stream:false, think:false, options:{ temperature:0.3 } }) })
    .then(r=>{ if(!r.ok) throw new Error("ollama HTTP "+r.status); return r.json(); })
    .then(j=>(j.response||"").replace(/<think>[\s\S]*?<\/think>/g,"").trim());
}

// sintesi via Claude (claude.exe in print mode). cwd neutro: niente CLAUDE.md del progetto a interferire.
function callClaude(system, prompt){
  return new Promise((resolve, reject)=>{
    let out="", err="";
    const ch = spawn(CLAUDE_EXE, ["-p","--model",CLAUDE_MODEL], { cwd: __dirname });
    ch.on("error", reject);
    ch.stdout.on("data", d=> out+=d);
    ch.stderr.on("data", d=> err+=d);
    ch.on("close", code=> code===0 ? resolve(String(out).trim()) : reject(new Error("claude exit "+code+": "+String(err).slice(0,200))));
    ch.stdin.write(system + "\n\n" + prompt + "\n");
    ch.stdin.end();
  });
}

// corpus per ogni utente, attribuito via frontmatter interlocutore
function gather(){
  const byUser = new Map();
  const add = (user, src, text) => { if(!user) return; if(!byUser.has(user)) byUser.set(user, []); byUser.get(user).push({ src, text }); };
  for(const d of SOURCE_DIRS){
    for(const f of walkMd(path.join(VAULT, d))){
      let raw=""; try{ raw=fs.readFileSync(f,"utf8"); }catch{ continue; }
      let user = fmField(raw.slice(0,800), "interlocutore");
      if(!user){ if(d==="WIKI") continue; user = "Fra"; }   // note non attribuite -> Fra (wiki generica esclusa)
      const body = raw.replace(/^---[\s\S]*?---/,"").replace(/\n{3,}/g,"\n\n").trim();
      if(body) add(user, d+"/"+path.basename(f), body);
    }
  }
  return byUser;
}

// abitudini/telemetria per utente: interactions.jsonl filtrato + profilo globale
function habits(user){
  const parts=[];
  try{
    const rows = fs.readFileSync(path.join(__dirname,"..","logs","interactions.jsonl"),"utf8").trim().split("\n")
      .map(l=>{ try{ return JSON.parse(l); }catch{ return null; } }).filter(Boolean).filter(e=>(e.speaker||"")===user);
    const topics=new Map();
    for(const e of rows) for(const t of (e.topics||[])) topics.set(t,(topics.get(t)||0)+1);
    const top=[...topics.entries()].sort((a,b)=>b[1]-a[1]).slice(0,15).map(([t,c])=>`${t} (${c})`).join(", ");
    if(top) parts.push("Argomenti ricorrenti (telemetria): "+top);
  }catch{}
  try{ const g = fs.readFileSync(path.join(VAULT,"06_INTERAZIONI","_PROFILO.md"),"utf8").replace(/^---[\s\S]*?---/,"").trim(); if(g) parts.push("Profilo abitudini globale:\n"+g); }catch{}
  return parts.join("\n\n");
}

function corpusFor(user, notes){
  let s=""; const h=habits(user); if(h) s += "### ABITUDINI / TELEMETRIA\n"+h+"\n\n";
  for(const n of notes){ const chunk = `### ${n.src}\n${n.text}\n\n`; if(s.length+chunk.length>MAX_CHARS) break; s += chunk; }
  return s.slice(0, MAX_CHARS);
}

function extractCurrent(raw){ let b = raw.replace(/^---[\s\S]*?---/,"").trim(); const c = b.indexOf("## Storico versioni"); return c>0 ? b.slice(0,c).trim() : b; }
function extractHistory(raw){ const c = raw.indexOf("## Storico versioni"); return c>=0 ? raw.slice(c) : ""; }

async function synth(user, notes){
  const h = habits(user);
  if((!notes || notes.length===0) && !h){ log("nessun dato per", user, "- salto"); return false; }
  const corpus = corpusFor(user, notes||[]);
  let sys; try{ sys = fs.readFileSync(PROMPT_FILE,"utf8").replace(/^---[\s\S]*?---/,"").trim(); }catch{ sys = "Sintetizza un Profilo Personale in Markdown."; }
  const prompt = `Persona da profilare: ${user}\n\nCORPUS (dati eterogenei dal Vault):\n"""\n${corpus}\n"""\n\nProduci il Profilo Personale di ${user} nel formato richiesto. Solo il profilo in Markdown, nessun commento.\n/no_think`;
  let profile;
  try{
    profile = ENGINE === "claude" ? await callClaude(sys, prompt) : await ollama(sys, prompt);
  }catch(e){
    log(ENGINE+" fallito:", e.message);
    if(ENGINE === "claude"){ try{ log("ripiego su Ollama..."); profile = await ollama(sys, prompt); }catch(e2){ log("anche Ollama fallito:", e2.message); return false; } }
    else return false;
  }
  if(!profile || profile.length < 80){ log("output troppo breve per", user, "- salto"); return false; }

  fs.mkdirSync(PROFILI,{recursive:true}); fs.mkdirSync(STORICO,{recursive:true});
  const slug = slugify(user);
  const file = path.join(PROFILI, "PROFILO_"+slug+".md");
  const now = new Date(); const stamp = now.toISOString().slice(0,19).replace(/[:T]/g,"-");

  let version=1, history="";
  if(fs.existsSync(file)){
    const oldRaw = fs.readFileSync(file,"utf8");
    version = (parseInt(fmField(oldRaw,"versione")||"1",10) || 1) + 1;
    const oldCur = extractCurrent(oldRaw);
    const norm = s=>s.replace(/\s+/g," ").trim();
    if(norm(oldCur)===norm(profile)){ log(user,"- profilo invariato, nessuna nuova versione"); return true; }
    try{ fs.writeFileSync(path.join(STORICO, `PROFILO_${slug}_${stamp}.md`), oldRaw); }catch{}
    const prevDate = fmField(oldRaw,"aggiornato") || "(data ignota)";
    const block = `<details>\n<summary>Versione del ${prevDate}</summary>\n\n${oldCur}\n\n</details>\n`;
    const prevHist = extractHistory(oldRaw).replace(/^## Storico versioni\s*/,"");
    const blocks = (block + "\n" + prevHist).split(/(?=<details>)/).filter(s=>s.trim()).slice(0, INLINE_HISTORY);
    history = "## Storico versioni\n\n" + blocks.join("\n");
  }

  const fm = `---\ntipo: profilo-personale\ninterlocutore: ${user}\nversione: ${version}\naggiornato: ${now.toISOString()}\n---\n`;
  const content = fm + "\n" + profile.trim() + "\n\n" + (history || "## Storico versioni\n\n_(prima versione)_\n");
  fs.writeFileSync(file, content);
  log(user, "- profilo v"+version, "->", path.relative(VAULT,file));
  return true;
}

async function main(){
  const byUser = gather();
  const users = ONLY_USER ? [ONLY_USER] : [...byUser.keys()];
  if(users.length===0){ log("nessun utente con dati nel Vault."); return; }
  const runs = loadRuns();
  for(const u of users){
    const last = runs[u] ? Date.parse(runs[u]) : 0;
    const days = last ? (Date.now()-last)/86400000 : Infinity;
    if(!FORCE && last && days < EVERY_DAYS){ log(u, `- ultimo profilo ${days.toFixed(1)}g fa (<${EVERY_DAYS}g), salto`); continue; }
    const ok = await synth(u, byUser.get(u)||[]);
    if(ok){ runs[u] = new Date().toISOString(); saveRuns(runs); }
  }
  log("fatto.");
}
main();
