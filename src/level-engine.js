// Pure world rules used by every level. Actors are independent of their role, species,
// and duration of stay; cameras, audio and ghosts read from this single world state.
export const MAX_FOCUS = 24;
export const STARTING_FOCUS = 16;
export const ACTOR_KINDS = ['human', 'animal', 'ghost'];
export const STAY_TYPES = ['resident', 'guest'];
export const OBJECTIVE_EVENTS = ['inspect', 'listen_story', 'audio_recorded', 'emf_scan_ghost', 'capture_ghost'];
export const GAME_STATES = ['playing', 'won', 'lost'];

export function isResident(actor) { return actor.stay === 'resident'; }
export function isGuest(actor) { return actor.stay === 'guest'; }
export function isGhost(actor) { return actor.kind === 'ghost'; }
export function isVisibleActor(actor) { return actor.kind !== 'ghost'; }

function checkActor(actor, roomIds, roomById, label, errors, isVisit=false) {
  if (!actor?.id || !actor?.name) errors.push(`${label}: actor needs id and name`);
  if (!ACTOR_KINDS.includes(actor.kind)) errors.push(`${label}: invalid kind ${actor.kind}`);
  if (!STAY_TYPES.includes(actor.stay)) errors.push(`${label}: invalid stay ${actor.stay}`);
  if (!actor.role) errors.push(`${label}: missing role`);
  if (!roomIds.has(actor.room)) errors.push(`${label}: invalid starting zone ${actor.room}`);
  if (!actor.route?.length || actor.route[0] !== actor.room) errors.push(`${label}: route must begin in the starting zone`);
  if (isVisit && actor.stay !== 'guest') errors.push(`${label}: scheduled actors must be guests`);
  for (let i=0; i<(actor.route?.length ?? 0); i++) {
    const current=actor.route[i];
    const next=actor.route[i+1] ?? (actor.stay === 'resident' ? actor.route[0] : null);
    if (!roomIds.has(current) || (next && !roomIds.has(next))) errors.push(`${label}: invalid route zone`);
    else if (next && current !== next && !roomById[current]?.links?.includes(next)) errors.push(`${label}: illegal step ${current} → ${next}`);
  }
}

