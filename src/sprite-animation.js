// Actor sprite bindings shared by the live feed and 1.3-second snapshot cameras.
// Six equal frames: 0 idle, 1-4 walking, 5 interaction/alert.
import { LEVELS } from './rooms.js';

export const SPRITE_FRAME_COUNT = 6;
export const SPRITE_FRAME_WIDTH = 64;
export const SPRITE_FRAME_HEIGHT = 88;

const templateIds = Object.fromEntries(Object.values(LEVELS).map(level=>[
  level.id,
  new Set([...(level.initialActors ?? []), ...(level.randomAnimals ?? []), ...(level.guestVisits ?? []).flatMap(visit=>visit.members ?? [])].map(a=>a.id)),
]));
const levelGhosts = Object.fromEntries(Object.values(LEVELS).map(level=>[
  level.id,
  [...(level.initialActors ?? []), ...(level.guestVisits ?? []).flatMap(visit=>visit.members ?? [])].find(a=>a.kind==='ghost')?.id,
]));

export function spriteTemplateId(levelId, actor) {
  const id=actor.templateId ?? actor.id?.split('@')[0];
  if(templateIds[levelId]?.has(id)) return id;
  // Spirits that manifest after the level begins reuse that level's ghost atlas.
  if(actor.kind==='ghost') return levelGhosts[levelId] || null;
  return null;
}

export function spriteUrl(levelId, actor) {
  const id=spriteTemplateId(levelId,actor);
  return id ? `/assets/sprites/${levelId}/${id}.png` : null;
}

export function actorPose(actor) {
  if(actor.kind==='ghost') return 'float';
  if(actor.activityState==='en_route' || actor.currentActivity==='travel') return 'walk';
  // Park appointment blocks have job-based actions; while working they stop walking.
  if(actor.activityState==='working') {
    const activity=String(actor.currentActivity ?? '').toLowerCase();
    if(/photo|shoot|coach|play|patrol|clean|inspect|monitor|guard|record|talk|feed|practice|workout|warmup|serve|kick|assist/.test(activity))return 'interact';
    return 'idle';
  }
  // Legacy House, Bank, Hotel actors continuously traverse their preset routes.
  return 'walk';
}

export function snapshotFramePosition(pose, snapshotFrame) {
  if(pose==='idle') return '0%';
  if(pose==='interact') return '100%';
  return `${((snapshotFrame % 4)+1)*20}%`;
}
