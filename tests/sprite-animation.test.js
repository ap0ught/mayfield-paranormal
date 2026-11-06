import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LEVELS } from '../src/rooms.js';
import { actorPose, snapshotFramePosition, spriteTemplateId, spriteUrl, SPRITE_FRAME_COUNT, SPRITE_FRAME_HEIGHT, SPRITE_FRAME_WIDTH } from '../src/sprite-animation.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cast = JSON.parse(fs.readFileSync(path.join(root,'public/assets/sprites/cast.json'),'utf8'));
const source = fs.readFileSync(path.join(root,'src/App.jsx'),'utf8');
const css = fs.readFileSync(path.join(root,'src/styles.css'),'utf8');

function spriteDimensions(buffer) {
  assert.equal(buffer.toString('hex',0,8),'89504e470d0a1a0a');
  return {width: buffer.readUInt32BE(16),height:buffer.readUInt32BE(20),colorType:buffer.readUInt8(25)};
}

test('every House, Park, Bank, and Hotel actor template gets its own six-frame transparent PNG',()=>{
  assert.equal(SPRITE_FRAME_COUNT,6);
  assert.equal(cast.length,51);
  for (const level of Object.values(LEVELS)) {
    const templates=[...(level.initialActors??[]), ...(level.randomAnimals??[]),...(level.guestVisits??[]).flatMap(visit=>visit.members??[])];
    for (const actor of templates) {
      const url = spriteUrl(level.id,actor);
      assert.equal(url,`/assets/sprites/${level.id}/${actor.id}.png`);
      const png=fs.readFileSync(path.join(root,'public',url));
      assert.deepEqual(spriteDimensions(png),{width:SPRITE_FRAME_COUNT*SPRITE_FRAME_WIDTH,height:SPRITE_FRAME_HEIGHT,colorType:6},url);
    }
  }
});

test('guest instances use their template identity; summoned ghosts fall back to a valid level spirit',()=>{
  const visitor={...LEVELS.park.guestVisits[0].members[0],id:'quick-photog@repeat-125',templateId:'quick-photog'};
  assert.equal(spriteTemplateId('park',visitor),'quick-photog');
  assert.ok(fs.existsSync(path.join(root,'public',spriteUrl('park',{id:'new-wandering-ghost@1',kind:'ghost',role:'apparition'}))));
  assert.equal(spriteUrl('park',{id:'unlisted-person',kind:'human'}),null);
});

test('idle, walking, and action states choose the correct sheet frames',()=>{
  assert.equal(actorPose({kind:'human',role:'coach'}),'walk');
  assert.equal(actorPose({kind:'human',activityState:'en_route',role:'coach'}),'walk');
  assert.equal(actorPose({kind:'human',activityState:'working',currentActivity:'watching children'}),'idle');
  assert.equal(actorPose({kind:'human',activityState:'working',currentActivity:'photographing soccer match'}),'interact');
  assert.equal(actorPose({kind:'ghost',activityState:'working'}),'float');
  assert.equal(snapshotFramePosition('idle',3),'0%');
  assert.equal(snapshotFramePosition('interact',3),'100%');
  assert.deepEqual([0,1,2,3,4].map(n=>snapshotFramePosition('walk',n)),['20%','40%','60%','80%','20%']);
});

test('Detail 3 runs the animated loop; Detail 2 changes frames only on scheduled snapshots',()=>{
  assert.match(source, /setSnapshotFrame\(f=>\(f\+1\)%4\)/);
  assert.match(source, /<PersonSprite key=\{person\.id\}/);
  assert.match(source, /actorPose\(person\)/);
  assert.match(source, /snapshotFrame=\{snapshotFrame\}/);
  assert.match(css,/actor-sprite\.actor-walking:not\(\.person-small\)/);
  assert.match(css,/\.scene-small \.ghost-actor \.actor-pixels\{animation:none\}/);
  assert.match(css,/\.simulation-paused \.actor-pixels\{animation-play-state:paused/);
  assert.match(css,/image-rendering:pixelated/);
});
