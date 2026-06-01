#!/usr/bin/env node
/*
 * telegram-watcher.js — sorveglia la cartella outbox e invia i messaggi a Telegram.
 * Va eseguito SU WINDOWS (via PM2): da lì Telegram è raggiungibile.
 * Produttori (Cowork, chat, task schedulati) lasciano file .json in outbox/ con:
 *   { "text": "<messaggio HTML>", "source": "<chi lo invia>" }
 * Il watcher invia e sposta il file in outbox/sent/.
 */
const fs = require('fs');
const path = require('path');

const DIR = __dirname;
const OUTBOX = path.join(DIR, 'outbox');
const SENT = path.join(OUTBOX, 'sent');
fs.mkdirSync(SENT, { recursive: true });

function loadEnv(file) {
  const out = {};
  try {
    for (const l of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
      const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch (_) {}
  return out;
}
const env = loadEnv(path.join(DIR, '.env'));
const TOKEN = process.env.TELEGRAM_BOT_TOKEN || env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID || env.TELEGRAM_CHAT_ID;
if (!TOKEN || !CHAT_ID) { console.error('Manca TELEGRAM_BOT_TOKEN/CHAT_ID nel .env'); process.exit(1); }

async function send(text) {
  const res = await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: CHAT_ID, text, parse_mode: 'HTML', disable_web_page_preview: true })
  });
  const d = await res.json();
  if (!d.ok) throw new Error(d.description || ('HTTP ' + res.status));
  return d.result.message_id;
}

function buildMessage(raw) {
  const j = JSON.parse(raw);
  const src = j.source ? `\n— 🧩 <i>${j.source}</i>` : '';
  return (j.text || '').toString() + src;
}

async function handleFile(file) {
  if (!file.toLowerCase().endsWith('.json')) return;
  const full = path.join(OUTBOX, file);
  if (!fs.existsSync(full)) return;
  let msg;
  try { msg = buildMessage(fs.readFileSync(full, 'utf8')); }
  catch (_) {
    await new Promise(r => setTimeout(r, 700)); // file forse non ancora completo
    try { msg = buildMessage(fs.readFileSync(full, 'utf8')); }
    catch (_) { console.error('JSON non valido, salto:', file); return; }
  }
  if (!msg.trim()) { try { fs.renameSync(full, path.join(SENT, file)); } catch (_) {} return; }
  try {
    const id = await send(msg);
    fs.renameSync(full, path.join(SENT, file));
    console.log(new Date().toISOString(), 'inviato', file, 'message_id', id);
  } catch (e) {
    console.error('invio fallito per', file, '->', e.message, '(riprovo al prossimo scan)');
  }
}

function scanAll() {
  let files = [];
  try { files = fs.readdirSync(OUTBOX).filter(f => f.toLowerCase().endsWith('.json')); } catch (_) {}
  files.forEach(handleFile);
}

console.log('telegram-watcher avviato. Sorveglio:', OUTBOX);
scanAll();
try { fs.watch(OUTBOX, (_ev, f) => { if (f) setTimeout(() => handleFile(f), 400); }); } catch (_) {}
setInterval(scanAll, 30000); // rete di sicurezza: rescan periodico
