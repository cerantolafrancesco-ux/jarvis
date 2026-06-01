#!/usr/bin/env node
/*
 * telegram-drop.js — lascia un messaggio nella outbox (NON invia, ci pensa il watcher).
 * Uso: node telegram-drop.js "<source>" "<testo HTML>"
 * Scrive in modo atomico (.tmp -> .json) così il watcher non legge file a metà.
 */
const fs = require('fs');
const path = require('path');

const OUTBOX = path.join(__dirname, 'outbox');
fs.mkdirSync(OUTBOX, { recursive: true });

const source = process.argv[2] || 'JARVIS';
const text = process.argv.slice(3).join(' ').trim();
if (!text) { console.error('Uso: node telegram-drop.js "<source>" "<testo>"'); process.exit(1); }

const ts = new Date().toISOString().replace(/[:.]/g, '-');
const base = `${ts}-${Math.random().toString(36).slice(2, 7)}`;
const tmp = path.join(OUTBOX, base + '.tmp');
const fin = path.join(OUTBOX, base + '.json');
fs.writeFileSync(tmp, JSON.stringify({ text, source, ts }), 'utf8');
fs.renameSync(tmp, fin);
console.log('drop ok:', fin);
