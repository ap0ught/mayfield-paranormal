/**
 * Mayfield Park: dependency-free, genuinely three-dimensional WebGL scenes.
 *
 * One deterministic scene specification drives BOTH the fixed perspective live
 * camera (Detail 3) and the rasterized 2D camera snapshots (Detail 2).
 * Detail 1 deliberately stays a cheap HTML/map overview.
 *
 * No OrbitControls, pointer camera, texture billboards, CSS pseudo-3D, or
 * secondary scene data. The same actor zone/x and light status are supplied
 * to all three presentation levels by App.jsx.
 */

export const PARK_3D_ZONES = Object.freeze(['S1', 'S2', 'T1', 'F1', 'F2', 'F3']);
export const PARK_FIXED_CAMERAS = Object.freeze({
  S1: { eye: [8.6, 5.1, 11.4], lookAt: [0, 1.3, 0], fov: 49 },
  S2: { eye: [7.0, 5.0, 12.4], lookAt: [0, 1.3, 0], fov: 51 },
  T1: { eye: [8.1, 4.6, 11.5], lookAt: [0, 2.0, 0], fov: 51 },
  F1: { eye: [7.5, 6.5, 12.4], lookAt: [0, .8, 0], fov: 58 },
  F2: { eye: [7.5, 6.5, 12.4], lookAt: [0, .8, 0], fov: 58 },
  F3: { eye: [7.5, 6.5, 12.4], lookAt: [0, .8, 0], fov: 58 },
});

const VERTEX = `
attribute vec3 aPosition;
attribute vec3 aNormal;
uniform mat4 uMVP;
uniform mat4 uModel;
varying vec3 vNormal;
varying float vDepth;
void main() {
  vec4 world = uModel * vec4(aPosition, 1.0);
  vec4 clip = uMVP * vec4(aPosition, 1.0);
  gl_Position = clip;
  vNormal = mat3(uModel) * aNormal;
  vDepth = gl_Position.w;
}`;
const FRAGMENT = `
precision mediump float;
uniform vec3 uColor;
uniform float uLight;
uniform float uAlpha;
varying vec3 vNormal;
varying float vDepth;
void main() {
  vec3 n = normalize(vNormal);
  float sunny = max(dot(n, normalize(vec3(-0.55, 1.0, 0.7))), 0.0);
  float shade = (0.43 + 0.57 * sunny) * uLight;
  vec3 lit = uColor * shade + uColor * 0.09;
  float fog = clamp((vDepth - 13.0) / 28.0, 0.0, 0.55);
  lit = mix(lit, vec3(0.055, 0.12, 0.21), fog);
  gl_FragColor = vec4(lit, uAlpha);
}`;

