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
  if(req.method==='POST' && req.url==='/voice'){   // testo trascritto dal servizio voce -> inoltrato alla UI (canale chat)
    let body=''; req.on('data',c=>body+=c); req.on('end',()=>{
      let text='', spk=''; try{ const j=JSON.parse(body||'{}'); text=j.text||''; spk=j.speaker||''; }catch(_){}
      if(text){ for(const c of wss.clients){ try{ c.send(JSON.stringify({type:'voice', text, speaker: spk})); }catch(_){} } }
      res.writeHead(200,{'Content-Type':'application/json'}); res.end('{"ok":true}');
    });
    return;
  }
  if(req.method==='POST' && req.url==='/voice-state'){   // stato sessione vocale (active|idle) -> UI
    let body=''; req.on('data',c=>body+=c); req.on('end',()=>{
      let st=''; try{ st=JSON.parse(body||'{}').state||''; }catch(_){}
      if(st){ for(const c of wss.clients){ try{ c.send(JSON.stringify({type:'voice-state', state:st})); }catch(_){} } }
      res.writeHead(200,{'Content-Type':'application/json'}); res.end('{"ok":true}');
    });
    return;
  }
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
// comando UI riconosciuto dal canale chat (orchestrazione: apri terminali)
function parseUiCommand(text){
  const t = String(text||'').trim();
  if(/\b(apri|aprire|apr|crea|creare|nuovo|nuova)\b[\s\S]*\bterminal/i.test(t)){
    const m = t.match(/terminal[ei]?\b[\s,:.\-]*(.*)$/i);
    let task = (m && m[1]) ? m[1].trim() : '';
    task = task.replace(/^(e\s+|ed\s+|poi\s+|per\s+|che\s+|,\s*)+/i,'').trim();
    return { action:'open-terminal', task };
  }
  return null;
}

// errore di rete? (per il ripiego automatico in locale quando Claude non risponde)
function isNetErr(e){ const s=String((e&&e.message)||e||'').toLowerCase(); return /network|enotfound|econnrefused|econnreset|etimedout|timeout|fetch failed|getaddrinfo|socket|dns|offline|502|503|529|overloaded|unable to connect|connection/.test(s); }

// azioni che richiedono SEMPRE autorizzazione, anche in modalita' autonoma
function isDangerous(toolName, input){
  const t = String(toolName||'').toLowerCase();
  const c = (JSON.stringify(input||{}) + ' ' + ((input&&(input.command||input.cmd||input.script))||'')).toLowerCase();
  if(/\b(rm|rmdir|del|erase|rd)\b|remove-item|\bformat\b|mkfs|\bdd\b|drop\s+table|truncate\b/.test(c)) return true;                 // distruttive
  if(/\b(npm|pnpm|yarn|pip|pip3|winget|choco|scoop|apt|apt-get|brew)\b[^]*?\b(install|add|-g)\b/.test(c)) return true;              // installazioni
  if(/\bgit\s+push\b|\bnpm\s+publish\b|\bgh\s+repo\s+create\b/.test(c)) return true;                                               // pubblicazioni
  if(/\b(ssh|scp|sftp|curl|wget)\b|invoke-webrequest|\b(login|signin|sign-in)\b|gh\s+auth|az\s+login|gcloud\s+auth|aws\s+configure|password|token|api[_-]?key|credential|secret/.test(c)) return true; // autenticazioni/credenziali/rete
  if(/delete|destroy|deploy|publish|drop/.test(t)) return true;                                                                    // tool dal nome sensibile
  return false;
}

