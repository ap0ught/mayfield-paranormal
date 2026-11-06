/**
 * Agent handoff example — a future farm level whose FIELD alone is a 3×3 grid.
 * This file is an example, NOT registered in LEVELS until a developer chooses to.
 * See docs/AGENT_NEW_LEVEL_FARM.md for required art and registration steps.
 */
const grid = [
  ['F11','F12','F13'],
  ['F21','F22','F23'],
  ['F31','F32','F33'],
];

const zones=grid.flat().map((id,index)=>({
  id,
  name:`Field Sector ${id.slice(1)}`,
  short:`Sector ${id.slice(1)}`,
  floor:'FIELD',
  image:`farm_${id.toLowerCase()}`,
  glyph:['✿','◈','★','☼','◎','✧','☘','♢','✪'][index],
  color:['#a6ec80','#e6d56e','#83c4f1','#a6e78f','#f5db77','#edc482','#89d4a6','#e9a4ce','#c4abff'][index],
  light: true,
  ambient:['crickets in the crops','a breeze rustling the wheat','the irrigation pump humming'],
  links:[],
}));
const byId=Object.fromEntries(zones.map(room=>[room.id,room]));
for (let row=0;row<3;row++) for(let col=0;col<3;col++) {
  const id=grid[row][col];
  for(const [dy,dx] of [[1,0],[-1,0],[0,1],[0,-1]]) {
    const r=row+dy,c=col+dx;
    if(r>=0&&r<3&&c>=0&&c<3) byId[id].links.push(grid[r][c]);
  }
}

export const FARM_LEVEL_EXAMPLE = {
  id:'farm',title:'Mayfield Farm',subtitle:'FIELD INVESTIGATION · AGENT EXAMPLE',roof:'🌾 🌾 🌾',
  mapRows:3,mapColumns:3,cameraRows:2,cameraColumns:2,
  mapBackground:'farm_field_map',mapLabel:'FARM FIELD · LIVE',
  detail1Name:'Standalone 3×3 field',detail2Name:'4 feeds (2×2)',detail3Name:'Live field',
  mapDriveLabel:'FARM TRACK (OUTSIDE THE FIELD GRID)',
  mapTip:'The entire 3×3 map is one isolated field — no farmhouse or barn cells',
  mapFooterKind:'ACTORS',mapFooterLitTotal:9,activityLabel:'FARM FIELD ACTIVITY',
  mapsButtonCopy:'Nine neighboring sectors make up the field only. Other farm structures are not part of this 3×3 map.',
  mapsButtonTarget:'F22',mapsButtonLabel:'Inspect center of field',
  helpTitle:'Investigate Mayfield Farm',
  helpSteps:[
    'The field occupies exactly nine cells in a standalone 3×3 grid. A farmhouse and barn may be decorative outside this grid.',
    'Select one of the sectors to open the 60-second live camera, or cycle the four stop-motion cameras.',
    'The farmhand and scarecrow ghost are residents; visiting hikers and a randomized rabbit can be temporary guests.',
    'Unmuted field audio and story clues refill focus, and capturing the scarecrow ghost gives magenta focus.',
    'Win by completing all five objectives; lose when the day or focus expires.',
  ],
  rooms:zones,mapCells:grid.flat(),roomById:byId,
  defaultSelected:'F22',defaultCameras:['F11','F22','F23','F33'],
  initialMuted:{F31:true},dayDurationSeconds:360,
  objectives:[
    {id:'farm-center',label:'Inspect the center field',hint:'Open sector F22.',eventType:'inspect',room:'F22'},
    {id:'farm-corner',label:'Inspect the northeast field',hint:'Open sector F13.',eventType:'inspect',room:'F13'},
    {id:'farm-story',label:'Hear the scarecrow story',hint:'Listen to a story while the room is unmuted.',eventType:'listen_story'},
    {id:'farm-record',label:'Record a strange field sound',hint:'Use Audio Recorder.',eventType:'audio_recorded'},
    {id:'farm-capture',label:'Capture the field ghost',hint:'Trap the scarecrow ghost.',eventType:'capture_ghost'},
  ],
  randomAnimals:[
    {id:'farm-rabbit',name:'Pip',kind:'animal',role:'rabbit',color:'#e7caac',room:'F31',x:20,dir:1,speed:2.7,route:['F31','F32','F33','F32','F31'],guestStartTick:14},
  ],
  initialActors:[
    {id:'farmhand',name:'Rowan',kind:'human',stay:'resident',role:'farmhand',color:'#9acbff',room:'F11',x:30,dir:1,speed:2.6,route:['F11','F12','F22','F21','F11']},
    {id:'scarecrow',name:'The Night Scarecrow',kind:'ghost',stay:'resident',role:'field spirit',color:'#c6a6f9',room:'F33',x:74,dir:-1,speed:1.6,route:['F33','F32','F33']},
  ],
  guestVisits:[
    {id:'farm-visitors',startTick:22,repeatEvery:170,members:[
      {id:'visitor',name:'Avery',kind:'human',stay:'guest',role:'farm visitor',color:'#ffbd8b',room:'F11',x:15,dir:1,speed:3.2,route:['F11','F12','F13','F23','F22','F12','F11']},
    ]},
  ],
  mainConversations:[
    {from:'Rowan (Farmhand)',to:'Avery (Visitor)',a:'The scarecrow moved into the wrong row last night.',b:'I heard footsteps in the wheat, but nobody was there.'},
  ],
  storyEvents:[
    {id:'scarecrow-story',room:'F22',who:'Rowan',text:'Every time the scarecrow disappears, the irrigation pump turns itself on.',reward:4},
  ],
  startLogEntries:[
    {room:'F11',kind:'ambient',text:'Wind through the first row of wheat.'},
    {room:'F33',kind:'ghost',text:'An empty voice whispers from the scarecrow.'},
  ],
  toolItems:[
    {name:'Ghost Trap',icon:'◎',count:2,color:'#70eff8',details:'Capture a ghost in the field.'},
    {name:'EMF Reader',icon:'▥',count:1,color:'#92b7ff',details:'Read paranormal electromagnetic signals.'},
    {name:'Spirit Lantern',icon:'♨',count:1,color:'#ffd075',details:'Reveal a hidden field spirit.'},
    {name:'Binding Tome',icon:'▤',count:1,color:'#c68cff',details:'Review spectral field evidence.'},
    {name:'Audio Recorder',icon:'◉',count:1,color:'#d0e2f2',details:'Record a strange sound from a field sector.'},
    {name:'Ectoplasm Jar',icon:'▣',count:0,color:'#c8e1f2',details:'A container for future ectoplasm finds.'},
  ],
};
