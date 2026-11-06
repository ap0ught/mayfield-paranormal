#!/usr/bin/env node
// npm run validate:levels — pure runtime-independent level validation + artwork.
import {existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {LEVELS} from '../src/rooms.js';
import {FARM_LEVEL_EXAMPLE} from '../examples/farm-level.example.js';
import {validateLevel} from '../src/level-engine.js';

let failures=0;
for(const level of [...Object.values(LEVELS),FARM_LEVEL_EXAMPLE]) {
  const errors=validateLevel(level);
  const files=new Set([level.mapBackground,...level.rooms.map(room=>room.image)]);
  for (const name of files) {
    if (!existsSync(resolve('public/assets',`${name}.webp`))) errors.push(`missing artwork public/assets/${name}.webp`);
  }
  if (errors.length) {
    failures++;
    console.error(`✗ ${level.title}:\n  ${errors.join('\n  ')}`);
  } else console.log(`✓ ${level.title} — ${level.mapRows??3}×${level.mapColumns??3} map (${level.mapCells.length} cells, ${level.rooms.length} zones), ${(level.cameraRows??2)*(level.cameraColumns??2)} cameras, 5 objectives`);
}
if (failures) process.exitCode=1;
else console.log('All registered and example levels validated with artwork.');
