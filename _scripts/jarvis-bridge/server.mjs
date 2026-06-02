/*
 * JARVIS bridge — Fase A
 * HTTP statico (serve public/index.html) + WebSocket sullo stesso porto.
 * Per ogni prompt dalla UI avvia una query al cervello (Claude Agent SDK) e
 * rimanda alla UI SOLO il testo delle risposte dell'assistente (filtra il resto).
 * I permessi interattivi e gli stati arriveranno in Fase B/C.
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';
import * as mem from './jarvis-memory.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const JARVIS_DIR = process.env.JARVIS_HOME || path.resolve(__dirname, '..', '..');  // radice del progetto, auto-localizzata (override: JARVIS_HOME)
const PORT = 8787;

// --- carica ANTHROPIC_API_KEY dal .env in _scripts (cartella padre) ---
function loadEnv(file){ try{ for(const l of fs.readFileSync(file,'utf8').split(/\r?\n/)){ const m=l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/); if(m && !process.env[m[1]]) process.env[m[1]]=m[2].replace(/^["']|["']$/g,''); } }catch(_){} }
loadEnv(path.join(__dirname, '..', '.env'));
if(!process.env.ANTHROPIC_API_KEY){ console.warn('⚠  ANTHROPIC_API_KEY mancante in _scripts/.env — il cervello non potrà rispondere.'); }

// --- import dinamico dell'SDK (così il server parte anche se va aggiustato il nome) ---
let query=null;
try { ({ query } = await import('@anthropic-ai/claude-agent-sdk')); }
catch(e){ console.error('⚠  Impossibile importare @anthropic-ai/claude-agent-sdk:', e.message); }

// --- HTTP statico ---
const server = http.createServer((req,res)=>{
  let f = req.url==='/'||req.url==='' ? '/index.html' : req.url.split('?')[0];
  const fp = path.join(__dirname,'public',f);
  fs.readFile(fp,(err,data)=>{
    if(err){ res.writeHead(404); res.end('not found'); return; }
    const ext=path.extname(fp).toLowerCase();
    const ct = ext==='.html'?'text/html':ext==='.js'?'text/javascript':ext==='.css'?'text/css':'application/octet-stream';
    res.writeHead(200,{'Content-Type':ct}); res.end(data);
  });
});

// --- WebSocket sullo stesso porto ---
const CLAUDE_EXE = process.env.JARVIS_CLAUDE_EXE || 'C:\\Users\\ceran\\.local\\bin\\claude.exe';  // su un altro PC: imposta JARVIS_CLAUDE_EXE

// --- selezione modello a livelli (leva di costo) ---
// default Sonnet; Opus per task complessi/lunghi; Haiku per roba banale.
// override manuale: il prompt inizia con !opus / !sonnet / !haiku
function pickModel(text){
  const t = text.trim();
  const ov = t.match(/^!\s*(haiku|sonnet|opus)\b[ ,:]*/i);
  if(ov){ return { model: ov[1].toLowerCase(), prompt: t.slice(ov[0].length) }; }
  if(/\b(opus|progett\w*|architett\w*|refactor\w*|debug\w*|dimostr\w*|ragion\w*|compless\w*|pianific\w*|algoritm\w*|analizz\w*)\b/i.test(t) || t.length > 600){
    return { model: 'opus', prompt: t };
  }
  if(t.length <= 60 && /^(ciao|salve|grazie|ok|okay|va bene|perfetto|s[iì]|no|buongiorno|buonasera|ehi|hey)\b/i.test(t)){
    return { model: 'haiku', prompt: t };
  }
  return { model: 'sonnet', prompt: t };
}
const wss = new WebSocketServer({ server });
wss.on('connection', ws=>{
  let sessionId = null;            // memoria di sessione per terminale (multi-turno)
  let firstTurn = true;            // primo scambio della sessione (per profilo abitudini + curiosita')
  const pending = new Map(); let pid = 0;   // permessi in attesa
  const sendJ = o=>{ try{ ws.send(JSON.stringify(o)); }catch(_){} };
  sendJ({type:'sys', text:'JARVIS connesso.'});

  ws.on('message', async raw=>{
    let msg; try{ msg=JSON.parse(raw); }catch{ return; }

    // risposta a una richiesta di permesso dalla UI
    if(msg.type==='permission-response'){ const r=pending.get(msg.id); if(r){ pending.delete(msg.id); r(!!msg.allow); } return; }

    // ripristino: la UI chiede di riprendere una sessione salvata (refresh pagina)
    if(msg.type==='resume'){ if(msg.id) sessionId = msg.id; return; }

    if(msg.type!=='prompt' || !msg.text) return;
    if(!query){ sendJ({type:'error',text:'SDK non disponibile (controlla il nome pacchetto).'}); return; }
    sendJ({type:'state', state:'active'});

    // callback permessi: la UI mostra tool+input e accetta/rifiuta
    const canUseTool = async (toolName, input)=>{
      const id = ++pid;
      sendJ({type:'permission', id, tool: toolName, input});
      sendJ({type:'state', state:'waiting'});
      const allow = await new Promise(res=>pending.set(id, res));
      sendJ({type:'state', state:'active'});
      return allow ? { behavior:'allow', updatedInput: input }
                   : { behavior:'deny', message:'Permesso negato dall\'utente.' };
    };

    const { model, prompt } = pickModel(msg.text);
    sendJ({type:'model', model});
    let answer = '';
    const isFirst = firstTurn; firstTurn = false;
    try{
      // recall deterministico dal Vault: antepone le note pertinenti (locale, gratuito)
      let augmented = prompt;
      try{ const hits = await mem.recall(prompt);
        if(hits && hits.length){ augmented = "## Memoria pertinente dal Vault (recall automatico)\n" + hits.map(h=>`- [${h.similarity.toFixed(2)}] ${h.path}: ${h.snippet}`).join("\n") + "\n\n---\n\n" + prompt; }
      }catch(_){}
      if(isFirst){ try{ const hc = mem.habitsContext(); if(hc) augmented = hc + "\n\n---\n\n" + augmented; }catch(_){} }
      const opts = { cwd: JARVIS_DIR, pathToClaudeCodeExecutable: CLAUDE_EXE, canUseTool, model };
      if(sessionId) opts.resume = sessionId;            // continua la conversazione del terminale
      const it = query({ prompt: augmented, options: opts });
      for await (const m of it){
        if(!m) continue;
        if(m.session_id && m.session_id!==sessionId){ sessionId = m.session_id; sendJ({type:'session', id:sessionId}); }  // cattura/aggiorna l'id e lo passa alla UI per la persistenza
        if(m.type==='assistant'){
          const c = m.message?.content || m.content || [];
          const text = Array.isArray(c) ? c.filter(b=>b&&b.type==='text').map(b=>b.text).join('') : (typeof c==='string'?c:'');
          if(text){ answer += text; sendJ({type:'response', text}); }
        } else if(m.type==='result'){
          const usd = typeof m.total_cost_usd==='number' ? m.total_cost_usd : null;
          if(usd!=null){
            const u = m.usage || {};
            const line = `${new Date().toISOString()}  [${model}]  $${usd.toFixed(4)}  in=${u.input_tokens||0} out=${u.output_tokens||0} cache_read=${u.cache_read_input_tokens||0} cache_make=${u.cache_creation_input_tokens||0}\n`;
            try{ fs.mkdirSync(path.join(__dirname,'..','logs'),{recursive:true}); fs.appendFileSync(path.join(__dirname,'..','logs','jarvis-cost.log'), line); }catch(_){}
            sendJ({type:'cost', usd, usage:u});
          }
          mem.ingest(prompt, answer).then(r=>{ try{ fs.mkdirSync(path.join(__dirname,'..','logs'),{recursive:true}); fs.appendFileSync(path.join(__dirname,'..','logs','jarvis-mem.log'), `${new Date().toISOString()} ${JSON.stringify(r)}\n`); }catch(_){} }).catch(()=>{});
          mem.observe(prompt, answer).catch(()=>{});  // canale comportamentale: ogni interazione
          sendJ({type:'done'});
          if(isFirst){ try{ mem.analyzeHabits(); const q = mem.nextCuriosity(); if(q) setTimeout(()=>sendJ({type:'response', text:q}), 700); }catch(_){} }
        }
      }
      sendJ({type:'state', state:'idle'});
    }catch(e){ sendJ({type:'error', text:e.message}); sendJ({type:'state',state:'idle'}); }
  });
});

server.listen(PORT, ()=>console.log('JARVIS bridge: http://localhost:'+PORT+'  (ws stesso porto)'));