export function validateLevel(level) {
  const errors=[];
  if (!level?.id || !level?.title) errors.push('Level needs an id and title');
  const rooms=level?.rooms ?? [];
  const roomIds=new Set(rooms.map(room=>room.id));
  if (roomIds.size!==rooms.length) errors.push('Duplicate zone IDs');
  if (roomIds.size<1) errors.push('At least one zone required');
  if (!roomIds.has(level.defaultSelected)) errors.push('Selected zone missing');
  if (level.defaultCameras?.length!==4) errors.push('Expected four Detail 2 cameras');
  for (const id of level.defaultCameras ?? []) if (!roomIds.has(id)) errors.push(`Camera references unknown zone ${id}`);
  for (const cell of level.mapCells ?? []) if (typeof cell==='string' && !roomIds.has(cell)) errors.push(`Map references unknown zone ${cell}`);
  for (const room of rooms) {
    if (!room.image || !room.color || !room.glyph) errors.push(`${room.id}: missing display data`);
    if (!Array.isArray(room.ambient)) errors.push(`${room.id}: missing sounds`);
    for (const neighbor of room.links ?? []) {
      if (!roomIds.has(neighbor)) errors.push(`${room.id}: invalid link ${neighbor}`);
      else if (!level.roomById[neighbor]?.links?.includes(room.id)) errors.push(`${room.id} → ${neighbor}: one-way connection`);
    }
  }
  const ids=new Set();
  for (const actor of level.initialActors ?? []) {
    checkActor(actor,roomIds,level.roomById,actor.name,errors);
    if (actor.stay !== 'resident') errors.push(`${actor.name}: starting actors must be residents; guests use visits`);
    if (ids.has(actor.id)) errors.push(`Duplicate actor ID ${actor.id}`);
    ids.add(actor.id);
  }
  for (const visit of level.guestVisits ?? []) {
    if (!Number.isInteger(visit.startTick) || visit.startTick<0) errors.push(`${visit.id}: invalid arrival tick`);
    if (visit.repeatEvery != null && (!Number.isInteger(visit.repeatEvery) || visit.repeatEvery<1)) errors.push(`${visit.id}: invalid repeat`);
    if (!visit.members?.length) errors.push(`${visit.id}: empty guest visit`);
    for (const guest of visit.members ?? []) {
      checkActor(guest,roomIds,level.roomById,`${visit.id}/${guest.name}`,errors,true);
      if (ids.has(guest.id)) errors.push(`Duplicate actor template ID ${guest.id}`);
      ids.add(guest.id);
    }
  }
  const objectiveIds = new Set();
  if (level.objectives?.length !== 5) errors.push('Every level must define exactly five objectives');
  for (const goal of level.objectives ?? []) {
    if (!goal.id || !goal.label || !goal.hint) errors.push('Objective requires id, label, and hint');
    if (objectiveIds.has(goal.id)) errors.push(`Duplicate objective ${goal.id}`);
    objectiveIds.add(goal.id);
    if (!OBJECTIVE_EVENTS.includes(goal.eventType)) errors.push(`${goal.id}: unsupported event type`);
    if (goal.room && !roomIds.has(goal.room)) errors.push(`${goal.id}: unknown objective room ${goal.room}`);
  }
  if (!Number.isInteger(level.dayDurationSeconds) || level.dayDurationSeconds < 1) errors.push('Invalid day duration');
  for (const animal of level.randomAnimals ?? []) {
    const resident = {...animal, stay:'resident'};
    const guest = {...animal, stay:'guest'};
    checkActor(resident, roomIds, level.roomById, `${animal.name} resident`, errors);
    checkActor(guest, roomIds, level.roomById, `${animal.name} guest`, errors, true);
    if (animal.kind !== 'animal') errors.push(`${animal.name}: randomized actors must be animals`);
    if (!Number.isInteger(animal.guestStartTick) || animal.guestStartTick < 0) errors.push(`${animal.name}: invalid guest arrival`);
    if (ids.has(animal.id)) errors.push(`Duplicate actor template ID ${animal.id}`);
    ids.add(animal.id);
  }
  for (const story of level.storyEvents ?? []) if (!roomIds.has(story.room)) errors.push(`Story in unknown zone ${story.room}`);
  for (const log of level.startLogEntries ?? []) if (!roomIds.has(log.room)) errors.push(`Sound in unknown zone ${log.room}`);
  if (level.mapCells?.length!==9) errors.push('Expected 3×3 map layout');
  for (const id of roomIds) if (!(level.mapCells ?? []).includes(id)) errors.push(`Zone ${id} omitted from map`);
  return errors;
}

export function instantiateActor(template, suffix='') {
  return { ...template, id: suffix ? `${template.id}@${suffix}` : template.id, templateId: template.id, waypoint:0, x:template.x ?? 15, dir:template.dir ?? 1, speed:template.speed ?? 3 };
}

// Each randomized animal is independently rolled once when a game starts.
// An animal with guest status uses the ordinary arrival/visit system;
// a resident is instantiated immediately and never naturally exits.
export function rollRandomAnimals(level, rng=Math.random) {
  const actors = [];
  const visits = [];
  const rolls = [];
  for (const animal of level.randomAnimals ?? []) {
    const stay = rng() < 0.5 ? 'resident' : 'guest';
    rolls.push({id:animal.id, name:animal.name, role:animal.role, stay});
    const template = {...animal, stay};
    delete template.guestStartTick;
    if (stay === 'resident') actors.push(instantiateActor(template));
    else visits.push({id:`random-visit-${animal.id}`,startTick:animal.guestStartTick,members:[template]});
  }
  return {actors, visits, rolls};
}

