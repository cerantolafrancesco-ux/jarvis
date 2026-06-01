#!/usr/bin/env node
/*
 * telegram-send.js — primitiva di invio messaggi Telegram per JARVIS
 * Uso:
 *   node telegram-send.js "messaggio"
 *   echo "messaggio" | node telegram-send.js
 * Legge TELEGRAM_BOT_TOKEN e TELEGRAM_CHAT_ID dal file .env nella stessa cartella
 * (oppure dalle variabili d'ambiente, che hanno priorità).
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

if (!TOKEN || !CHAT_ID) {
  console.error('Errore: TELEGRAM_BOT_TOKEN o TELEGRAM_CHAT_ID mancanti (.env).');
  process.exit(1);
}

async function main() {
  let msg = process.argv.slice(2).join(' ').trim();
  if (!msg && !process.stdin.isTTY) {
    try { msg = fs.readFileSync(0, 'utf8').trim(); } catch (_) {}
  }
  if (!msg) { console.error('Errore: nessun messaggio fornito.'); process.exit(1); }

  const res = await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: CHAT_ID, text: msg, parse_mode: 'HTML', disable_web_page_preview: true })
  });
  const data = await res.json();
  if (!data.ok) {
    console.error('Errore Telegram:', data.description || ('HTTP ' + res.status));
    process.exit(1);
  }
  console.log('OK — inviato (message_id ' + data.result.message_id + ')');
}

main().catch(e => { console.error('Errore:', e.message); process.exit(1); });
