// scripts/copy-mathlive-fonts.mjs
// Copie les polices de mathlive → public/mathlive/fonts (évite les 404 en prod)

import { promises as fsp } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const src = path.resolve(__dirname, "../node_modules/mathlive/dist/fonts");
  const dest = path.resolve(__dirname, "../public/mathlive/fonts");

  // Vérifie que la source existe (mathlive installé)
  try {
    await fsp.access(src);
  } catch {
    console.log("[mathlive] dossier source introuvable :", src);
    return;
  }

  await fsp.mkdir(dest, { recursive: true });

  const entries = await fsp.readdir(src, { withFileTypes: true });
  let copied = 0;
  for (const e of entries) {
    if (!e.isFile()) continue;
    await fsp.copyFile(path.join(src, e.name), path.join(dest, e.name));
    copied++;
  }
  console.log(`[mathlive] ${copied} fichiers copiés vers ${dest}`);
}

main().catch((err) => {
  console.error("[mathlive] échec copie des fontes :", err);
  // ne bloque pas l'installation
  process.exit(0);
});