export function initializeLevel(level, rng=Math.random) {
  const randomAnimals=rollRandomAnimals(level,rng);
  return {
    selected:level.defaultSelected,
    cameras:[...level.defaultCameras],
    lights:Object.fromEntries(level.rooms.map(room=>[room.id,room.light])),
    muted:{...level.initialMuted},
    focus:Array(STARTING_FOCUS).fill('base'),
    actors:[...(level.initialActors ?? []).map(actor=>instantiateActor(actor)),...randomAnimals.actors],
    guestVisits:[...(level.guestVisits ?? []),...randomAnimals.visits],
    animalRolls:randomAnimals.rolls,
    objectiveProgress:[],
    dayRemaining:level.dayDurationSeconds,
    trapCount:level.toolItems.find(tool=>tool.name==='Ghost Trap')?.count ?? 0,
  };
}

// A resident loops forever through connected rooms; a guest finishes their route
// and exits the scene. Ghosts and animals use exactly the same lifecycle rules.
export function moveActors(actors, distance=1.2) {
  const next=[];
  for (const actor of actors) {
    const nextX=actor.x+actor.dir*actor.speed*distance;
    if (nextX >= 91 || nextX <= 9) {
      const nextWaypoint=actor.waypoint+1;
      if (isGuest(actor) && nextWaypoint>=actor.route.length) continue;
      const waypoint=isResident(actor) ? nextWaypoint%actor.route.length : nextWaypoint;
      next.push({...actor,x:actor.dir>0?9:91,room:actor.route[waypoint],waypoint});
    } else next.push({...actor,x:nextX});
  }
  return next;
}

export function guestsDueAtTick(level,tick,actors,visits=level.guestVisits) {
  const arrivals=[];
  for (const visit of visits ?? []) {
    if (tick<visit.startTick) continue;
    const repeat=visit.repeatEvery;
    const due=repeat ? (tick-visit.startTick)%repeat===0 : tick===visit.startTick;
    if (!due) continue;
    for (const member of visit.members) {
      // Repeating visits are independent of one another and retain group IDs.
      arrivals.push({ ...instantiateActor(member,`${visit.id}-${tick}`), groupId:visit.id, visitTick:tick });
    }
  }
  return arrivals;
}

export function advanceWorld(level,actors,tick,distance=1.2,visits=level.guestVisits) {
  const moved=moveActors(actors,distance);
  const arrived=guestsDueAtTick(level,tick,moved,visits);
  const nextActors=[...moved,...arrived];
  return {actors:nextActors,arrived,departed:actors.filter(actor=>isGuest(actor)&&!nextActors.some(other=>other.id===actor.id))};
}

export function spendFocus(focus) { return focus.slice(0,-1); }
export function restoreFocus(focus, category, count) {
  if (!['story','ghost'].includes(category)) throw new Error(`Unknown focus type: ${category}`);
  return [...focus,...Array(Math.min(Math.max(0,count),MAX_FOCUS-focus.length)).fill(category)];
}
export function audibleEvents(events,muted,activityMode='ALL') {
  return events.filter(event=> !muted[event.room] && (activityMode==='ALL'||event.kind===activityMode.toLowerCase()));
}

// Objectives are completed only by successful gameplay actions, not by mere passage of time.
export function applyObjectiveEvent(level,completedIds,event) {
  const completed=new Set(completedIds);
  for (const goal of level.objectives ?? []) {
    if (goal.eventType !== event.type) continue;
    if (goal.room && goal.room !== event.room) continue;
    completed.add(goal.id);
  }
  return [...completed];
}

export function advanceDay(secondsRemaining,seconds=1) {
  return Math.max(0,secondsRemaining - Math.max(0,seconds));
}

// Clear, deterministic precedence: winning all five tasks ends the level immediately;
// otherwise no remaining focus or a zero day clock ends in a loss.
export function evaluateLevel(level,completedIds,focus,dayRemaining) {
  const completed = new Set(completedIds);
  if ((level.objectives ?? []).length === 5 && level.objectives.every(goal => completed.has(goal.id))) {
    return {state:'won', reason:'objectives'};
  }
  if (focus.length === 0) return {state:'lost', reason:'focus'};
  if (dayRemaining <= 0) return {state:'lost', reason:'day'};
  return {state:'playing',reason:null};
}
