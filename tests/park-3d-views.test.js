import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PARK_3D_ZONES,PARK_FIXED_CAMERAS,parkZoneSpec,createParkZoneCommands,perspectiveMatrix,viewMatrix,multiplyMatrices,boxMatrix,rodMatrix} from '../src/park-3d-scene.js';
import {LEVELS} from '../src/rooms.js';

const park=LEVELS.park;
test('every playable Park room has an immutable fixed perspective camera',()=>{
 assert.deepEqual([...PARK_3D_ZONES].sort(),park.rooms.map(r=>r.id).sort());
 for(const room of park.rooms){
  const camera=PARK_FIXED_CAMERAS[room.id];
  assert.ok(camera,room.id);assert.equal(camera.eye.length,3);assert.equal(camera.lookAt.length,3);
  assert.ok(camera.eye.every(Number.isFinite));assert.ok(camera.lookAt.every(Number.isFinite));
  assert.ok(camera.fov>=30 && camera.fov<=75);
  assert.ok(Math.hypot(...camera.eye.map((x,i)=>x-camera.lookAt[i]))>5);
  assert.equal(parkZoneSpec(room.id).fixedCamera,camera);
 }
});
test('3D geometry is substantive and finite for shelter, swings, tree, and three field sectors',()=>{
 const types=new Set();
 for(const zone of PARK_3D_ZONES){
  const commands=createParkZoneCommands(zone);
  assert.ok(commands.length>20,`${zone}: expected non-flat world geometry`);
  assert.ok(commands.some(c=>c.shape==='box'),`${zone}: should have volumetric box meshes`);
  assert.ok(commands.some(c=>c.shape==='rod'),`${zone}: should have depth-bearing rods`);
  for(const command of commands){
   assert.equal(command.model.length,16);
   assert.ok(command.model.every(Number.isFinite));
   assert.ok(command.model[15]===1);
  }
  types.add(parkZoneSpec(zone).geometry);
 }
 assert.equal(types.size,4);
 assert.throws(()=>createParkZoneCommands('INVALID'),/Unknown/);
});
test('camera math produces non-degenerate 4x4 projection/model/view matrices',()=>{
 const m=boxMatrix(1,2,3,2,3,4,.4),v=viewMatrix([9,5,10],[0,1,0]),p=perspectiveMatrix(52,16/9);
 for(const matrix of [m,v,p,multiplyMatrices(p,v),rodMatrix([0,0,0],[1,4,2],.1)]){
  assert.equal(matrix.length,16);assert.ok(matrix.every(Number.isFinite));
 }
 assert.deepEqual(m.slice(12),[1,2,3,1]);
 assert.ok(p[0]>0 && p[5]>0);
});
test('the 2D feed is a raster from the same fixed 3D camera, not separate room art',()=>{
 for(const zone of PARK_3D_ZONES){
  assert.equal(parkZoneSpec(zone).detail2RasterizedFromDetail3,true);
  assert.equal(parkZoneSpec(zone).perspective3D,true);
 }
 const src=fs.readFileSync(new URL('../src/Park3DView.jsx',import.meta.url),'utf8');
 assert.match(src,/\.toDataURL\('image\/png'\)/);
 assert.match(src,/new Park3DRenderer\(canvas/);
 assert.match(src,/FIXED CAMERA/);
});
test('Park uses WebGL for Detail 3, captured PNGs for Detail 2, and existing live map for Detail 1',()=>{
 const src=fs.readFileSync(new URL('../src/App.jsx',import.meta.url),'utf8');
 assert.match(src,/level\.id==='park' \? <ParkLive3D/);
 assert.match(src,/level\.id==='park' \? <Park2DSnapshot/);
 assert.match(src,/level\.mapCells\.map/);
 assert.match(src,/people\.filter\(p=>p\.room===r\.id\)/);
});

function mockWebGL() {
 const calls={draw:0,viewports:[],matrices:0,deleted:0};
 const gl={
  VERTEX_SHADER:1,FRAGMENT_SHADER:2,COMPILE_STATUS:3,LINK_STATUS:4,
  ARRAY_BUFFER:5,STATIC_DRAW:6,DEPTH_TEST:7,BLEND:8,LEQUAL:9,
  SRC_ALPHA:10,ONE_MINUS_SRC_ALPHA:11,CULL_FACE:12,BACK:13,
  COLOR_BUFFER_BIT:14,DEPTH_BUFFER_BIT:15,FLOAT:16,TRIANGLES:17,
  createShader:()=>({}),shaderSource(){},compileShader(){},
  getShaderParameter:()=>true,getShaderInfoLog:()=>'',
  createProgram:()=>({}),attachShader(){},linkProgram(){},
  getProgramParameter:()=>true,getProgramInfoLog:()=>'',
  getAttribLocation:()=>0,getUniformLocation:()=>({}),
  createBuffer:()=>({}),bindBuffer(){},bufferData(){},
  enable(){},depthFunc(){},blendFunc(){},cullFace(){},
  viewport(...v){calls.viewports.push(v);},clearColor(){},clear(){},useProgram(){},
  depthMask(){},enableVertexAttribArray(){},vertexAttribPointer(){},
  uniformMatrix4fv(){calls.matrices++;},uniform3fv(){},uniform1f(){},
  drawArrays(){calls.draw++;},deleteBuffer(){calls.deleted++;},
  deleteProgram(){},getExtension:()=>null,
 };
 return {gl,calls};
}

test('actual WebGL renderer draws all six 3D scenes and actor meshes via GPU calls',async()=>{
 const {Park3DRenderer}=await import('../src/park-3d-scene.js');
 const {gl,calls}=mockWebGL();
 const canvas={width:0,height:0,clientWidth:600,clientHeight:340,getContext:()=>gl};
 const renderer=new Park3DRenderer(canvas);
 for(const zoneId of PARK_3D_ZONES){
  const before=calls.draw;
  renderer.render({zoneId,actors:[{id:'human',room:zoneId,kind:'human',role:'ranger',color:'#a8dc74',x:50}],width:600,height:340});
  assert.ok(calls.draw-before>25,`${zoneId} should draw 3D objects`);
 }
 assert.equal(canvas.width,600);assert.equal(canvas.height,340);
 assert.equal(calls.viewports.length,6);
 renderer.dispose(); assert.ok(calls.deleted>=6);
});
test('the GPU draws dynamic humans, animals, and spirits from actor state and trap status',async()=>{
 const {Park3DRenderer}=await import('../src/park-3d-scene.js');
 const {gl,calls}=mockWebGL();
 const canvas={width:320,height:196,clientWidth:320,clientHeight:196,getContext:()=>gl};
 const renderer=new Park3DRenderer(canvas,{preserveDrawingBuffer:true});
 renderer.render({zoneId:'S1',actors:[],lightsOn:true,width:320,height:196});
 const emptyDraws=calls.draw;
 renderer.render({zoneId:'S1',actors:[
  {id:'human',room:'S1',kind:'human',role:'photographer',color:'#f19ed4',x:12},
  {id:'cat',room:'S1',kind:'animal',role:'cat',color:'#eeaa55',x:22},
  {id:'spirit',room:'S1',kind:'ghost',role:'spirit',color:'#aaffff',x:78},
 ],trapActive:true,width:320,height:196});
 assert.ok(calls.draw-emptyDraws > emptyDraws,'actor meshes and trap geometry must be added');
 renderer.dispose();
});
