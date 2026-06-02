#!/usr/bin/env node
/*
 * vault-embed.mjs — recall ISTANTANEO: indicizza subito una nota nell'indice "caldo".
 * Da chiamare appena JARVIS scrive/aggiorna una nota nel Vault, così la nota è
 * recuperabile all'istante anche se Smart Connections (in Obsidian) non ha ancora
 * re-indicizzato il .smart-env.
 *
 * Uso:  node vault-embed.mjs "<percorso-nota>"   (assoluto o relativo al Vault)
 *       node vault-embed.mjs --prune             (rimuove le voci di file ormai inesistenti)
 */
import fs from "node:fs";
import { VAULT, embedText, relPath, absPath, loadHot, saveHot } from "./embedder.mjs";

const arg = process.argv[2];
if (!arg) { console.error('Uso: node vault-embed.mjs "<percorso-nota>" | --prune'); process.exit(1); }

(async () => {
  let entries = loadHot();

  if (arg === "--prune") {
    const before = entries.length;
    entries = entries.filter(e => fs.existsSync(absPath(e.path)));
    saveHot(entries);
    console.log(`Prune: ${before - entries.length} voci rimosse, ${entries.length} restano.`);
    return;
  }

  const abs = absPath(arg);
  if (!fs.existsSync(abs)) { console.error("File non trovato:", abs); process.exit(1); }
  const rel = relPath(arg);
  const content = fs.readFileSync(abs, "utf8");
  // prepende il percorso (titolo) per dargli peso, poi il corpo
  const vector = await embedText(rel.replace(/\.md$/, "") + "\n" + content);
  const mtime = fs.statSync(abs).mtimeMs;

  entries = entries.filter(e => e.path !== rel); // upsert: una sola voce per nota
  entries.push({ path: rel, mtime, vector });
  saveHot(entries);
  console.log(`Indicizzata nell'indice caldo: ${rel}  (totale ${entries.length}).`);
})().catch(e => { console.error("Errore:", e.message); process.exit(1); });
