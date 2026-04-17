/**
 * Regenerates `src/components/icons/listRowIconsSvgXml.ts` from `assets/icons/list/*.svg`.
 * Run from repo root: node apps/mobile/scripts/embed-list-row-icons-svg.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.join(__dirname, "..");
const assetsDir = path.join(mobileRoot, "assets/icons/list");
const files = {
  ICON_VENUE_SVG_XML: "icon-venue.svg",
  ICON_GAME_TYPE_MAGIC_SVG_XML: "icon-game-type-magic.svg",
  ICON_GAME_TYPE_MAGIC_OVERDUE_SVG_XML: "icon-game-type-magic-overdue.svg",
  ICON_GAME_TYPE_DICE_SVG_XML: "icon-game-type-dice.svg",
  ICON_GAME_TYPE_DICE_OVERDUE_SVG_XML: "icon-game-type-dice-overdue.svg",
};

function clean(raw) {
  return raw
    .replace(/<\?xml[\s\S]*?\?>/g, "")
    .replace(/<!DOCTYPE[\s\S]*?>/g, "")
    .replace(/\s+xmlns:vectornator="[^"]*"/g, "")
    .replace(/\s+xmlns:vectornator='[^']*'/g, "")
    .replace(/\r\n/g, "\n")
    .trim();
}

let ts = `/** Auto-generated from assets/icons/list — run: node apps/mobile/scripts/embed-list-row-icons-svg.mjs */\n`;

for (const [name, file] of Object.entries(files)) {
  const full = path.join(assetsDir, file);
  const raw = fs.readFileSync(full, "utf8");
  const xml = clean(raw).replace(/`/g, "\\`");
  ts += `export const ${name} = \`${xml}\`;\n`;
}

fs.writeFileSync(path.join(mobileRoot, "src/components/icons/listRowIconsSvgXml.ts"), ts);
console.log("Wrote listRowIconsSvgXml.ts");
