import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { LEVELS } from '../src/rooms.js';
import {
  MAX_FOCUS, STARTING_FOCUS, validateLevel, initializeLevel, moveActors,
  advanceWorld, guestsDueAtTick, spendFocus, restoreFocus, audibleEvents,
  isResident, isGuest, isGhost, applyObjectiveEvent, advanceDay, evaluateLevel,
} from '../src/level-engine.js';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');

for (const level of Object.values(LEVELS)) {
  test(`${level.id}: every zone, actor route, camera, and guest schedule is valid`, () => {
    assert.deepEqual(validateLevel(level),[]);
  });

  test(`${level.id}: all map and scene illustrations exist`, () => {
    assert.ok(existsSync(resolve(root,'public/assets',`${level.mapBackground}.webp`)));
    for(const room of level.rooms) {
      assert.ok(existsSync(resolve(root,'public/assets',`${room.image}.webp`)),`missing image for ${room.name}`);
    }
  });

  test(`${level.id}: initialization creates an independent resident population`, () => {
    const a=initializeLevel(level,()=>0), b=initializeLevel(level,()=>0);
    assert.equal(a.selected,level.defaultSelected);
    assert.deepEqual(a.cameras,level.defaultCameras);
    assert.equal(a.cameras.length,4);
    assert.equal(a.focus.length,STARTING_FOCUS);
    assert.equal(a.trapCount,2);
    assert.equal(a.actors.length,level.initialActors.length+level.randomAnimals.length);
    assert.ok(a.actors.every(isResident));
    assert.notStrictEqual(a.actors,b.actors);
    a.actors[0].room='not-a-room';
    a.focus.pop();
    a.cameras[0]='not-a-camera';
    assert.equal(b.actors[0].room,level.initialActors[0].room);
    assert.equal(b.focus.length,STARTING_FOCUS);
    assert.equal(b.cameras[0],level.defaultCameras[0]);
  });

  test(`${level.id}: residents move through linked zones without leaving`, () => {
    const people=initializeLevel(level).actors;
    const nearBoundary=people.map(actor=>({...actor,x:90,dir:1}));
    const moved=moveActors(nearBoundary);
    assert.equal(moved.length,nearBoundary.length);
    for(let i=0;i<people.length;i++) {
      const before=people[i], after=moved[i];
      assert.equal(after.room,before.route[1 % before.route.length]);
      if(before.room!==after.room) assert.ok(level.roomById[before.room].links.includes(after.room));
      assert.equal(after.x,9);
    }
  });

  test(`${level.id}: scheduled guest arrives, crosses adjacent zones and exits`, () => {
    const first=level.guestVisits[0];
    assert.equal(guestsDueAtTick(level,first.startTick-1,[]).length,0);
    const arriving=guestsDueAtTick(level,first.startTick,[]);
    assert.ok(arriving.length);
    assert.ok(arriving.every(isGuest));
    assert.deepEqual(arriving.map(a=>a.groupId),Array(arriving.length).fill(first.id));
    let actors=arriving;
    const originalIds=arriving.map(a=>a.id);
    for(let i=0;i<180;i++) actors=moveActors(actors);
    assert.equal(actors.length,0,'guests should exit when their planned visit ends');
    assert.ok(!originalIds.some(id=>actors.some(a=>a.id===id)));
    assert.equal(guestsDueAtTick(level,first.startTick+first.repeatEvery,[]).length,arriving.length);
  });

  test(`${level.id}: scheduled guests are human, animal and ghost actors`, () => {
    const guestWorld=initializeLevel(level,()=>0.99);
    const visitorKinds=new Set(guestWorld.guestVisits.flatMap(visit=>visit.members.map(member=>member.kind)));
    assert.deepEqual([...visitorKinds].sort(),['animal','ghost','human']);
    const residentKinds=new Set(initializeLevel(level,()=>0).actors.map(actor=>actor.kind));
    assert.deepEqual([...residentKinds].sort(),['animal','ghost','human']);
    assert.ok(level.initialActors.some(isGhost));
    assert.ok(level.guestVisits.some(v=>v.members.some(isGhost)));
  });
}

test('DRY-test park has six simulated zones in a 3×3 map including three outside cells',()=>{
  const park=LEVELS.park;
  assert.equal(park.rooms.length,6);
  assert.equal(park.mapCells.length,9);
  assert.equal(park.mapCells.filter(item=>typeof item==='string').length,6);
  assert.equal(park.mapCells.filter(item=>typeof item!=='string').length,3);
  assert.deepEqual(park.rooms.filter(r=>r.id.startsWith('F')).map(r=>r.id), ['F1','F2','F3']);
  assert.ok(park.rooms.some(r=>r.name.includes('Shelter')));
  assert.ok(park.rooms.some(r=>r.name.includes('Swings')));
  assert.ok(park.rooms.some(r=>r.name.includes('Tree')));
});

