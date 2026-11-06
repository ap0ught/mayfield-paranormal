import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {LEVELS} from '../src/rooms.js';
import {FARM_LEVEL_EXAMPLE} from '../examples/farm-level.example.js';
import {validateLevel,initializeLevel,applyObjectiveEvent,evaluateLevel,advanceDay,spendFocus,isGuest,isResident,moveActors} from '../src/level-engine.js';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');

function checkDimensions(level,rows,cols,cameraRows=2,cameraCols=2) {
  assert.equal(level.mapRows??3,rows);
  assert.equal(level.mapColumns??3,cols);
  assert.equal(level.mapCells.length,rows*cols);
  assert.equal(level.defaultCameras.length,cameraRows*cameraCols);
  assert.deepEqual(validateLevel(level),[]);
}

test('Hotel: original six-floor concept uses 6×6 cells, 27 zones, 6 camera feeds',()=>{
  const hotel=LEVELS.hotel;
  checkDimensions(hotel,6,6,2,3);
  assert.equal(hotel.rooms.length,27);
  assert.equal(new Set(hotel.mapCells).size,27);
  assert.equal(hotel.mapCells.length,36);
  assert.deepEqual(hotel.mapCells.slice(0,6),['H601','H602','H603','H603','H605','H606']);
  assert.deepEqual(hotel.mapCells.slice(-6),['H1DINING','H1DINING','H1LOBBY','H1LOBBY','H1BALL','H1BALL']);
  for (const place of ['Presidential Suite','Royal Suite','Family Suite','Garden Suite','Laundry','Pool','Ballroom','Spa','Concierge','Restaurant']) {
    assert.ok(hotel.rooms.some(r=>r.name.includes(place)),`Hotel missing ${place}`);
  }
  assert.equal(hotel.objectives.length,5);
});

test('Hotel: the two-cell presidential suite is one independent simulation zone',()=>{
  const hotel=LEVELS.hotel;
  const suite=hotel.roomById.H603;
  assert.equal(suite.spanCells,2);
  assert.equal(hotel.mapCells.filter(id=>id==='H603').length,2);
  assert.equal(hotel.rooms.filter(room=>room.id==='H603').length,1);
  const world=initializeLevel(hotel);
  assert.equal(world.lights.H603,true);
  assert.equal(world.cameras.filter(id=>id==='H603').length,1);
  assert.ok(existsSync(resolve(root,'public/assets/hotel_h603.webp')));
  assert.ok(existsSync(resolve(root,'source-art/hotel-cutaway.png')));
});

test('Hotel: resident staff never naturally leave; visiting hotel guests exit',()=>{
  const hotel=LEVELS.hotel;
  const world=initializeLevel(hotel);
  assert.ok(world.actors.every(isResident));
  assert.ok(world.actors.some(actor=>actor.role==='security guard'));
  assert.ok(world.guestVisits.flatMap(v=>v.members).every(isGuest));
  let actors=world.guestVisits[0].members.map(member=>({...member,waypoint:0,templateId:member.id}));
  for(let n=0;n<350;n++) actors=moveActors(actors);
  assert.equal(actors.length,0);
});

test('Bank: sixteen unique 4×4 rooms retain incident and visitor systems',()=>{
  const bank=LEVELS.bank;
  checkDimensions(bank,4,4);
  assert.equal(bank.rooms.length,16);
  assert.equal(new Set(bank.mapCells).size,16);
  for(const id of ['T2','CL','CS','CR','WS','BR','AR']) assert.ok(bank.roomById[id]);
  const world=initializeLevel(bank);
  assert.ok(world.actors.filter(a=>a.role.includes('bank employee')).length>=4);
  assert.ok(world.guestVisits.some(v=>v.members.some(a=>a.role==='thief')));
  assert.equal(world.lostItems.length,2);
});

test('Farm: a separate 3×3 field, not farm buildings occupying field cells',()=>{
  const farm=FARM_LEVEL_EXAMPLE;
  checkDimensions(farm,3,3);
  assert.equal(farm.rooms.length,9);
  assert.deepEqual(farm.mapCells,[
    'F11','F12','F13','F21','F22','F23','F31','F32','F33',
  ]);
  assert.ok(farm.rooms.every(room=>room.name.startsWith('Field Sector')));
  assert.ok(farm.rooms.every(room=>room.floor==='FIELD'));
  assert.ok(farm.mapTip.includes('farmhouse or barn'));
  for(const asset of [farm.mapBackground,...farm.rooms.map(room=>room.image)]) {
    assert.ok(existsSync(resolve(root,'public/assets',`${asset}.webp`)),asset);
  }
});

test('Farm example: guest visit, resident continuity and randomized rabbit statuses',()=>{
  const farm=FARM_LEVEL_EXAMPLE;
  const residentWorld=initializeLevel(farm,()=>0);
  const guestWorld=initializeLevel(farm,()=>.99);
  assert.equal(residentWorld.animalRolls[0].stay,'resident');
  assert.equal(guestWorld.animalRolls[0].stay,'guest');
  assert.ok(residentWorld.actors.some(a=>a.role==='rabbit'));
  assert.ok(!guestWorld.actors.some(a=>a.role==='rabbit'));
  assert.ok(guestWorld.guestVisits.some(v=>v.members.some(a=>a.role==='rabbit')));
  assert.ok(farm.initialActors.some(a=>a.kind==='ghost'));
});

test('Hotel and Bank: all five real mission events win; day and focus expiry lose',()=>{
  for(const level of [LEVELS.hotel,LEVELS.bank,FARM_LEVEL_EXAMPLE]) {
    const world=initializeLevel(level);
    let completed=[];
    for(const obj of level.objectives) {
      completed=applyObjectiveEvent(level,completed,{type:obj.eventType,room:obj.room ?? level.defaultSelected});
    }
    assert.equal(completed.length,5);
    assert.equal(evaluateLevel(level,completed,world.focus,world.dayRemaining).state,'won');
    assert.deepEqual(evaluateLevel(level,[],world.focus,advanceDay(world.dayRemaining,level.dayDurationSeconds)),{state:'lost',reason:'day'});
    let focus=world.focus;
    for(let i=0;i<world.focus.length;i++)focus=spendFocus(focus);
    assert.deepEqual(evaluateLevel(level,[],focus,world.dayRemaining),{state:'lost',reason:'focus'});
  }
});

test('Map renderer and camera renderer use each level’s dimensions, not hard-coded 3×3/2×2',()=>{
  const app=readFileSync(resolve(root,'src/App.jsx'),'utf8');
  assert.match(app,/level\.mapColumns/);
  assert.match(app,/level\.mapRows/);
  assert.match(app,/level\.cameraColumns/);
  assert.match(app,/level\.cameraRows/);
  assert.match(app,/key=\{`\$\{r\.id\}-\$\{index\}`\}/);
});

test('Validator rejects bad custom layout and wrong declared suite span',()=>{
  const h=LEVELS.hotel;
  assert.ok(validateLevel({...h,mapRows:5}).some(e=>e.includes('Expected 5×6')));
  const invalidRoom={...h.roomById.H603,spanCells:1};
  const invalid={...h,rooms:h.rooms.map(r=>r.id==='H603'?invalidRoom:r),roomById:{...h.roomById,H603:invalidRoom}};
  assert.ok(validateLevel(invalid).some(e=>e.includes('expected 1 map cells')));
  assert.ok(validateLevel({...h,defaultCameras:h.defaultCameras.slice(0,4)}).some(e=>e.includes('Expected 6 Detail 2')));
});
