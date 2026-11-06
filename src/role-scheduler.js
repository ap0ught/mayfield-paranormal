// Deterministic opt-in actor scheduling. One integer game second is one Park
// minute; no wall-clock, React, timers, Vite or randomness are used here.
// All locations are actual playable zones; transitions follow reciprocal links.
import { instantiateActor } from './level-engine.js';

export function findRoomPath(roomById, start, destination) {
  if (!roomById[start] || !roomById[destination]) throw new Error(`Invalid path: ${start} → ${destination}`);
  if (start === destination) return [start];
  const queue = [[start]];
  const visited = new Set([start]);
  for (let i=0; i<queue.length; i++) {
    const path = queue[i];
    const current = path.at(-1);
    for (const next of roomById[current].links ?? []) {
      if (!roomById[next]?.links?.includes(current) || visited.has(next)) continue;
      const candidate = [...path, next];
      if (next === destination) return candidate;
      visited.add(next);
      queue.push(candidate);
    }
  }
  throw new Error(`No connected route: ${start} → ${destination}`);
}

export function formatParkTime(gameSecond) {
  const totalMinutes = 16*60 + Math.max(0, Math.floor(gameSecond));
  const hour24 = Math.floor(totalMinutes/60);
  return `${hour24 % 12 || 12}:${String(totalMinutes%60).padStart(2,'0')} ${hour24>=12?'PM':'AM'}`;
}

function planKey(templateId, stay) {return `${templateId}/${stay}`;}

export function validateRoleSchedules(level, spec) {
  const errors = [];
  if (spec.levelId!==level.id) errors.push('Wrong level identifier');
  if (spec.clock?.dayDurationSeconds!==level.dayDurationSeconds) errors.push('Incorrect day duration');
  const allTemplates = [
    ...(level.initialActors ?? []),
    ...(level.guestVisits ?? []).flatMap(visit=>visit.members),
    ...(level.randomAnimals ?? []),
  ];
  const requiredKeys = new Set(allTemplates.flatMap(template =>
    (level.randomAnimals ?? []).some(animal=>animal.id===template.id)
      ? [planKey(template.id,'resident'),planKey(template.id,'guest')]
      : [planKey(template.id,template.stay)]));
  const found = new Set();
  for (const plan of spec.actorPlans ?? []) {
    const key = planKey(plan.templateId,plan.stay);
    if (found.has(key)) errors.push(`Duplicate plan: ${key}`);
    found.add(key);
    if (!requiredKeys.has(key)) errors.push(`Unexpected plan: ${key}`);
    const template = allTemplates.find(actor=>actor.id===plan.templateId);
    if (template && template.kind!==plan.kind) errors.push(`${key}: kind mismatch`);
    if (!plan.blocks?.length) errors.push(`${key}: empty blocks`);
    let lastEnd = 0;
    for (const block of plan.blocks ?? []) {
      if (!level.roomById[block.zone]) errors.push(`${key}: unknown zone ${block.zone}`);
      if (!Number.isInteger(block.start)||!Number.isInteger(block.end)||block.start<lastEnd||block.end<=block.start||block.end>level.dayDurationSeconds) errors.push(`${key}: invalid block time`);
      lastEnd = block.end;
    }
    if (plan.stay==='guest' && (!Number.isInteger(plan.arrival)||!Number.isInteger(plan.departure)||plan.arrival!==plan.blocks?.[0]?.start||plan.departure!==lastEnd)) errors.push(`${key}: invalid guest interval`);
    if (plan.stay==='resident' && (plan.blocks?.[0]?.start!==0 || lastEnd!==level.dayDurationSeconds)) errors.push(`${key}: resident must span full day`);
    try {
      const zones = plan.stay==='guest'
        ? [plan.entryZone,...(plan.blocks ?? []).map(block=>block.zone),plan.exitZone]
        : (plan.blocks ?? []).map(block=>block.zone);
      for (let i=1;i<zones.length;i++) {
        if (!zones[i-1] || !zones[i]) throw new Error('Unknown zone');
        findRoomPath(level.roomById,zones[i-1],zones[i]);
      }
    } catch(e) {errors.push(`${key}: ${e.message}`);}
  }
  for (const key of requiredKeys) if (!found.has(key)) errors.push(`Missing plan: ${key}`);
  return errors;
}

export function scheduledBlock(plan, gameSecond) {
  return plan.blocks.find(block=>block.start<=gameSecond && gameSecond<block.end)
    ?? (gameSecond>=plan.blocks.at(-1).end ? plan.blocks.at(-1) : null);
}

function templateLookup(level) {
  return new Map([
    ...(level.initialActors ?? []),
    ...(level.guestVisits ?? []).flatMap(visit=>visit.members),
    ...(level.randomAnimals ?? []),
  ].map(actor=>[actor.id,actor]));
}

export function createScheduledWorld(level, spec, animalRolls=[]) {
  const errors=validateRoleSchedules(level,spec);
  if (errors.length) throw new Error(`Invalid ${level.id} schedules: ${errors.join('; ')}`);
  const rolled=new Map(animalRolls.map(roll=>[roll.id,roll.stay]));
  const randomIds=new Set((level.randomAnimals ?? []).map(actor=>actor.id));
  for (const id of randomIds) if (!rolled.has(id)) throw new Error(`Missing animal roll for ${id}`);
  const templates=templateLookup(level);
  const plans=spec.actorPlans.filter(plan=>!randomIds.has(plan.templateId) || rolled.get(plan.templateId)===plan.stay);
  const initial = plans.filter(plan=>plan.stay==='resident').map(plan=>{
    const actor = instantiateActor({...templates.get(plan.templateId),stay:plan.stay});
    const first=plan.blocks[0];
    // Most Park templates start in their first task's zone. This is a spawn,
    // not a travel step, and is only permitted at initial level load.
    return {...actor,room:first.zone,job:plan.job,currentActivity:first.activity,activityState:'working',targetZone:first.zone};
  });
  return {elapsedGameSeconds:0,actors:initial,plans,events:[]};
}

