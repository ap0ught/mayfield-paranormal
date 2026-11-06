// Mayfield Hotel is a data-only level: six floors x six map cells.
// A large suite occupies two cells but remains ONE simulation zone. Connections
// are derived from neighboring occupied cells, not from hard-coded teleport paths.

export const HOTEL_MAP_ROWS = [
  ['H601','H602','H603','H603','H605','H606'],
  ['H501','H501','H503','H504','H505','H505'],
  ['H401','H402','H403','H404','H4SPA','H4SPA'],
  ['H301','H302','H303','H304','H3POOL','H3POOL'],
  ['H2FAMILY','H2FAMILY','H203','H204','H2LAUNDRY','H2MAPS'],
  ['H1DINING','H1DINING','H1LOBBY','H1LOBBY','H1BALL','H1BALL'],
];

const definition = [
  ['H601','Room 601','601','6F','◆','#7fe4ce',true,['quiet footsteps','the wardrobe opening']],
  ['H602','Room 602','602','6F','✦','#b4a0ff',true,['water from a shower','a suitcase rolling']],
  ['H603','Presidential Suite 603–604','President','6F','♛','#ffda7d',true,['chandelier crystals rattling','soft piano music']],
  ['H605','Room 605','605','6F','✿','#f394c4',false,['an old photograph shifting','footsteps on carpet']],
  ['H606','Room 606','606','6F','⬟','#78dffd',true,['the air conditioner humming','a whispered conversation']],
  ['H501','Royal Suite 501–502','Royal Suite','5F','♜','#e9ac76',true,['a fireplace crackling','guests laughing quietly']],
  ['H503','Room 503','503','5F','◈','#93e79c',false,['a dresser drawer sliding','rain against a window']],
  ['H504','Room 504','504','5F','◇','#e5b2f7',true,['television playing softly','suitcase wheels']],
  ['H505','Garden Suite 505–506','Garden Suite','5F','❀','#65e2a9',true,['fountain water splashing','leaves brushing the window']],
  ['H401','Room 401','401','4F','✧','#dba3f9',true,['someone closing a book','a floorboard creaking']],
  ['H402','Room 402','402','4F','☾','#7daaff',false,['the curtains moving','a distant footstep']],
  ['H403','Room 403','403','4F','✪','#ffb580',true,['the telephone ringing','a lamp clicking']],
  ['H404','Room 404','404','4F','⊕','#a0f5e3',true,['papers rustling','quiet conversation']],
  ['H4SPA','Spa and Wellness','Spa','4F','☀','#84eff8',true,['water bubbling in the spa','soft music playing']],
  ['H301','Room 301','301','3F','◉','#ffe07c',true,['shoes across the rug','the window rattling']],
  ['H302','Room 302','302','3F','♧','#83dfb0',false,['a low hum','the closet door moving']],
  ['H303','Room 303','303','3F','♢','#e2a1ec',true,['a tap running','someone humming']],
  ['H304','Room 304','304','3F','✶','#e9b38c',true,['a bed frame creaking','a knock at the door']],
  ['H3POOL','Indoor Pool','Pool','3F','≈','#62dff9',true,['swimmers splashing','pool filtration running']],
  ['H2FAMILY','Family Suite 201–202','Family Suite','2F','⌂','#edbf90',true,['children playing','the living-room television']],
  ['H203','Room 203','203','2F','✣','#b78efa',true,['a lamp clicking','a quiet conversation']],
  ['H204','Room 204','204','2F','◐','#8ecbe7',false,['a guest walking to the door','a picture frame tapping']],
  ['H2LAUNDRY','Hotel Laundry','Laundry','2F','◎','#65e8f7',true,['washers spinning','dryers rumbling','linen carts rattling']],
  ['H2MAPS','Travel & Concierge Maps','Concierge','2F','⌖','#efd275',true,['travelers asking directions','a map unfurling']],
  ['H1DINING','Restaurant & Bar','Restaurant','1F','♨','#f8bb78',true,['dishes clinking','diners talking','a serving cart rolling']],
  ['H1LOBBY','Reception & Lobby','Lobby','1F','▤','#7dd6ff',true,['front desk bell','a trolley rolling','guests checking in']],
  ['H1BALL','Grand Ballroom','Ballroom','1F','♫','#e69cef',true,['dancers crossing the floor','chandeliers chiming','distant music']],
];

export const HOTEL_ROOMS = definition.map(([id,name,short,floor,glyph,color,light,ambient])=>({
  id,name,short,floor,glyph,color,light,ambient,image:`hotel_${id.toLowerCase()}`,
  spanCells:HOTEL_MAP_ROWS.flat().filter(cell=>cell===id).length,
  links:[],
}));
const roomById = Object.fromEntries(HOTEL_ROOMS.map(room=>[room.id,room]));
for (let row=0;row<6;row++) for(let col=0;col<6;col++) {
  const current=HOTEL_MAP_ROWS[row][col];
  for(const [dr,dc] of [[1,0],[-1,0],[0,1],[0,-1]]) {
    const r=row+dr,c=col+dc;
    if(r<0 || r>=6 || c<0 || c>=6)continue;
    const neighbor=HOTEL_MAP_ROWS[r][c];
    if(neighbor!==current && !roomById[current].links.includes(neighbor)) roomById[current].links.push(neighbor);
  }
}

