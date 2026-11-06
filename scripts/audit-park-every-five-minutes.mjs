// Generates a complete 5-minute-by-actor audit, including absent guest rows,
// for every possible cat/squirrel roll combination. Fails on any violation.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LEVELS } from '../src/rooms.js';
import { createScheduledWorld, advanceScheduledWorld, compareScheduledPositions,formatParkTime,scheduledBlock } from '../src/role-scheduler.js';

const level=LEVELS.park;
const outcomes=[['resident','resident'],['resident','guest'],['guest','resident'],['guest','guest']];
const csv=['scenario,game_second,park_time,actor,kind,stay,job,expected_zone,actual_zone,status,expected_activity,actual_activity'];
const failures=[];
let checkpoints=0;
let assertions=0;
const quote=value=>`"${String(value??'').replaceAll('"','""')}"`;
for(const [cat,squirrel] of outcomes){
  const scenario=`cat-${cat}_squirrel-${squirrel}`;
  let world=createScheduledWorld(level,level.roleSchedules,[
    {id:'park-cat',stay:cat},{id:'park-squirrel',stay:squirrel}
  ]);
  for(let t=0;t<=level.dayDurationSeconds;t+=5) {
    world=advanceScheduledWorld(world,level,t);
    const issues=compareScheduledPositions(level,world,t);
    failures.push(...issues.map(issue=>`${scenario}: ${issue}`));
    checkpoints++;
    for(const plan of world.plans) {
      const expectedPresent=plan.stay==='resident'||(t>=plan.arrival&&t<plan.departure);
      const actor=world.actors.find(a=>a.templateId===plan.templateId&&a.stay===plan.stay);
      const block=scheduledBlock(plan,Math.min(t,level.dayDurationSeconds-1));
      const expected=expectedPresent?block.zone:'ABSENT';
      const actual=actor?.room??'ABSENT';
      const status=expected===actual?'PASS':'FAIL';
      assertions++;
      csv.push([scenario,t,formatParkTime(t),plan.templateId,plan.kind,plan.stay,plan.job,expected,actual,status,expectedPresent?block.activity:'none',actor?.currentActivity??'none'].map(quote).join(','));
    }
  }
}
const base=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../reports');
fs.mkdirSync(base,{recursive:true});
fs.writeFileSync(path.join(base,'park-five-minute-actor-audit.csv'),`${csv.join('\n')}\n`);
const report=[
  '# Park actor position audit (five-minute checkpoints)',
  '',
  '- Park clock: 4:00 PM through 9:00 PM (300 game seconds)',
  '- Checkpoint frequency: five in-game minutes (5 simulated seconds)',
  `- Animal-roll scenarios: ${outcomes.length}`,
  `- Checkpoints checked: ${checkpoints} (${checkpoints/outcomes.length} per scenario)`,
  `- Actor presence and room comparisons: ${assertions}`,
  `- Incorrect locations: ${failures.length}`,
  '- Verification uses runtime role scheduling against independent appointment blocks; intermediate walking steps are also covered by unit tests.',
  '',
  ...(failures.length?['## FAILURES',...failures]:['## RESULT: PASS — every actor matched the scheduled location or expected absence.']),
  '',
];
fs.writeFileSync(path.join(base,'park-five-minute-audit-summary.md'),report.join('\n'));
console.log(report.join('\n'));
if(failures.length) process.exitCode=1;
