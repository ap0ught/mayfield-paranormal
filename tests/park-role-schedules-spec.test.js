import test from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS } from '../src/rooms.js';
import { PARK_ROLE_SCHEDULES as spec } from '../examples/park-role-schedules.example.js';

const park = LEVELS.park;
const DAY = park.dayDurationSeconds;
const key = plan => `${plan.templateId}/${plan.stay}`;
const plans = spec.actorPlans;
const byKey = new Map(plans.map(p=>[key(p),p]));

function hasPath(start, end) {
  if (start===end) return true;
  const seen=new Set([start]);
  const queue=[start];
  for (let cursor=0;cursor<queue.length;cursor++) {
    const zone=queue[cursor];
    for(const next of park.roomById[zone]?.links ?? []) {
      if(next===end) return true;
      if(!seen.has(next)) {seen.add(next);queue.push(next);}
    }
  }
  return false;
}

test('park role plan covers every existing actor template and both animal roll variants', () => {
  const keys=[
    ...park.initialActors.map(a=>`${a.id}/resident`),
    ...park.guestVisits.flatMap(v=>v.members.map(a=>`${a.id}/guest`)),
    ...park.randomAnimals.flatMap(a=>[`${a.id}/resident`,`${a.id}/guest`]),
  ];
  assert.equal(new Set(keys).size,keys.length);
  assert.equal(new Set(plans.map(key)).size,plans.length,'no duplicate schedule variants');
  assert.deepEqual(new Set(plans.map(key)),new Set(keys));
});

test('Park runtime schedule uses one 300-second day, not legacy movement ticks', () => {
  assert.equal(spec.levelId,park.id);
  assert.equal(spec.clock.dayDurationSeconds,DAY);
  assert.equal(spec.clock.timeUnit,'elapsed-game-seconds');
  assert.equal(spec.clock.gameMinutesPerSimulationSecond,1);
  assert.equal(spec.clock.gameStart,'16:00');
  assert.equal(spec.clock.gameEnd,'21:00');
  assert.equal(spec.status,'runtime-active-park');
});

test('all activity blocks have ordered, valid zone and time windows', () => {
  const validRooms=new Set(park.rooms.map(r=>r.id));
  for(const plan of plans) {
    assert.ok(plan.job,`${key(plan)} missing job`);
    assert.ok(plan.blocks.length>0,`${key(plan)} needs activities`);
    let prev=0;
    for(const b of plan.blocks) {
      assert.ok(Number.isInteger(b.start)&&Number.isInteger(b.end),`${key(plan)} has noninteger time`);
      assert.ok(b.start>=prev && b.end>b.start && b.end<=DAY,`${key(plan)} overlapping/invalid window`);
      assert.ok(validRooms.has(b.zone),`${key(plan)} uses map filler or invalid zone ${b.zone}`);
      assert.ok(b.activity && ['required','preferred'].includes(b.priority),`${key(plan)} invalid activity`);
      prev=b.end;
    }
  }
});

test('guest schedules have explicit arrival/exit and path-connected appointments', () => {
  for(const plan of plans.filter(p=>p.stay==='guest')) {
    const validRooms=new Set(park.rooms.map(r=>r.id));
    assert.ok(Number.isInteger(plan.arrival)&&Number.isInteger(plan.departure));
    assert.ok(plan.arrival>=0 && plan.departure<=DAY && plan.departure>plan.arrival);
    assert.ok(validRooms.has(plan.entryZone)&&validRooms.has(plan.exitZone));
    assert.equal(plan.blocks[0].start,plan.arrival);
    assert.equal(plan.blocks.at(-1).end,plan.departure);
    assert.ok(hasPath(plan.entryZone,plan.blocks[0].zone));
    assert.ok(hasPath(plan.blocks.at(-1).zone,plan.exitZone));
    for(let i=1;i<plan.blocks.length;i++) {
      assert.ok(hasPath(plan.blocks[i-1].zone,plan.blocks[i].zone),`${key(plan)} disconnected appointment path`);
    }
  }
});

test('all resident roles span the level day without forced despawn', () => {
  for(const plan of plans.filter(p=>p.stay==='resident')) {
    assert.equal(plan.blocks[0].start,0);
    assert.equal(plan.blocks.at(-1).end,DAY);
    assert.equal(plan.arrival,undefined);
    assert.equal(plan.departure,undefined);
  }
});

test('family playdate moves together with matching shared visit windows', () => {
  const names=['visiting-mom','child-ivy','child-noah','family-dog'];
  const family=names.map(id=>byKey.get(`${id}/guest`));
  assert.ok(family.every(Boolean));
  assert.ok(family.every(p=>p.visitId==='family-playdate'));
  for(const p of family) {
    assert.equal(p.arrival,family[0].arrival);
    assert.equal(p.departure,family[0].departure);
    assert.deepEqual(p.blocks.map(b=>[b.start,b.end,b.zone]),family[0].blocks.map(b=>[b.start,b.end,b.zone]));
  }
});

test('one photographer role supports both a full-day resident and short visit', () => {
  const maya=byKey.get('photo-mom/resident');
  const alex=byKey.get('quick-photog/guest');
  assert.equal(maya.job,'event_photographer');
  assert.equal(alex.job,'event_photographer');
  assert.equal(maya.blocks[0].start,0);
  assert.equal(maya.blocks.at(-1).end,DAY);
  assert.ok(alex.departure < DAY);
});

test('every existing Park story has a scheduled audible location for its speaker', () => {
  for(const story of park.storyEvents) {
    const actor=park.initialActors.find(a=>a.name===story.who);
    assert.ok(actor,`${story.id}: speaker missing`);
    const schedule=byKey.get(`${actor.id}/resident`);
    assert.ok(schedule,`${story.id}: schedule missing`);
    assert.ok(schedule.blocks.some(b=>b.zone===story.room),`${story.id}: speaker never scheduled in ${story.room}`);
  }
});

test('Park actor identities and kinds match their schedule variants', () => {
  const templates=[
    ...park.initialActors,
    ...park.guestVisits.flatMap(v=>v.members),
    ...park.randomAnimals,
  ];
  for(const plan of plans){
    const template=templates.find(t=>t.id===plan.templateId);
    assert.ok(template);
    assert.equal(plan.kind,template.kind);
    if(!park.randomAnimals.some(a=>a.id===plan.templateId)) assert.equal(plan.stay,template.stay);
  }
});
