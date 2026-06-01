#!/usr/bin/env node
/*
 * telegram-hook.js — wrapper per gli hook di Claude Code (notifiche 3 e 4 JARVIS)
 * Riceve su stdin il JSON dell'evento hook, compone un messaggio e lo invia a Telegram.
 * Eventi gestiti:
 *   - Notification → "serve il tuo intervento"
 *   - Stop         → "task finito, in attesa di input"
 * Legge token/chat_id dal .env nella stessa cartella.
 */
const fs = require('fs');
const path = require('path');

function loadEnv(file) {
  const out = {};
  try {
    for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch (_) {}
  return out;
}

const env = loadEnv(path.join(__dirname, '.env'));
const TOKEN = process.env.TELEGRAM_BOT_TOKEN || env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID || env.TELEGRAM_CHAT_ID;

function readStdin() {
  try { return fs.readFileSync(0, 'utf8'); } catch (_) { return ''; }
}

function appSource(ev) {
  // Prova a capire quale app ha generato l'evento; fallback "Claude Code".
  const e = process.env;
  const raw = (e.CLAUDE_APP || e.CLAUDE_CLIENT || e.CLAUDE_SURFACE || '').toLowerCase();
  let app = 'Claude Code';
  if (raw.includes('cowork')) app = 'Cowork';
  else if (raw.includes('claudian')) app = 'Claudian';
  else if (raw.includes('code')) app = 'Claude Code';
  const project = ev.cwd ? path.basename(String(ev.cwd)) : '';
  return project ? `${app} · ${project}` : app;
}

function compose(ev) {
  const name = ev.hook_event_name || 'Unknown';
  const cwd = ev.cwd ? `\n📁 <code>${ev.cwd}</code>` : '';
  const note = ev.message ? `\n${String(ev.message).slice(0, 300)}` : '';
  const footer = `\n— 🧩 <i>${appSource(ev)}</i>`;
  if (name === 'Notification') {
    return `🔔 <b>JARVIS richiede il tuo intervento, Signore.</b>${note}${cwd}${footer}`;
  }
  if (name === 'Stop' || name === 'SubagentStop') {
    return `✅ <b>JARVIS: task completato.</b> In attesa di un tuo input.${cwd}${footer}`;
  }
  return `ℹ️ <b>JARVIS</b> — evento ${name}${note}${cwd}${footer}`;
}

async function main() {
  if (!TOKEN || !CHAT_ID) process.exit(0); // niente segreti: esci silenzioso, non bloccare Claude
  let ev = {};
  try { ev = JSON.parse(readStdin() || '{}'); } catch (_) {}
  const text = compose(ev);
  try {
    await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: CHAT_ID, text, parse_mode: 'HTML', disable_web_page_preview: true })
    });
  } catch (_) {}
  process.exit(0); // mai bloccare l'agente, qualunque sia l'esito
}
main();