function stepScheduledWorld(world, level) {
  const second=world.elapsedGameSeconds+1;
  if(second>level.dayDurationSeconds) return world;
  const templateById=templateLookup(level);
  const plansByKey=new Map(world.plans.map(plan=>[planKey(plan.templateId,plan.stay),plan]));
  const events=[];
  const actors=[];
  for (const actor of world.actors) {
    const plan=plansByKey.get(planKey(actor.templateId,actor.stay));
    if (!plan) {actors.push(actor);continue;}
    if (plan.stay==='guest' && second>=plan.departure) {
      if (actor.room!==plan.exitZone) throw new Error(`${actor.name} could not leave from ${actor.room} at ${second}; expected ${plan.exitZone}`);
      events.push({type:'departure',time:second,actorId:actor.templateId,room:actor.room});
      continue;
    }
    const block=scheduledBlock(plan,Math.min(second,level.dayDurationSeconds-1));
    const nextBlock=block
      ? plan.blocks.find(candidate=>candidate.start===block.end)
      : plan.blocks.find(candidate=>candidate.start>second);
    let target=block?.zone ?? actor.room;
    let state=block?'working':'idle';
    let activity=block?.activity ?? 'idle';
    // Reserve just enough seconds for graph travel before the next appointment.
    if (nextBlock) {
      const steps=findRoomPath(level.roomById,actor.room,nextBlock.zone);
      const travelWindow=block ? block.end-second : nextBlock.start-second;
      if (travelWindow <= steps.length-1) {
        target=nextBlock.zone;
        state='en_route';
        activity='travel';
      }
    }
    if (actor.room!==target) state='en_route';
    const path=findRoomPath(level.roomById,actor.room,target);
    const destination=path[1] ?? actor.room; // at most one zone per game second
    const reached=block ? destination===block.zone : destination===target;
    actors.push({
      ...actor,room:destination,targetZone:target,
      currentActivity:reached?activity:'travel',
      activityState:reached&&state==='working'?'working':state==='idle'?'idle':'en_route',
      x:destination===actor.room ? Math.max(12,Math.min(88,actor.x + actor.dir*0.5)) : 20,
    });
  }
  for (const plan of world.plans) {
    if (plan.stay!=='guest' || plan.arrival!==second) continue;
    const template=templateById.get(plan.templateId);
    const actor=instantiateActor({...template,stay:'guest'},`${plan.visitId ?? 'visit'}-${second}`);
    if (actors.some(existing=>existing.templateId===plan.templateId)) throw new Error(`Duplicate guest: ${plan.templateId}`);
    actors.push({...actor,room:plan.entryZone,job:plan.job,currentActivity:plan.blocks[0].activity,activityState:'working',targetZone:plan.blocks[0].zone,groupId:plan.visitId});
    events.push({type:'arrival',time:second,actorId:plan.templateId,room:plan.entryZone});
  }
  return { ...world,elapsedGameSeconds:second,actors,events };
}

// Handles a single second or a virtual-time jump with exactly the same outcome.
// Supply the current world rather than reconstructing actors at the target time;
// captured ghosts therefore never respawn accidentally.
export function advanceScheduledWorld(world, level, targetSecond) {
  if (!Number.isInteger(targetSecond) || targetSecond<world.elapsedGameSeconds || targetSecond>level.dayDurationSeconds) throw new RangeError('Invalid scheduler time');
  let next=world;
  while(next.elapsedGameSeconds<targetSecond) next=stepScheduledWorld(next,level);
  return next;
}

// Unit tests also use this to prove a misplaced actor would be detected.
export function compareScheduledPositions(level, world, second) {
  const issues=[];
  const live=new Map(world.actors.map(actor=>[planKey(actor.templateId,actor.stay),actor]));
  const expectedKeys = new Set();
  for (const plan of world.plans) {
    const key=planKey(plan.templateId,plan.stay);
    const expectedPresent=plan.stay==='resident' || (plan.arrival<=second && second<plan.departure);
    const actual=live.get(key);
    if (!expectedPresent) {
      if (actual) issues.push(`${formatParkTime(second)}: ${key} should be absent but is in ${actual.room}`);
      continue;
    }
    expectedKeys.add(key);
    if (!actual) {issues.push(`${formatParkTime(second)}: ${key} expected present but is absent`);continue;}
    const block=scheduledBlock(plan,Math.min(second,level.dayDurationSeconds-1));
    // A valid free interval has no appointment zone; presence and room validity
    // are still checked below, but the scheduler must not invent one.
    if (!block) continue;
    // reached (pre-travel), or no valid schedule was maintained.
    if (actual.room!==block.zone) issues.push(`${formatParkTime(second)}: ${key} expected ${block.zone} (${block.activity}), found ${actual.room}`);
  }
  for(const actor of world.actors) {
    const key=planKey(actor.templateId,actor.stay);
    if (!expectedKeys.has(key)) issues.push(`${formatParkTime(second)}: unexpected active actor ${key}`);
    if (!level.roomById[actor.room]) issues.push(`${formatParkTime(second)}: ${key} is in unknown zone ${actor.room}`);
  }
  return issues;
}
