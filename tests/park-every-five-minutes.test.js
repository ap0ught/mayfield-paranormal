import test from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS } from '../src/rooms.js';
import { initializeLevel } from '../src/level-engine.js';
import {
  createScheduledWorld, advanceScheduledWorld, compareScheduledPositions,
  findRoomPath, formatParkTime, scheduledBlock
} from '../src/role-scheduler.js';

const park=LEVELS.park;
const outcomes=[
  ['resident','resident'],
  ['resident','guest'],
  ['guest','resident'],
  ['guest','guest'],
];

for(const [cat,squirrel] of outcomes) {
  const label=`cat=${cat}, squirrel=${squirrel}`;
  test(`Park: each actor in correct zone every 5 game minutes (${label})`,()=>{
    // RNG outcomes are independent and reproduce the real level-load roll.
    const draws=[cat==='resident'?0.2:0.9,squirrel==='resident'?0.2:0.9];
    let index=0;
    const initialWorld=initializeLevel(park,()=>draws[index++]);
    assert.equal(index,2,'each animal rolls exactly once');
    assert.deepEqual(initialWorld.animalRolls.map(a=>a.stay),[cat,squirrel]);
    let world=createScheduledWorld(park,park.roleSchedules,initialWorld.animalRolls);
    const previousPositions=new Map(world.actors.map(actor=>[actor.id,actor.room]));
    const samples=[];
    for(let gameSecond=0;gameSecond<=park.dayDurationSeconds;gameSecond++) {
      world=advanceScheduledWorld(world,park,gameSecond);
      // Runtime moves only between graph-linked rooms, without teleportation.
      for(const actor of world.actors) {
        const before=previousPositions.get(actor.id);
        if(before) {
          assert.ok(before===actor.room || park.roomById[before].links.includes(actor.room),
            `${formatParkTime(gameSecond)}: ${actor.name} illegally teleported ${before} -> ${actor.room}`);
        }
      }
      previousPositions.clear();
      for(const actor of world.actors) previousPositions.set(actor.id,actor.room);
      // 300 simulated seconds represent a 5-hour day: every 5 seconds
      // is a five-minute timetable checkpoint (including the 9:00 PM close).
      if(gameSecond%5===0) {
        const issues=compareScheduledPositions(park,world,gameSecond);
        assert.deepEqual(issues,[],`${label}: ${formatParkTime(gameSecond)}\n${issues.join('\n')}`);
        samples.push(gameSecond);
        const visitingFamily=world.actors.filter(actor=>actor.groupId==='family-playdate');
        assert.ok(visitingFamily.length===0||visitingFamily.length===4,`${formatParkTime(gameSecond)}: incomplete visiting family`);
        if(visitingFamily.length) assert.equal(new Set(visitingFamily.map(a=>a.room)).size,1,`${formatParkTime(gameSecond)}: family separated`);
      }
    }
    assert.equal(samples.length,61,'must verify all 61 timestamps from 4:00 PM through 9:00 PM');
    assert.equal(world.actors.filter(actor=>actor.stay==='guest').length,0,'all guests must have left by close');
    assert.equal(world.actors.filter(actor=>actor.stay==='resident').length,7+Number(cat==='resident')+Number(squirrel==='resident'));
    assert.equal(world.elapsedGameSeconds,300);
  });
}

test('Park schedule audit rejects incorrect actor location instead of automatically passing',()=>{
  const world=createScheduledWorld(park,park.roleSchedules,[
    {id:'park-cat',stay:'resident'}, {id:'park-squirrel',stay:'guest'}
  ]);
  const atFive=advanceScheduledWorld(world,park,5);
  const tampered={...atFive,actors:atFive.actors.map(actor=>actor.templateId==='coach'?{...actor,room:'T1'}:actor)};
  assert.deepEqual(compareScheduledPositions(park,atFive,5),[]);
  assert.match(compareScheduledPositions(park,tampered,5).join('\n'),/coach\/resident expected S1 .* found T1/);
});

test('Park pathfinding uses intermediate rooms for jobs, never map filler zones',()=>{
  assert.deepEqual(findRoomPath(park.roomById,'S1','T1'),['S1','S2','T1']);
  assert.throws(()=>findRoomPath(park.roomById,'S1','PARKING'),/Invalid path/);
});

test('park clock has exact 5-minute increments across all five hours',()=>{
  const all=Array.from({length:61},(_,i)=>formatParkTime(i*5));
  assert.equal(new Set(all).size,61);
  assert.equal(all[0],'4:00 PM');
  assert.equal(all[12],'5:00 PM');
  assert.equal(all[36],'7:00 PM');
  assert.equal(all[60],'9:00 PM');
});

test('guest photographer leaves; resident photographer stays all day',()=>{
  let world=createScheduledWorld(park,park.roleSchedules,[
    {id:'park-cat',stay:'guest'}, {id:'park-squirrel',stay:'resident'}
  ]);
  for(const t of [0,35,40,50,90,95,150,299,300]) {
    world=advanceScheduledWorld(world,park,t);
    const maya=world.actors.find(a=>a.templateId==='photo-mom');
    const alex=world.actors.find(a=>a.templateId==='quick-photog');
    assert.ok(maya,`${formatParkTime(t)}: Maya missing`);
    assert.equal(Boolean(alex),t>=40 && t<95,`${formatParkTime(t)}: Alex presence wrong`);
  }
});