const toolItems = [
  {name:'Ghost Trap',icon:'◎',count:3,color:'#70eff8',details:'Contain a visible spirit in the selected live hotel camera.'},
  {name:'EMF Reader',icon:'▥',count:1,color:'#92b7ff',details:'Check unusual readings in rooms, suites and hotel amenities.'},
  {name:'Spirit Lantern',icon:'♨',count:2,color:'#ffd075',details:'Reveal spirits in an unlit room.'},
  {name:'Binding Tome',icon:'▤',count:1,color:'#c68cff',details:'Review clues about haunted suites and hallways.'},
  {name:'Audio Recorder',icon:'◉',count:1,color:'#d0e2f2',details:'Record audio from the selected unmuted hotel room.'},
  {name:'Ectoplasm Jar',icon:'▣',count:0,color:'#c8e1f2',details:'A container for residual ghost evidence.'},
];

export const HOTEL_LEVEL = {
  id:'hotel', title:'The Grand Mayfield Hotel',subtitle:'SIX-FLOOR PARANORMAL INVESTIGATION',roof:'♛ ★ ★ ★ ★ ♛',
  mapBackground:'hotel_map',mapRows:6,mapColumns:6, cameraRows:2,cameraColumns:3,
  // The building art has a sign and architectural border above the six floors.
  mapOverlay:{left:'5%',top:'12%',width:'90%',height:'77%'},
  mapLabel:'HOTEL · 6×6 LIVE',detail1Name:'Hotel map (6×6)',detail2Name:'6 feeds (2×3)',detail3Name:'Live suite',
  mapDriveLabel:'HOTEL ENTRY',mapTip:'6 floors · larger suites span 2 map cells · tap to inspect',
  mapFooterKind:'ACTORS',mapFooterLitTotal:HOTEL_ROOMS.length,activityLabel:'HOTEL ACTIVITY',
  mapsButtonCopy:'Six floors with 36 map cells. Some suites and amenities occupy two cells, but are one walkable zone; six miniature camera feeds are monitored below.',
  mapsButtonTarget:'H1LOBBY',mapsButtonLabel:'Inspect the hotel lobby',
  helpTitle:'Investigate the Grand Mayfield Hotel',
  helpSteps:[
    'The hotel map shows 36 cells across six floors. Multi-cell suites share one simulation ID, one light state, and one camera source.',
    'The six stop-motion cameras are arranged 2×3. Every zone shares actor positions and audio with the large live Detail 3 view.',
    'Permanent staff and security remain all day. Visiting hotel guests enter, roam through connected rooms and eventually leave.',
    'Investigate the laundry, indoor pool, and grand ballroom, listen to a story and capture a ghost to complete all five missions.',
    'A 60-second Detail 3 timer is separate from the full simulated day. Zero focus or day end before completion means game over.',
  ],
  rooms:HOTEL_ROOMS,mapCells:HOTEL_MAP_ROWS.flat(),roomById,
  defaultSelected:'H603',defaultCameras:['H1LOBBY','H3POOL','H603','H2LAUNDRY','H1BALL','H505'],
  initialMuted:{H606:true,H402:true},dayDurationSeconds:420,
  objectives:[
    {id:'inspect-laundry',label:'Inspect hotel laundry',hint:'Open the hotel laundry camera on floor two.',eventType:'inspect',room:'H2LAUNDRY'},
    {id:'inspect-pool',label:'Inspect the indoor pool',hint:'Watch the indoor pool on floor three.',eventType:'inspect',room:'H3POOL'},
    {id:'inspect-ballroom',label:'Inspect the grand ballroom',hint:'Open the grand ballroom camera on the lobby floor.',eventType:'inspect',room:'H1BALL'},
    {id:'hotel-story',label:'Listen to a hotel story',hint:'Listen to a story from the far-right ticker when its room is unmuted.',eventType:'listen_story'},
    {id:'capture-hotel-ghost',label:'Trap a hotel ghost',hint:'Select a haunted suite or ballroom and activate Ghost Trap.',eventType:'capture_ghost'},
  ],
  randomAnimals:[],
  initialActors:[
    {id:'hotel-manager',name:'Mara',kind:'human',stay:'resident',role:'hotel manager',color:'#70c9ff',room:'H1LOBBY',x:45,dir:1,speed:2.5,route:['H1LOBBY','H203','H1LOBBY','H1DINING','H1LOBBY']},
    {id:'hotel-concierge',name:'Arlo',kind:'human',stay:'resident',role:'concierge',color:'#efbd85',room:'H2MAPS',x:60,dir:-1,speed:2.3,route:['H2MAPS','H2LAUNDRY','H204','H2LAUNDRY','H2MAPS']},
    {id:'hotel-housekeeper',name:'Nia',kind:'human',stay:'resident',role:'housekeeper',color:'#b5eaa0',room:'H2LAUNDRY',x:25,dir:1,speed:2.7,route:['H2LAUNDRY','H204','H203','H2FAMILY','H203','H204','H2LAUNDRY']},
    {id:'hotel-guard',name:'Ezra',kind:'human',stay:'resident',role:'security guard',color:'#9da7ff',room:'H1BALL',x:72,dir:-1,speed:2.3,route:['H1BALL','H1LOBBY','H203','H204','H2LAUNDRY','H2MAPS','H2LAUNDRY','H204','H203','H1LOBBY','H1BALL']},
    {id:'hotel-lifeguard',name:'Sofia',kind:'human',stay:'resident',role:'pool attendant',color:'#71d7de',room:'H3POOL',x:40,dir:1,speed:1.9,route:['H3POOL','H304','H3POOL']},
    {id:'suite-spirit',name:'The Pearl Duchess',kind:'ghost',stay:'resident',role:'presidential suite ghost',color:'#b8f8ff',room:'H603',x:76,dir:-1,speed:1.6,route:['H603','H602','H603']},
    {id:'ballroom-spirit',name:'The Last Dancer',kind:'ghost',stay:'resident',role:'ballroom ghost',color:'#cab5ff',room:'H1BALL',x:62,dir:1,speed:1.1,route:['H1BALL','H1LOBBY','H1BALL']},
  ],
  guestVisits:[
    {id:'arriving-guests',startTick:12,repeatEvery:160,members:[
      {id:'hotel-guest-a',name:'Ruth',kind:'human',stay:'guest',role:'hotel guest',color:'#ff9fc6',room:'H1LOBBY',x:15,dir:1,speed:3.1,route:['H1LOBBY','H203','H2FAMILY','H203','H1LOBBY']},
      {id:'hotel-guest-b',name:'Luis',kind:'human',stay:'guest',role:'hotel guest',color:'#ffcc8c',room:'H1LOBBY',x:23,dir:1,speed:2.8,route:['H1LOBBY','H203','H2FAMILY','H203','H1LOBBY']},
    ]},
    {id:'spa-day',startTick:48,repeatEvery:195,members:[
      {id:'spa-visitor',name:'Iris',kind:'human',stay:'guest',role:'spa guest',color:'#ec9bfa',room:'H1LOBBY',x:20,dir:1,speed:2.8,route:['H1LOBBY','H203','H303','H403','H404','H4SPA','H404','H403','H303','H203','H1LOBBY']},
    ]},
    {id:'banquet-visitor',startTick:72,repeatEvery:205,members:[
      {id:'ballroom-visitor',name:'Tariq',kind:'human',stay:'guest',role:'ballroom guest',color:'#8ef1a7',room:'H1LOBBY',x:12,dir:1,speed:2.8,route:['H1LOBBY','H1BALL','H1LOBBY']},
    ]},
  ],
  mainConversations:[
    {from:'Mara (Manager)',to:'Arlo (Concierge)',a:'There was a guest in the presidential suite long after checkout.',b:'The registry says nobody has booked that suite in weeks.'},
    {from:'Nia (Housekeeper)',to:'Sofia (Pool)',a:'I heard a ballroom waltz playing with the doors locked.',b:'I heard it echo through the pool water.'},
    {from:'Ruth (Guest)',to:'Mara (Manager)',a:'The mirror showed someone standing behind me.',b:'We will check the cameras and make sure you are safe.'},
  ],
  storyEvents:[
    {id:'hotel-suite-story',room:'H603',who:'Mara',text:'The Pearl Duchess always requests room six-oh-three, but no one has ever checked her in.',reward:4},
    {id:'hotel-ballroom-story',room:'H1BALL',who:'Ezra',text:'The ballroom is empty but the security camera shows a final dance every night.',reward:4},
    {id:'hotel-laundry-story',room:'H2LAUNDRY',who:'Nia',text:'An extra set of antique sheets appeared in the laundry cart, folded perfectly.',reward:4},
  ],
  startLogEntries:[
    {room:'H1LOBBY',kind:'ambient',text:'The lobby bell rings twice.'},
    {room:'H2LAUNDRY',kind:'ambient',text:'Linen carts rumble past the washing machines.'},
    {room:'H3POOL',kind:'ambient',text:'A splash echoes in the indoor pool.'},
    {room:'H603',kind:'ghost',text:'A spectral voice calls from the presidential suite.'},
  ],
  toolItems,
};