const wss = new WebSocketServer({ server });
wss.on('connection', ws=>{
  let sessionId = null;            // memoria di sessione per terminale (multi-turno)
  let firstTurn = true;            // primo scambio della sessione (per profilo abitudini + curiosita')
  let autoApprove = false;         // true = terminale autonomo (auto-approva i tool NON critici)
  let speaker = process.env.JARVIS_OWNER || 'Fra';   // interlocutore corrente (poi impostato dalla voce)
  let curAbort = null;             // AbortController del task in corso (interruzione/chiusura terminale)
  let localMode = false;           // true = tutto su Ollama (offline / al comando)
  const pending = new Map(); let pid = 0;   // permessi in attesa
  const sendJ = o=>{ try{ ws.send(JSON.stringify(o)); }catch(_){} };
  const dbg = s => sendJ({ type:'debug', text:String(s) });
  sendJ({type:'sys', text:'JARVIS connesso.'});
  dbg('modelli — Claude: a livelli (haiku/sonnet/opus) | Ollama worker:'+mem.MODELS.worker+' chat:'+mem.MODELS.chat+' local:'+mem.MODELS.local);
  ws.on('close', ()=>{ if(curAbort){ try{ curAbort.abort(); }catch(_){} } });   // chiusura terminale -> interrompi il task

  ws.on('message', async raw=>{
    let msg; try{ msg=JSON.parse(raw); }catch{ return; }

    // risposta a una richiesta di permesso dalla UI
    if(msg.type==='permission-response'){ const r=pending.get(msg.id); if(r){ pending.delete(msg.id); r(!!msg.allow); } return; }

    // ripristino: la UI chiede di riprendere una sessione salvata (refresh pagina)
    if(msg.type==='resume'){ if(msg.id) sessionId = msg.id; return; }

    // modalita' autorizzazioni del terminale: chiedi sempre (false) vs autonomo (true)
    if(msg.type==='mode'){ autoApprove = !!msg.auto; return; }

    // interlocutore corrente (chi sta parlando): impostato dalla UI o dal riconoscimento vocale
    if(msg.type==='speaker'){ if(msg.name) speaker = String(msg.name).slice(0,40); return; }

    // modalità locale globale (offline / al comando): instrada i terminali su Ollama
    if(msg.type==='localmode'){ localMode = !!msg.on; dbg('modalità locale '+(localMode?'ON':'OFF')); return; }

    // riavvia tutto da capo: Piper (via /quit) + il ponte (process.exit); i watchdog li rilanciano
    if(msg.type==='restart-all'){ dbg('RESTART-ALL: riavvio voce + TTS + ponte'); try{ fs.writeFileSync(path.join(__dirname,'..','control','restart-voice'),'1'); }catch(_){} try{ fetch('http://localhost:5002/quit').catch(()=>{}); }catch(_){} setTimeout(()=>process.exit(0), 500); return; }

    // interruzione del task in corso (pulsante stop o chiusura del terminale)
    if(msg.type==='abort'){ if(curAbort){ try{ curAbort.abort(); }catch(_){} dbg('task interrotto'); } return; }

    // chat veloce: Ollama diretto, niente Claude, niente memoria (solo canale comportamentale)
    if(msg.type==='chat'){ if(!msg.text) return;
      dbg('interpreto: '+String(msg.text).slice(0,50));
      let dec=null; try{ dec = await mem.interpret(msg.text); }catch(_){}
      if(dec && dec.azione==='apri_terminale'){
        const tier = ['haiku','sonnet','opus'].includes(dec.tier) ? dec.tier : 'sonnet';
        // compito = SOLO un eventuale lavoro vero; "apri un terminale" da solo => terminale VUOTO (niente prompt)
        let task = String(dec.compito||'').trim();
        task = task.replace(/^\s*(per favore|puoi|ok|ehi|hey|jarvis)[\s,]*/i,'')
                   .replace(/^\s*(apri(mi)?|aprire|crea(re)?|nuov[oa]|open|new)\s+(un'?|una|uno|a|the)?\s*(nuov[oa]\s+)?(terminale|terminal|finestra|window|shell|console)\s*/i,'')
                   .replace(/^\s*(e|poi|then|and|per)\s+/i,'').trim();
        dbg('-> apri terminale ['+tier+']'+(task?' '+task.slice(0,40):' (vuoto)'));
        sendJ({type:'ui', action:'open-terminal', prompt: task ? '!'+tier+' '+task : ''});
        sendJ({type:'chat-reply', text: task ? 'Apro un terminale e procedo, Signore.' : 'Apro un terminale, Signore.'});
        return;
      }
      if(dec && dec.azione==='chat' && dec.risposta){
        dbg('chat (router) « '+String(dec.risposta).slice(0,40));
        sendJ({type:'chat-reply', text:dec.risposta});
        mem.observe(msg.text, dec.risposta, speaker).catch(()=>{});
        return;
      }
      // fallback: regex comando, poi chat veloce col modello chat
      const uc = parseUiCommand(msg.text);
      if(uc){ dbg('comando UI (fallback): '+uc.action); sendJ({type:'ui', action:uc.action, prompt:uc.task||''}); sendJ({type:'chat-reply', text: uc.task ? 'Apro un terminale e procedo, Signore.' : 'Apro un terminale, Signore.'}); return; }
      dbg('chat ['+mem.MODELS.chat+'] » '+String(msg.text).slice(0,40)); mem.chat(msg.text, speaker).then(reply=>{ sendJ({type:'chat-reply', text:reply}); dbg('chat « '+String(reply).slice(0,40)); }).catch(e=>{ sendJ({type:'chat-reply', text:'(errore chat: '+e.message+')'}); }); return; }

    if(msg.type!=='prompt' || !msg.text) return;
    if(!query){ sendJ({type:'error',text:'SDK non disponibile (controlla il nome pacchetto).'}); return; }
    sendJ({type:'state', state:'active'});

    // callback permessi: la UI mostra tool+input e accetta/rifiuta
    const canUseTool = async (toolName, input)=>{
      // autonomo: auto-approva tutto TRANNE le azioni critiche (elimina/installa/pubblica/autentica)
      if(autoApprove && !isDangerous(toolName, input)){ sendJ({type:'auto', tool:toolName}); dbg('auto-approvato: '+toolName); return { behavior:'allow', updatedInput: input }; }
      const id = ++pid;
      sendJ({type:'permission', id, tool: toolName, input});
      dbg('permesso richiesto: '+toolName);
      sendJ({type:'state', state:'waiting'});
      const allow = await new Promise(res=>pending.set(id, res));
      sendJ({type:'state', state:'active'});
      return allow ? { behavior:'allow', updatedInput: input }
                   : { behavior:'deny', message:'Permesso negato dall\'utente.' };
    };

    const { model, prompt } = pickModel(msg.text);
    sendJ({type:'model', model});
    dbg('prompt ['+model+'] '+JSON.stringify(String(msg.text).slice(0,60)));
    let answer = '';
    const isFirst = firstTurn; firstTurn = false;
    const ac = new AbortController(); curAbort = ac;
    let augmented = prompt;
    try{
      // recall deterministico dal Vault: antepone le note pertinenti (locale, gratuito)
      try{ const hits = await mem.recall(prompt); dbg('recall: '+(hits?hits.length:0)+' note pertinenti');
        if(hits && hits.length){ augmented = "## Memoria pertinente dal Vault (recall automatico)\nInterlocutore attuale: "+speaker+"\n" + hits.map(h=>`- [${h.similarity.toFixed(2)}] (con ${h.speaker||'?'}) ${h.path}: ${h.snippet}`).join("\n") + "\n\nSe l'utente dice \"noi/abbiamo\" intende l'interlocutore attuale; attribuisci ogni ricordo alla persona giusta (es. \"ne ho parlato con Andrea\").\n\n---\n\n" + prompt; }
      }catch(_){}
      if(isFirst){ try{ const hc = mem.habitsContext(); if(hc) augmented = hc + "\n\n---\n\n" + augmented; }catch(_){} try{ const pc = mem.profileContext(speaker); if(pc) augmented = pc + "\n\n---\n\n" + augmented; }catch(_){} augmented = "Interlocutore attuale: "+speaker+".\n\n" + augmented; }
      if(localMode){
        dbg('modalità locale: Ollama ['+mem.MODELS.local+']');
        let reply; try{ reply = await mem.localChat(augmented, speaker); }catch(e){ reply = '(modello locale non raggiungibile: '+e.message+')'; }
        answer = reply; sendJ({type:'response', text:reply}); sendJ({type:'done'});
        mem.ingest(prompt, reply, speaker).then(r=>{ try{ fs.mkdirSync(path.join(__dirname,'..','logs'),{recursive:true}); fs.appendFileSync(path.join(__dirname,'..','logs','jarvis-mem.log'), `${new Date().toISOString()} ${JSON.stringify(r)}\n`); }catch(_){} }).catch(()=>{});
        mem.observe(prompt, reply, speaker).catch(()=>{});
        if(isFirst){ try{ mem.analyzeHabits(); const q=mem.nextCuriosity(); if(q) setTimeout(()=>sendJ({type:'response', text:q}), 700); }catch(_){} }
        sendJ({type:'state', state:'idle'});
        return;
      }
      const opts = { cwd: JARVIS_DIR, pathToClaudeCodeExecutable: CLAUDE_EXE, canUseTool, model, abortController: ac };
      if(sessionId) opts.resume = sessionId;            // continua la conversazione del terminale
      const it = query({ prompt: augmented, options: opts });
      for await (const m of it){
        if(!m) continue;
        if(m.session_id && m.session_id!==sessionId){ sessionId = m.session_id; sendJ({type:'session', id:sessionId}); }  // cattura/aggiorna l'id e lo passa alla UI per la persistenza
        dbg('« '+m.type+(m.subtype?'/'+m.subtype:''));
        if(m.type==='assistant'){
          const c = m.message?.content || m.content || [];
          try{ c.filter(b=>b&&b.type==='tool_use').forEach(b=>dbg('tool_use: '+(b.name||'?'))); }catch(_){}
          const text = Array.isArray(c) ? c.filter(b=>b&&b.type==='text').map(b=>b.text).join('') : (typeof c==='string'?c:'');
          if(text){ answer += text; sendJ({type:'response', text}); }
        } else if(m.type==='result'){
          const usd = typeof m.total_cost_usd==='number' ? m.total_cost_usd : null;
          if(usd!=null){
            const u = m.usage || {};
            const line = `${new Date().toISOString()}  [${model}]  $${usd.toFixed(4)}  in=${u.input_tokens||0} out=${u.output_tokens||0} cache_read=${u.cache_read_input_tokens||0} cache_make=${u.cache_creation_input_tokens||0}\n`;
            try{ fs.mkdirSync(path.join(__dirname,'..','logs'),{recursive:true}); fs.appendFileSync(path.join(__dirname,'..','logs','jarvis-cost.log'), line); }catch(_){}
            sendJ({type:'cost', usd, usage:u});
            dbg('costo $'+usd.toFixed(4)+' ['+model+'] in='+(u.input_tokens||0)+' out='+(u.output_tokens||0)+' cache_read='+(u.cache_read_input_tokens||0));
          }
          mem.ingest(prompt, answer, speaker).then(r=>{ try{ fs.mkdirSync(path.join(__dirname,'..','logs'),{recursive:true}); fs.appendFileSync(path.join(__dirname,'..','logs','jarvis-mem.log'), `${new Date().toISOString()} ${JSON.stringify(r)}\n`); }catch(_){} }).catch(()=>{});
          mem.observe(prompt, answer, speaker).catch(()=>{});  // canale comportamentale: ogni interazione
          sendJ({type:'done'});
          if(isFirst){ try{ mem.analyzeHabits(); const q = mem.nextCuriosity(); if(q) setTimeout(()=>sendJ({type:'response', text:q}), 700); }catch(_){} }
        }
      }
      sendJ({type:'state', state:'idle'});
    }catch(e){
      if(ac.signal.aborted){ dbg('task interrotto'); sendJ({type:'response', text:'(task interrotto)'}); }
      else if(isNetErr(e)){ dbg('Claude non raggiungibile -> ripiego locale: '+e.message); sendJ({type:'response', text:'(Claude non raggiungibile — rispondo in locale)'}); let reply; try{ reply = await mem.localChat(augmented, speaker); }catch(e2){ reply = '(anche il locale non risponde: '+e2.message+')'; } answer = reply; sendJ({type:'response', text:reply}); mem.ingest(prompt, reply, speaker).catch(()=>{}); mem.observe(prompt, reply, speaker).catch(()=>{}); }
      else { sendJ({type:'error', text:e.message}); }
      sendJ({type:'state',state:'idle'});
    }
    finally{ if(curAbort===ac) curAbort=null; }
  });
});

// --- canale di controllo: comandi di sistema lasciati come file in _scripts/control/ ---
// JARVIS (o un terminale) scrive {"cmd":"restart"} in _scripts/control/<qualsiasi>.json.
const CONTROL_DIR = path.join(__dirname, '..', 'control');
try{ fs.mkdirSync(CONTROL_DIR, { recursive:true }); }catch(_){}
setInterval(()=>{
  let files=[]; try{ files = fs.readdirSync(CONTROL_DIR).filter(f=>f.endsWith('.json')); }catch{ return; }
  for(const f of files){
    const fp = path.join(CONTROL_DIR, f); let obj=null;
    try{ obj = JSON.parse(fs.readFileSync(fp,'utf8')); }catch{}
    try{ fs.unlinkSync(fp); }catch{}
    if(!obj) continue;
    const cmd = String(obj.cmd||'').toLowerCase();
    if(cmd==='restart'){ console.log('[control] restart -> esco, il watchdog mi rilancia'); setTimeout(()=>process.exit(0), 200); }
    else if(cmd==='restart-all'){ console.log('[control] restart-all -> voce + TTS + ponte'); try{ fs.writeFileSync(path.join(CONTROL_DIR,'restart-voice'),'1'); }catch(_){} try{ fetch('http://localhost:5002/quit').catch(()=>{}); }catch(_){} setTimeout(()=>process.exit(0), 500); }
    else console.log('[control] comando non riconosciuto:', cmd);
  }
}, 1500);

server.listen(PORT, ()=>console.log('JARVIS bridge: http://localhost:'+PORT+'  (ws stesso porto)'));
