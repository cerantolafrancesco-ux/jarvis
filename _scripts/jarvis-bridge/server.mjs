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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const JARVIS_DIR = 'C:\\Users\\ceran\\Documents\\Claude\\Projects\\JARVIS';
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
const CLAUDE_EXE = 'C:\\Users\\ceran\\.local\\bin\\claude.exe';
const wss = new WebSocketServer({ server });
wss.on('connection', ws=>{
  let sessionId = null;            // memoria di sessione per terminale (multi-turno)
  const pending = new Map(); let pid = 0;   // permessi in attesa
  const sendJ = o=>{ try{ ws.send(JSON.stringify(o)); }catch(_){} };
  sendJ({type:'sys', text:'JARVIS connesso.'});

  ws.on('message', async raw=>{
    let msg; try{ msg=JSON.parse(raw); }catch{ return; }

    // risposta a una richiesta di permesso dalla UI
    if(msg.type==='permission-response'){ const r=pending.get(msg.id); if(r){ pending.delete(msg.id); r(!!msg.allow); } return; }

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

    try{
      const opts = { cwd: JARVIS_DIR, pathToClaudeCodeExecutable: CLAUDE_EXE, canUseTool };
      if(sessionId) opts.resume = sessionId;            // continua la conversazione del terminale
      const it = query({ prompt: msg.text, options: opts });
      for await (const m of it){
        if(!m) continue;
        if(m.session_id) sessionId = m.session_id;       // cattura/aggiorna l'id sessione
        if(m.type==='assistant'){
          const c = m.message?.content || m.content || [];
          const text = Array.isArray(c) ? c.filter(b=>b&&b.type==='text').map(b=>b.text).join('') : (typeof c==='string'?c:'');
          if(text) sendJ({type:'response', text});
        } else if(m.type==='result'){
          sendJ({type:'done'});
        }
      }
      sendJ({type:'state', state:'idle'});
    }catch(e){ sendJ({type:'error', text:e.message}); sendJ({type:'state',state:'idle'}); }
  });
});

server.listen(PORT, ()=>console.log('JARVIS bridge: http://localhost:'+PORT+'  (ws stesso porto)'));
