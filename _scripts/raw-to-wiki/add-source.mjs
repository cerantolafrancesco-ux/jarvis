// add-source.mjs <file> [interlocutore] [origine...] — copia un documento in RAW_SOURCE con attribuzione.
// Scrive un sidecar <file>.meta.json {interlocutore, origine} letto poi dall'organizzatore.
// Usalo quando JARVIS riceve/cerca/scarica un documento: registra CHI lo ha generato.
import fs from "node:fs";
import path from "node:path";
import { VAULT } from "../smart-connections-mcp/embedder.mjs";

const [,, src, who, ...orig] = process.argv;
if(!src){ console.error("uso: add-source.mjs <file> [interlocutore] [origine]"); process.exit(2); }
if(!fs.existsSync(src)){ console.error("file inesistente:", src); process.exit(1); }

const RAW = path.join(VAULT, "RAW_SOURCE");
fs.mkdirSync(RAW, { recursive:true });
const base = path.basename(src);
let dest = path.join(RAW, base);
if(fs.existsSync(dest)) dest = path.join(RAW, Date.now() + "_" + base);
fs.copyFileSync(src, dest);
fs.writeFileSync(dest + ".meta.json", JSON.stringify({ interlocutore: who || "Fra", origine: orig.join(" ") || "", added: new Date().toISOString() }, null, 2));
console.log("aggiunto a RAW_SOURCE:", path.basename(dest), "(interlocutore:", who || "Fra", ")");
