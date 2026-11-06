import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { LEVELS } from '../src/rooms.js';
import {
  validateLevel, initializeLevel, advanceWorld, initializeLostItems,
  dropScheduledLostItems, recoverLostItem, returnLostItem,
  reportThief, applyObjectiveEvent, evaluateLevel, advanceDay,
  spendFocus, isGuest, isResident,
} from '../src/level-engine.js';

const bank = LEVELS.bank;

function customerAndThief() {
  const init=initializeLevel(bank,()=>0);
  const customer = init.guestVisits.find(v=>v.id==='wallet-customer');
  const thief = init.guestVisits.find(v=>v.id==='thief-visit');
  let actors=init.actors;
  for (let tick=1;tick<=30;tick++) actors=advanceWorld(bank,actors,tick,1.2,init.guestVisits).actors;
  return {actors,customer,thief};
}

test('bank map has sixteen connected zones and four live camera assignments',()=>{
  assert.equal(bank.rooms.length,16);
  assert.equal(bank.mapCells.length,16);
  assert.equal(bank.defaultCameras.length,4);
  assert.deepEqual(validateLevel(bank),[]);
  for(const room of bank.rooms) assert.ok(existsSync(resolve('public/assets',`${room.image}.webp`)));
  assert.ok(existsSync(resolve('public/assets','bank_map.webp')));
});

test('bank employees and security guards are always residents; thieves and customers are guests',()=>{
  const init=initializeLevel(bank);
  assert.ok(init.actors.some(actor=>actor.role==='security guard'));
  assert.ok(init.actors.some(actor=>actor.role.includes('bank employee')));
  assert.ok(init.actors.filter(a=>a.role==='security guard'||a.role.includes('bank employee')).every(isResident));
  const visits=init.guestVisits.flatMap(v=>v.members);
  assert.ok(visits.some(a=>a.role==='thief'));
  assert.ok(visits.some(a=>a.role==='customer'));
  assert.ok(visits.filter(a=>['thief','customer'].includes(a.role)).every(isGuest));
  assert.ok(init.actors.every(a=>!['thief','customer'].includes(a.role)));
});

test('lost property waits for real customer, spawns once and persists after customer departs',()=>{
  const scheduled=initializeLostItems(bank);
  assert.equal(scheduled.length,2);
  assert.equal(dropScheduledLostItems(scheduled,[],200).dropped.length,0);
  let {actors}=customerAndThief();
  const item=dropScheduledLostItems(scheduled,actors,30);
  assert.equal(item.dropped.length,1);
  assert.equal(item.items[0].status,'dropped');
  assert.ok(bank.roomById[item.items[0].room]);
  assert.equal(dropScheduledLostItems(item.items,actors,31).dropped.length,0);
  assert.equal(dropScheduledLostItems(item.items,[],300).items[0].status,'dropped');
});

test('picking up lost property requires inspecting the correct zone',()=>{
  const {actors}=customerAndThief();
  const spawned=dropScheduledLostItems(initializeLostItems(bank),actors,30).items;
  assert.equal(recoverLostItem(spawned,'wallet-nina','VF').ok,false);
  assert.equal(recoverLostItem(spawned,'other-wallet',spawned[0].room).ok,false);
  const recovered=recoverLostItem(spawned,'wallet-nina',spawned[0].room);
  assert.equal(recovered.ok,true);
  assert.equal(recovered.items[0].status,'recovered');
  assert.equal(recoverLostItem(recovered.items,'wallet-nina',spawned[0].room).ok,false);
});

test('returning an item requires its real owner or the resident lost-property desk',()=>{
  const {actors}=customerAndThief();
  const spawned=dropScheduledLostItems(initializeLostItems(bank),actors,30).items;
  const recovered=recoverLostItem(spawned,'wallet-nina',spawned[0].room).items;
  assert.equal(returnLostItem(recovered,'wallet-nina','VF',actors).ok,false);
  const owner=actors.find(a=>a.templateId==='customer-nina');
  assert.ok(owner);
  const returned=returnLostItem(recovered,'wallet-nina',owner.room,actors);
  assert.equal(returned.ok,true);
  assert.equal(returned.deliveredBy,'owner');
  assert.equal(returned.items[0].status,'returned');
  assert.equal(returnLostItem(returned.items,'wallet-nina',owner.room,actors).ok,false);
  const viaDesk=returnLostItem(recovered,'wallet-nina','LNF',bank.initialActors);
  assert.equal(viaDesk.ok,true);
  assert.equal(viaDesk.deliveredBy,'lost_property_desk');
});

test('false theft accusations do nothing; actual thief triggers resident security response',()=>{
  const {actors}=customerAndThief();
  const customer=actors.find(a=>a.role==='customer');
  const thief=actors.find(a=>a.role==='thief');
  const employee=actors.find(a=>a.role.includes('bank employee'));
  assert.ok(customer&&thief&&employee);
  assert.equal(reportThief(actors,customer.room,customer.id).ok,false);
  assert.equal(reportThief(actors,employee.room,employee.id).ok,false);
  assert.equal(reportThief(actors,'VF',thief.id).ok,false);
  const result=reportThief(actors,thief.room,thief.id);
  assert.equal(result.ok,true);
  assert.equal(result.reported.role,'thief');
  assert.equal(result.actors.some(a=>a.id===thief.id),false);
  assert.equal(result.actors.filter(a=>a.role==='security guard').length,2);
});

test('bank HAPPY PATH: inspect, report thief, recover and return item, capture ghost → victory',()=>{
  const {actors}=customerAndThief();
  const culprit=actors.find(a=>a.role==='thief');
  const dropped=dropScheduledLostItems(initializeLostItems(bank),actors,30).items;
  const report=reportThief(actors,culprit.room,culprit.id);
  const recover=recoverLostItem(dropped,'wallet-nina',dropped[0].room);
  const deliver=returnLostItem(recover.items,'wallet-nina','LNF',report.actors);
  assert.ok(report.ok && recover.ok && deliver.ok);
  let completed=[];
  completed=applyObjectiveEvent(bank,completed,{type:'inspect',room:'EN'});
  completed=applyObjectiveEvent(bank,completed,{type:'thief_reported',room:culprit.room});
  completed=applyObjectiveEvent(bank,completed,{type:'item_recovered',room:dropped[0].room});
  completed=applyObjectiveEvent(bank,completed,{type:'item_returned',room:'LNF'});
  assert.equal(evaluateLevel(bank,completed,Array(15).fill('base'),300).state,'playing');
  completed=applyObjectiveEvent(bank,completed,{type:'capture_ghost',room:'VF'});
  assert.equal(completed.length,5);
  assert.deepEqual(evaluateLevel(bank,completed,Array(15).fill('base'),230),{state:'won',reason:'objectives'});
});

test('bank GAME OVER: the day ends before all five tasks are complete',()=>{
  const init=initializeLevel(bank);
  const progress=applyObjectiveEvent(bank,[],{type:'inspect',room:'EN'});
  assert.deepEqual(evaluateLevel(bank,progress,init.focus,advanceDay(init.dayRemaining,300)),{state:'lost',reason:'day'});
});

test('bank GAME OVER: focus is exhausted while still investigating',()=>{
  const init=initializeLevel(bank);
  let focus=init.focus;
  for (let i=0;i<init.focus.length;i++) focus=spendFocus(focus);
  assert.equal(focus.length,0);
  assert.deepEqual(evaluateLevel(bank,[],focus,120),{state:'lost',reason:'focus'});
});
