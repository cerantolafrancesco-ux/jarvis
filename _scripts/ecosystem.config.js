// ecosystem.config.js — configurazione PM2 unica per i servizi JARVIS (Windows)
// Avvio: pm2 start ecosystem.config.js   |   poi: pm2 save
// Risolve: entry JS corretto (non .CMD), Node 22 pinnato, niente finestre dei task runner.
const NODE22 = "C:\\Users\\ceran\\AppData\\Local\\nvm\\v22.22.3\\node.exe";

module.exports = {
  apps: [
    {
      name: "jarvis-telegram",
      script: "C:\\Users\\ceran\\Documents\\Claude\\Projects\\JARVIS\\_scripts\\telegram-watcher.js",
      interpreter: NODE22,
      windowsHide: true,
      autorestart: true,
      max_restarts: 20
    },
    {
      name: "n8n",
      // Entry JS reale di n8n (NON il wrapper .CMD, che Node interpreta male)
      script: "C:\\Users\\ceran\\AppData\\Local\\nvm\\v22.22.3\\node_modules\\n8n\\bin\\n8n",
      args: "start",
      interpreter: NODE22,
      windowsHide: true,
      autorestart: true,
      max_restarts: 10,
      env: {
        // Disabilita i Task Runner: niente processi figli Node -> niente finestre console.
        // (Nessun workflow ancora presente, quindi nessun impatto.)
        N8N_RUNNERS_ENABLED: "false"
      }
    }
  ]
};
