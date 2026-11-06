// Exports every actor template, not just residents currently on screen.
// Run `node scripts/export-sprite-cast.mjs` before regenerating the sprite sheets.
import fs from 'node:fs';
import { LEVELS } from '../src/rooms.js';

const cast = [];
for (const level of Object.values(LEVELS)) {
  const entries = [...(level.initialActors ?? []), ...(level.randomAnimals ?? []), ...(level.guestVisits ?? []).flatMap(visit=>visit.members ?? [])];
  const seen = new Set();
  for (const actor of entries) {
    if (seen.has(actor.id)) throw new Error(`Duplicate actor template ID ${level.id}/${actor.id}`);
    seen.add(actor.id);
    cast.push({level:level.id, id:actor.id, name:actor.name, role:actor.role, kind:actor.kind,
      color:actor.color ?? '#74bfe9'});
  }
}
const dest = new URL('../public/assets/sprites/cast.json', import.meta.url);
fs.writeFileSync(dest, `${JSON.stringify(cast,null,2)}\n`);
console.log(`Exported ${cast.length} character templates for ${Object.keys(LEVELS).length} levels`);