test('park has two photographers with the same role and different stay',()=>{
  const park=LEVELS.park;
  const mom=park.initialActors.find(a=>a.id==='photo-mom');
  const quick=park.guestVisits.flatMap(v=>v.members).find(a=>a.id==='quick-photog');
  assert.equal(mom.kind,'human');
  assert.equal(quick.kind,'human');
  assert.match(mom.role,/photographer/);
  assert.match(quick.role,/photographer/);
  assert.equal(mom.stay,'resident');
  assert.equal(quick.stay,'guest');
});

test('visiting family enters as a group and departs while park residents remain',()=>{
  const park=LEVELS.park;
  let actors=initializeLevel(park).actors;
  const stableIds=new Set(actors.map(a=>a.id));
  let arrivals=[];
  for(let tick=1;tick<=220;tick++) {
    const frame=advanceWorld(park,actors,tick);
    actors=frame.actors;
    arrivals.push(...frame.arrived);
  }
  const family=arrivals.filter(a=>a.groupId==='family-playdate');
  assert.equal(family.length,4);
  assert.deepEqual(new Set(family.map(a=>a.role)),new Set(['parent','child','pet dog']));
  assert.ok(family.every(a=>isGuest(a)));
  assert.ok(family.every(a=>!actors.some(p=>p.id===a.id)),'visiting family should have departed');
  for(const id of stableIds) assert.ok(actors.some(a=>a.id===id),`resident ${id} should remain`);
});

test('focus drains one at a time and restores with colored category caps',()=>{
  const start=Array(STARTING_FOCUS).fill('base');
  assert.equal(spendFocus(start).length,STARTING_FOCUS-1);
  assert.equal(start.length,STARTING_FOCUS,'original focus must not mutate');
  const story=restoreFocus(start,'story',4);
  assert.equal(story.length,20);
  assert.equal(story.filter(part=>part==='story').length,4);
  const caught=restoreFocus(story,'ghost',7);
  assert.equal(caught.length,MAX_FOCUS);
  assert.equal(caught.filter(part=>part==='ghost').length,4,'restore caps at available slots');
  assert.equal(spendFocus([]).length,0);
  assert.throws(()=>restoreFocus([], 'red',5));
});

test('muted zones disappear from sound log and activity filters still work',()=>{
  const events=[
    {room:'F2',kind:'ghost',text:'Whisper'},
    {room:'S1',kind:'story',text:'Shelter story'},
    {room:'S2',kind:'ambient',text:'Chains squeak'},
  ];
  const muted={F2:true};
  assert.deepEqual(audibleEvents(events,muted).map(e=>e.room),['S1','S2']);
  assert.deepEqual(audibleEvents(events,muted,'STORY').map(e=>e.room),['S1']);
  assert.deepEqual(audibleEvents(events,{},'GHOST').map(e=>e.room),['F2']);
});

test('validation catches illegal guest route skips',()=>{
  const base=LEVELS.park;
  const guest=base.guestVisits[0].members[0];
  const invalid={...base,guestVisits:[{...base.guestVisits[0],members:[{...guest,route:['S1','F3']}]}]};
  assert.ok(validateLevel(invalid).some(error=>error.includes('illegal step')));
});