const clamp = (v,min,max) => Math.max(min,Math.min(max,v));
const sub = (a,b) => a.map((x,i) => x-b[i]);
const dot = (a,b) => a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const cross = (a,b) => [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const norm = a => {const l=Math.hypot(...a)||1; return a.map(x=>x/l);};
const mid = (a,b) => a.map((v,i)=>(v+b[i])/2);

export function perspectiveMatrix(fov, aspect, near=.1, far=100) {
  const f=1/Math.tan(fov*Math.PI/360);
  const nf=1/(near-far);
  return [f/aspect,0,0,0, 0,f,0,0, 0,0,(far+near)*nf,-1, 0,0,2*far*near*nf,0];
}
export function viewMatrix(eye,at) {
  const z=norm(sub(eye,at));
  const x=norm(cross([0,1,0],z));
  const y=cross(z,x);
  return [x[0],y[0],z[0],0, x[1],y[1],z[1],0, x[2],y[2],z[2],0,
    -dot(x,eye),-dot(y,eye),-dot(z,eye),1];
}
export function multiplyMatrices(a,b) {
  const out=new Array(16);
  for(let c=0;c<4;c++)for(let r=0;r<4;r++){
    out[c*4+r]=a[r]*b[c*4]+a[4+r]*b[c*4+1]+a[8+r]*b[c*4+2]+a[12+r]*b[c*4+3];
  }
  return out;
}

export function boxMatrix(x,y,z,sx,sy,sz,rotation=0) {
  const c=Math.cos(rotation),s=Math.sin(rotation);
  return [c*sx,s*sx,0,0, -s*sy,c*sy,0,0, 0,0,sz,0, x,y,z,1];
}
export function rodMatrix(from,to,radius) {
  const direction=sub(to,from);
  const len=Math.hypot(...direction);
  const y=norm(direction);
  const x=norm(cross(y,Math.abs(y[2])>.93?[1,0,0]:[0,0,1]));
  const z=cross(x,y);
  const p=mid(from,to);
  return [x[0]*radius,x[1]*radius,x[2]*radius,0,
    y[0]*len,y[1]*len,y[2]*len,0,
    z[0]*radius,z[1]*radius,z[2]*radius,0,
    p[0],p[1],p[2],1];
}
function meshBuffer(data,normals) {return {positions:new Float32Array(data),normals:new Float32Array(normals),count:data.length/3};}
function cubeMesh() {
  const p=[],n=[];
  const corners=[
    [[0,0,1],[-.5,-.5,.5],[.5,-.5,.5],[.5,.5,.5],[-.5,.5,.5]],
    [[0,0,-1],[.5,-.5,-.5],[-.5,-.5,-.5],[-.5,.5,-.5],[.5,.5,-.5]],
    [[1,0,0],[.5,-.5,.5],[.5,-.5,-.5],[.5,.5,-.5],[.5,.5,.5]],
    [[-1,0,0],[-.5,-.5,-.5],[-.5,-.5,.5],[-.5,.5,.5],[-.5,.5,-.5]],
    [[0,1,0],[-.5,.5,.5],[.5,.5,.5],[.5,.5,-.5],[-.5,.5,-.5]],
    [[0,-1,0],[-.5,-.5,-.5],[.5,-.5,-.5],[.5,-.5,.5],[-.5,-.5,.5]],
  ];
  for(const [normal,...v] of corners)for(const i of [0,1,2,0,2,3]){
    p.push(...v[i]);n.push(...normal);
  }
  return meshBuffer(p,n);
}
function cylinderMesh(segments=12) {
  const p=[],n=[];
  for(let i=0;i<segments;i++){
    const a=i*Math.PI*2/segments,b=(i+1)*Math.PI*2/segments;
    const x0=Math.cos(a)*.5,z0=Math.sin(a)*.5,x1=Math.cos(b)*.5,z1=Math.sin(b)*.5;
    const side=[[x0,-.5,z0],[x0,.5,z0],[x1,.5,z1],[x0,-.5,z0],[x1,.5,z1],[x1,-.5,z1]];
    for(const v of side){p.push(...v);n.push(v[0]*2,0,v[2]*2);}
    for(const [y,flip] of [[.5,false],[-.5,true]]){
      const tri=flip?[[0,y,0],[x0,y,z0],[x1,y,z1]]:[[0,y,0],[x1,y,z1],[x0,y,z0]];
      for(const v of tri){p.push(...v);n.push(0,y>0?1:-1,0);}
    }
  }
  return meshBuffer(p,n);
}
function sphereMesh(segments=12,rings=8) {
  const p=[],n=[];
  function pt(phi,theta){return [Math.sin(phi)*Math.cos(theta)*.5,Math.cos(phi)*.5,Math.sin(phi)*Math.sin(theta)*.5];}
  for(let j=0;j<rings;j++)for(let i=0;i<segments;i++){
    const phi0=j*Math.PI/rings,phi1=(j+1)*Math.PI/rings,a=i*2*Math.PI/segments,b=(i+1)*2*Math.PI/segments;
    const v0=pt(phi0,a),v1=pt(phi0,b),v2=pt(phi1,b),v3=pt(phi1,a);
    for(const v of [v0,v1,v2,v0,v2,v3]){p.push(...v);n.push(...norm(v));}
  }
  return meshBuffer(p,n);
}
const GEOMETRY={box:cubeMesh(),rod:cylinderMesh(),ball:sphereMesh()};
function rgb(hex){
  const h=hex.replace('#',''); const v=parseInt(h.length===3?h.split('').map(c=>c+c).join(''):h,16);
  return [(v>>16&255)/255,(v>>8&255)/255,(v&255)/255];
}
class SceneCommands {
  constructor(){this.static=[];this.transparent=[];}
  add(shape,model,color,alpha=1){const command={shape,model,color,alpha};(alpha<1?this.transparent:this.static).push(command);}
  box(x,y,z,sx,sy,sz,color,rotation=0){this.add('box',boxMatrix(x,y,z,sx,sy,sz,rotation),color);}
  ball(x,y,z,sx,sy,sz,color,alpha=1){this.add('ball',boxMatrix(x,y,z,sx,sy,sz),color,alpha);}
  rod(a,b,radius,color){this.add('rod',rodMatrix(a,b,radius),color);}
}

function makeTree(c,x,z,s=1) {
  c.rod([x,0,z],[x,3.4*s,z],.45*s,'#806044');
  for(const [dx,dy,dz,t] of [[0,4,0,3.4],[-1,3.7,0,2.5],[1,3.6,-.3,2.7],[.2,4.4,.7,2.8]]){
    c.ball(x+dx*s,dy*s,z+dz*s,t*s,t*.78*s,t*s,dy>4?'#376641':'#2c5538');
  }
  c.ball(x,4.8*s,z,1.3*s,.9*s,1.3*s,'#407847');
}
function makeLamp(c,x,z) {
  c.rod([x,0,z],[x,4.0,z],.12,'#353c47');
  c.box(x,3.75,z,.9,.07,.9,'#273747');
  c.ball(x,4.0,z,.7,.68,.7,'#ffe5a0');
  c.box(x,4.4,z,1,.12,1,'#1b2531');
}
function makeBench(c,x,z,scale=1) {
  c.box(x,.6*scale,z,2.6*scale,.16*scale,.8*scale,'#a57543');
  c.box(x,.92*scale,z-.35*scale,2.6*scale,.84*scale,.14*scale,'#a57543');
  for(const s of [-1,1]) {
    c.box(x+s*1.0*scale,.3*scale,z,.15*scale,.6*scale,.72*scale,'#323c45');
    c.box(x+s*1.0*scale,.52*scale,z-.35*scale,.15*scale,.85*scale,.16*scale,'#323c45');
  }
}
function makePicnicTable(c,x,z) {
  c.box(x,.95,z,2.9,.2,1.35,'#986842');
  for(const s of [-1,1]) {
    c.box(x,.55,z+s*1.0,3.1,.14,.45,'#ac7949');
    c.rod([x-1,.04,z],[x-1,.88,z],.11,'#5a4637');
    c.rod([x+1,.04,z],[x+1,.88,z],.11,'#5a4637');
  }
}
function makeShelter(c) {
  c.box(0,-.13,0,20,.22,15,'#414e45');
  c.box(0,-.015,0,11,.10,8.4,'#837462');
  for(const x of [-5,5])for(const z of [-3.4,3.4]){
    c.box(x,.55,z,.8,1.1,.8,'#b0a38d');
    c.rod([x,.9,z],[x,3.7,z],.24,'#9b6238');
  }
  for(const z of [-3.4,3.4]){
    c.rod([-5,3.75,z],[5,3.75,z],.20,'#a46a3e');
    c.rod([-5,3.75,z],[0,5.1,z],.15,'#a46a3e');
    c.rod([0,5.1,z],[5,3.75,z],.15,'#a46a3e');
  }
  for(const x of [-5,0,5])c.rod([x,3.7,-3.5],[x,3.7,3.5],.15,'#b27746');
  // Two solid pitched roof slabs; visibly pitched in perspective.
  c.box(-2.6,4.35,0,5.8,.22,8.0,'#68483a',.27);
  c.box( 2.6,4.35,0,5.8,.22,8.0,'#68483a',-.27);
  c.rod([-0.15,5.15,-4],[.15,5.15,4],.11,'#d5a36a');
  for(const [x,z] of [[-2.7,-1.9],[2.7,1.9]])makePicnicTable(c,x,z);
  for(const [x,z] of [[-4.0,5.3],[4.0,-5.5]])makeTree(c,x,z,.7);
  c.rod([0,5.0,0],[0,3.9,0],.05,'#252830');
  c.ball(0,3.75,0,.8,.8,.8,'#f4d68b');
  makeLamp(c,-7,-5);makeLamp(c,7,5);
}
function makeSwings(c) {
  c.box(0,-.15,0,20,.22,15,'#3d5a42');
  c.box(-.3,.0,0,12,.08,9,'#8c6250');
  for(const x of [-3.0,3.0]){
    c.rod([x-1.25,0,-1.5],[x,4.5,-1.5],.16,'#c46cb2');
    c.rod([x+1.25,0,-1.5],[x,4.5,-1.5],.16,'#c46cb2');
  }
  c.rod([-4,4.5,-1.5],[4,4.5,-1.5],.18,'#e2aa53');
  for(const x of [-1.6,1.6]){
    c.rod([x-.55,4.4,-1.5],[x-.55,1.65,-1.3],.038,'#d1d5dc');
    c.rod([x+.55,4.4,-1.5],[x+.55,1.65,-1.3],.038,'#d1d5dc');
    c.box(x,1.60,-1.3,1.35,.16,.65,'#3976b2');
  }
  // Climbing tower with an actual sloping slide.
  for(const x of [4.3,6.2])for(const z of [-1.9,.5])c.rod([x,0,z],[x,3,z],.15,'#ca8540');
  c.box(5.25,2.7,-.7,2.9,.16,2.7,'#ceab66');
  c.box(3.9,1.65,2.3,2.0,.14,5.6,'#e1b443',.0);
  for(const x of [-7,7])makeTree(c,x,5,.72);
  makeLamp(c,-7,-5);makeLamp(c,7,-5);
}
function makeTreeBench(c) {
  c.box(0,-.15,0,20,.22,15,'#486b49');
  c.box(0,.0,2.0,20,.08,2.4,'#8b8076');
  makeTree(c,-2,-2.3,1.25);
  makeBench(c,2,1.9,1.25);
  c.rod([5,0,-3],[5,1.1,-3],.36,'#697e55');
  c.ball(5,1.4,-3,2,2,2,'#60814a');
  makeLamp(c,6.8,-4.4);
  c.ball(-6,.3,2,.6,.7,.6,'#ca6a55');
}
function fieldLine(c,x,z,w,d) {c.box(x,.06,z,w,.028,d,'#f3f7e9');}
function makeGoal(c,x,z) {
  const left=x-.9,right=x+.9;
  c.rod([left,.08,z],[left,2.4,z],.08,'#fbfafa');
  c.rod([right,.08,z],[right,2.4,z],.08,'#fbfafa');
  c.rod([left,2.4,z],[right,2.4,z],.09,'#fbfafa');
  for(let i=0;i<5;i++)c.rod([left+i*(right-left)/4,.06,z-.8],[left+i*(right-left)/4,2.4,z],.023,'#9cb7b7');
}
function makeField(c,zone) {
  c.box(0,-.2,0,20,.28,15,'#294e35');
  c.box(0,-.01,0,17,.1,10.4,'#3b7542');
  for(let i=0;i<7;i++)c.box(-7.2+i*2.4,.048,0,1.15,.01,10.2,i%2?'#3f7c44':'#37703e');
  fieldLine(c,0,-5,16,.09); fieldLine(c,0,5,16,.09);
  fieldLine(c,-8,0,.09,10);fieldLine(c,8,0,.09,10);
  if(zone==='F2'){
    fieldLine(c,0,0,.1,10);
    for(let i=0;i<24;i++){
      const a=i*2*Math.PI/24,b=(i+1)*2*Math.PI/24;
      c.rod([1.7*Math.cos(a),.07,1.7*Math.sin(a)],[1.7*Math.cos(b),.07,1.7*Math.sin(b)],.027,'#edf4eb');
    }
    c.ball(0,.21,0,.43,.43,.43,'#f5f5ee');
  } else {
    const x=zone==='F1'?-7.6:7.6;
    makeGoal(c,x,0);
    fieldLine(c,x>0?6.0:-6.0,0,.09,5.4);
    fieldLine(c,x>0?7.0:-7.0,-2.7,2.0,.09);
    fieldLine(c,x>0?7.0:-7.0, 2.7,2.0,.09);
  }
  for(const x of [-8.5,8.5])for(const z of [-5.5,5.5]){
    c.rod([x,0,z],[x,5.7,z],.12,'#6a7c91');
    c.box(x,5.8,z,1.35,.4,.75,'#dae9ee');
    for(const xx of [-.35,.35])c.ball(x+xx,5.9,z+.15,.22,.22,.22,'#f5f9e5');
  }
  for(let i=0;i<4;i++){
    c.box(-5.8+i*.45,.1,-6.0,.4,.18,.75,'#293747');
  }
  makeTree(c,-10,-8,.65);makeTree(c,10,-8,.65);
}

export function createParkZoneCommands(zoneId) {
  if (!PARK_3D_ZONES.includes(zoneId)) throw new Error(`Unknown Park 3D zone: ${zoneId}`);
  const c=new SceneCommands();
  if(zoneId==='S1')makeShelter(c);
  else if(zoneId==='S2')makeSwings(c);
  else if(zoneId==='T1')makeTreeBench(c);
  else makeField(c,zoneId);
  return c.static;
}
export function parkZoneSpec(zoneId) {
  return {
    id:zoneId,
    fixedCamera:PARK_FIXED_CAMERAS[zoneId],
    geometry:zoneId==='S1'?'shelter':zoneId==='S2'?'swings':zoneId==='T1'?'tree-bench':'soccer-pitch',
    perspective3D:true,
    detail2RasterizedFromDetail3:true,
  };
}

function actorModel(commands,actor,time,ghostRevealed=false) {
  const moving=actor.activityState==='en_route'||actor.currentActivity==='travel';
  const stride=moving?Math.sin(time*11+actor.x*.14)*.28:0;
  const x=clamp((actor.x-50)*.105,-5.3,5.3);
  // Stable z lane based on actor ID. Shared between camera renderers.
  let hash=0;for(const v of actor.id||'a')hash=(hash*31+v.charCodeAt(0))%1009;
  const z=(hash%6-2.5)*.65;
  const color=actor.color||'#b3a3c7';
  if(actor.kind==='ghost') {
    const fly=.42+Math.sin(time*2.2+hash)*.18;
    const alpha=ghostRevealed?.9:.28;
    const glow=ghostRevealed?'#d69bff':'#78defb';
    commands.ball(x,1.5+fly,z,.82,1.5,.7,glow,alpha);
    commands.ball(x,2.28+fly,z,.58,.6,.58,ghostRevealed?'#f0d5ff':'#a8f7ff',alpha+.04);
    commands.ball(x-.15,2.38+fly,z+.31,.08,.1,.08,'#102b50');
    commands.ball(x+.15,2.38+fly,z+.31,.08,.1,.08,'#102b50');
  } else if(actor.kind==='animal') {
    const role=String(actor.role||'').toLowerCase();
    const small=/squirrel/.test(role);
    const height=small?.53:.74;
    const size=small?.65:1;
    commands.ball(x,height,z,size*1.25,size*.8,size*.68,color);
    commands.ball(x+size*.52,height+size*.18,z,size*.5,size*.52,size*.58,color);
    for(const dx of [-.35,.35])for(const zz of [-.23,.23]){
      commands.rod([x+dx*size,.1,z+zz*size],[x+dx*size,height-.05+stride*.15,z+zz*size],.07*size,color);
    }
    commands.ball(x-size*.74,height+size*.5,z,size*.35,size*.9,size*.33,color);
    if(/cat/.test(role))for(const dz of [-.23,.23])commands.ball(x+size*.55,height+size*.49,z+dz*size,.17*size,.3*size,.12*size,color);
  } else {
    const child=actor.role==='child';
    const scale=child?.75:1;
    const y=.22;
    commands.ball(x,y+1.72*scale,z,.5*scale,.55*scale,.5*scale,'#f1c49b');
    commands.ball(x,y+1.9*scale,z-.075,.51*scale,.21*scale,.51*scale,'#362c34');
    commands.box(x,y+1.04*scale,z,.62*scale,.9*scale,.44*scale,color);
    for(const dx of [-.21,.21]){
      const phase=dx<0?stride:-stride;
      commands.rod([x+dx*scale,y+.67*scale,z],[x+dx*scale,y+.12*scale,z+phase],.10*scale,'#3c465a');
      commands.rod([x+dx*1.9*scale,y+1.37*scale,z],[x+dx*2*scale,y+.78*scale,z-phase*.3],.08*scale,'#e1ad88');
    }
    if(/photographer/.test(actor.role||''))commands.box(x+.52,y+1.18*scale,z+.28,.28,.26,.36,'#171e2e');
  }
}
function makeTrap(c) {
  for(let i=0;i<24;i++){
    const a=i*Math.PI*2/24,b=(i+1)*Math.PI*2/24;
    c.rod([1.2*Math.cos(a),.13,1.2*Math.sin(a)],[1.2*Math.cos(b),.13,1.2*Math.sin(b)],.05,'#66edfb');
  }
  c.box(1.5,.24,0,.65,.4,.65,'#6eeafb');
}

function shader(gl,type,source) {
  const s=gl.createShader(type); gl.shaderSource(s,source);gl.compileShader(s);
  if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));
  return s;
}
function program(gl) {
  const p=gl.createProgram();
  gl.attachShader(p,shader(gl,gl.VERTEX_SHADER,VERTEX));
  gl.attachShader(p,shader(gl,gl.FRAGMENT_SHADER,FRAGMENT));
  gl.linkProgram(p);
  if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p));
  return p;
}

