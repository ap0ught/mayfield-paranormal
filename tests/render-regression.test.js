import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
import {LEVELS} from '../src/rooms.js';

const root=resolve(dirname(fileURLToPath(import.meta.url)), '..');

test('map icon alias must not shadow the built-in Map constructor used by actor tracking', () => {
  const app=readFileSync(resolve(root, 'src/App.jsx'), 'utf8');
  assert.match(app, /Map as MapIcon/);
  assert.match(app, /new Map\(/);
  assert.doesNotMatch(app, /new MapIcon\(/);
});

test('park map structure matches mockup: six active zones plus outside, parking and entry', () => {
  const map=LEVELS.park.mapCells;
  assert.equal(map.length, 9);
  assert.equal(map.filter(id=>typeof id==='string').length,6);
  assert.equal(map.filter(id=>typeof id==='object').length,3);
  assert.equal(LEVELS.park.defaultCameras.length,4);
  assert.equal(LEVELS.park.defaultSelected,'S1');
});