for (const level of Object.values(LEVELS)) {
  test(`${level.id}: randomized animal can be either a resident or a guest at load`, () => {
    assert.ok(level.randomAnimals.some(animal=>animal.role==='cat'), 'every level must include a randomized cat');
    const residentWorld=initializeLevel(level,()=>0);
    const guestWorld=initializeLevel(level,()=>0.99);
    for (const animal of level.randomAnimals) {
      assert.ok(residentWorld.actors.some(actor=>actor.templateId===animal.id && isResident(actor)),`${animal.name} should be a resident`);
      assert.ok(!residentWorld.guestVisits.some(visit=>visit.members.some(member=>member.id===animal.id)),`${animal.name} cannot be simultaneously scheduled as a guest`);
      assert.ok(!guestWorld.actors.some(actor=>actor.templateId===animal.id),`${animal.name} must not be present before guest arrival`);
      const visit=guestWorld.guestVisits.find(visit=>visit.members.some(member=>member.id===animal.id));
      assert.ok(visit, `${animal.name} needs a scheduled visit`);
      assert.ok(visit.members.every(isGuest));
      assert.equal(guestsDueAtTick(level,visit.startTick,guestWorld.actors,guestWorld.guestVisits).filter(actor=>actor.templateId===animal.id).length,1);
    }
    assert.equal(residentWorld.animalRolls.length,level.randomAnimals.length);
    assert.ok(residentWorld.animalRolls.every(roll=>roll.stay==='resident'));
    assert.ok(guestWorld.animalRolls.every(roll=>roll.stay==='guest'));
  });

  test(`${level.id}: randomized guest animal enters and naturally leaves; resident never exits`, () => {
    const guestWorld=initializeLevel(level,()=>0.99);
    const residentWorld=initializeLevel(level,()=>0);
    let guestActors=guestWorld.actors;
    let residentActors=residentWorld.actors;
    const animalIds=new Set(level.randomAnimals.map(animal=>animal.id));
    let animalArrivalCount=0;
    let animalDepartureCount=0;
    for (let tick=1;tick<=205;tick++) {
      const frame=advanceWorld(level,guestActors,tick,1.2,guestWorld.guestVisits);
      guestActors=frame.actors;
      animalArrivalCount+=frame.arrived.filter(actor=>animalIds.has(actor.templateId)).length;
      animalDepartureCount+=frame.departed.filter(actor=>animalIds.has(actor.templateId)).length;
      residentActors=advanceWorld(level,residentActors,tick,1.2,residentWorld.guestVisits).actors;
    }
    assert.equal(animalArrivalCount,level.randomAnimals.length);
    assert.equal(animalDepartureCount,level.randomAnimals.length);
    for (const animalId of animalIds) {
      assert.ok(!guestActors.some(actor=>actor.templateId===animalId));
      assert.ok(residentActors.some(actor=>actor.templateId===animalId && isResident(actor)));
    }
  });

  test(`${level.id}: HAPPY PATH — five successful actions immediately win`, () => {
    let progress=[];
    const world=initializeLevel(level,()=>0.15);
    let focus=world.focus;
    let dayRemaining=world.dayRemaining;
    assert.equal(evaluateLevel(level,progress,focus,dayRemaining).state,'playing');
    for (const goal of level.objectives) {
      const before=progress.length;
      progress=applyObjectiveEvent(level,progress,{type:goal.eventType,room:goal.room ?? level.defaultSelected});
      assert.equal(progress.length,before+1,`successful action should complete ${goal.label}`);
      if(progress.length<5) assert.equal(evaluateLevel(level,progress,focus,dayRemaining).state,'playing');
      focus=restoreFocus(spendFocus(focus),'story',1);
      dayRemaining=advanceDay(dayRemaining,7);
    }
    assert.equal(progress.length,5);
    assert.deepEqual(evaluateLevel(level,progress,focus,dayRemaining),{state:'won',reason:'objectives'});
    // Once won, the result does not change simply because the remaining time is zero.
    assert.deepEqual(evaluateLevel(level,progress,[],0),{state:'won',reason:'objectives'});
  });

  test(`${level.id}: GAME OVER — day runs out with an unfinished mission`, () => {
    const world=initializeLevel(level,()=>0.99);
    let progress=[];
    progress=applyObjectiveEvent(level,progress,{type:level.objectives[0].eventType,room:level.objectives[0].room});
    let seconds=world.dayRemaining;
    for(let tick=0;tick<level.dayDurationSeconds;tick++) {
      seconds=advanceDay(seconds);
    }
    assert.equal(seconds,0);
    assert.equal(progress.length,1);
    assert.deepEqual(evaluateLevel(level,progress,world.focus,seconds),{state:'lost',reason:'day'});
  });

  test(`${level.id}: GAME OVER — focus reaches zero while the day is ongoing`, () => {
    const world=initializeLevel(level,()=>0.99);
    let focus=world.focus;
    for(let i=0;i<world.focus.length;i++) focus=spendFocus(focus);
    assert.equal(focus.length,0);
    assert.deepEqual(evaluateLevel(level,[],focus,world.dayRemaining),{state:'lost',reason:'focus'});
  });

  test(`${level.id}: objective completion is idempotent and ignores unrelated actions`, () => {
    const goal=level.objectives[0];
    assert.deepEqual(applyObjectiveEvent(level,[],{type:'invalid',room:goal.room}),[]);
    if(goal.room) assert.deepEqual(applyObjectiveEvent(level,[],{type:goal.eventType,room:'wrong-room'}),[]);
    const one=applyObjectiveEvent(level,[],{type:goal.eventType,room:goal.room});
    assert.equal(one.length,1);
    assert.deepEqual(applyObjectiveEvent(level,one,{type:goal.eventType,room:goal.room}),one);
  });
}

test('park cat and squirrel roll independently instead of sharing the same status', () => {
  const sequence=[0.1,0.9];
  const world=initializeLevel(LEVELS.park,()=>sequence.shift());
  assert.deepEqual(world.animalRolls.map(roll=>[roll.role,roll.stay]),[['cat','resident'],['squirrel','guest']]);
  assert.equal(LEVELS.park.randomAnimals.length,2);
  assert.equal(LEVELS.house.randomAnimals.length,1);
});