export class Park3DRenderer {
  constructor(canvas,{preserveDrawingBuffer=false}={}) {
    this.canvas=canvas;
    this.gl=canvas.getContext('webgl',{antialias:true,alpha:false,preserveDrawingBuffer})
      ||canvas.getContext('experimental-webgl',{antialias:true,alpha:false,preserveDrawingBuffer});
    if(!this.gl)throw new Error('WebGL not supported');
    const gl=this.gl;
    this.program=program(gl);
    this.attributes={position:gl.getAttribLocation(this.program,'aPosition'),normal:gl.getAttribLocation(this.program,'aNormal')};
    this.uniforms=Object.fromEntries(['uMVP','uModel','uColor','uLight','uAlpha'].map(n=>[n,gl.getUniformLocation(this.program,n)]));
    this.buffers={};
    for(const [key,shape] of Object.entries(GEOMETRY)){
      const pos=gl.createBuffer(),norms=gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER,pos);gl.bufferData(gl.ARRAY_BUFFER,shape.positions,gl.STATIC_DRAW);
      gl.bindBuffer(gl.ARRAY_BUFFER,norms);gl.bufferData(gl.ARRAY_BUFFER,shape.normals,gl.STATIC_DRAW);
      this.buffers[key]={positions:pos,normals:norms,count:shape.count};
    }
    this.zoneId=null;
    this.static=[];
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);
  }
  setZone(id) {
    if(this.zoneId===id)return;
    this.zoneId=id;
    this.static=createParkZoneCommands(id);
  }
  render({zoneId,actors=[],lightsOn=true,trapActive=false,ghostRevealed=false,time=0,width,height}) {
    if(!PARK_3D_ZONES.includes(zoneId))throw new Error(`Invalid Park room ${zoneId}`);
    this.setZone(zoneId);
    const gl=this.gl;
    const dpr=clamp((typeof devicePixelRatio==='number'?devicePixelRatio:1),1,2);
    const w=Math.max(32,Math.round(width||this.canvas.clientWidth||720));
    const h=Math.max(32,Math.round(height||this.canvas.clientHeight||400));
    const pw=Math.min(1400,Math.round(w*dpr));
    const ph=Math.min(900,Math.round(h*dpr));
    if(this.canvas.width!==pw||this.canvas.height!==ph){this.canvas.width=pw;this.canvas.height=ph;}
    gl.viewport(0,0,pw,ph);
    gl.clearColor(lightsOn ? .042 : .006, lightsOn ? .096 : .012, lightsOn ? .15 : .035, 1);
    gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    const cam=PARK_FIXED_CAMERAS[zoneId];
    const vp=multiplyMatrices(perspectiveMatrix(cam.fov,pw/ph),viewMatrix(cam.eye,cam.lookAt));
    const roomCommands=new SceneCommands();
    for(const a of actors)if(a.room===zoneId)actorModel(roomCommands,a,time,ghostRevealed);
    if(trapActive)makeTrap(roomCommands);
    const all=[...this.static,...roomCommands.static,...roomCommands.transparent];
    gl.useProgram(this.program);
    for(const cmd of all){
      const mesh=this.buffers[cmd.shape];
      gl.depthMask(cmd.alpha>=1);
      gl.bindBuffer(gl.ARRAY_BUFFER,mesh.positions);
      gl.enableVertexAttribArray(this.attributes.position);
      gl.vertexAttribPointer(this.attributes.position,3,gl.FLOAT,false,0,0);
      gl.bindBuffer(gl.ARRAY_BUFFER,mesh.normals);
      gl.enableVertexAttribArray(this.attributes.normal);
      gl.vertexAttribPointer(this.attributes.normal,3,gl.FLOAT,false,0,0);
      gl.uniformMatrix4fv(this.uniforms.uMVP,false,new Float32Array(multiplyMatrices(vp,cmd.model)));
      gl.uniformMatrix4fv(this.uniforms.uModel,false,new Float32Array(cmd.model));
      gl.uniform3fv(this.uniforms.uColor,rgb(cmd.color));
      gl.uniform1f(this.uniforms.uLight,lightsOn?1:.26);
      gl.uniform1f(this.uniforms.uAlpha,cmd.alpha);
      gl.drawArrays(gl.TRIANGLES,0,mesh.count);
    }
    gl.depthMask(true);
  }
  dispose() {
    const gl=this.gl;
    for(const pair of Object.values(this.buffers)){
      gl.deleteBuffer(pair.positions);gl.deleteBuffer(pair.normals);
    }
    gl.deleteProgram(this.program);
    this.gl.getExtension('WEBGL_lose_context')?.loseContext();
  }
}
