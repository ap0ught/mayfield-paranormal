const HOUSE_ROOMS = [
  { id: '2A', name: 'Master Bedroom', short: 'Master', floor: '2F', image: 'master', glyph: '♛', color: '#f781d9', light: false, links: ['2B','1A'], ambient: ['a soft footstep by the bed', 'a dresser drawer sliding', 'fabric rustling'] },
  { id: '2B', name: 'Upstairs Bathroom', short: 'Bath', floor: '2F', image: 'bath', glyph: '✚', color: '#75ecf3', light: true, links: ['2A','2C','1B'], ambient: ['water dripping in the sink', 'a tap turning', 'the bathroom fan humming'] },
  { id: '2C', name: "Child\'s Bedroom", short: "Child\'s Room", floor: '2F', image: 'kids', glyph: '★', color: '#ffd267', light: true, links: ['2B','1C'], ambient: ['a music box chiming', 'toys shifting', 'faint footsteps upstairs'] },
  { id: '1A', name: 'Living Room', short: 'Living', floor: '1F', image: 'living', glyph: '◆', color: '#70ed7e', light: true, links: ['1B','2A','B1'], ambient: ['the television playing', 'footsteps across the rug', 'a chair creaking'] },
  { id: '1B', name: 'Dining Room', short: 'Dining', floor: '1F', image: 'dining-clean', glyph: '◈', color: '#ff82d6', light: true, links: ['1A','1C','2B','B2'], ambient: ['dishes clinking', 'conversation at the table', 'the grandfather clock ticking'], ghostPos: { left: '81%', top: '24%' } },
  { id: '1C', name: 'Home Office', short: 'Office', floor: '1F', image: 'study', glyph: '⬡', color: '#7ea9ff', light: false, links: ['1B','2C','B3'], ambient: ['keyboard tapping', 'paper rustling', 'a desk lamp clicking'] },
  { id: 'B1', name: 'Utility Room', short: 'Utility', floor: 'B', image: 'utility', glyph: '⚙', color: '#feb872', light: false, links: ['B2','1A'], ambient: ['a pipe knocking', 'the furnace starting', 'tools clinking'] },
  { id: 'B2', name: 'Laundry Room', short: 'Laundry', floor: 'B', image: 'laundry', glyph: '◎', color: '#63e4f2', light: true, links: ['B1','B3','1B'], ambient: ['the washer spinning', 'water running', 'the dryer thumping'] },
  { id: 'B3', name: 'Basement Storage', short: 'Storage', floor: 'B', image: 'storage', glyph: '▣', color: '#cbf07d', light: false, links: ['B2','1C'], ambient: ['a cardboard box sliding', 'a loose vent rattling', 'the floorboards groaning'] },
];

const HOUSE_LEVEL = {
  id: 'house',
  title: 'The Mayfield House',
  subtitle: 'RESIDENCE INVESTIGATION',
  roof: '♜ ♜ ♜',
  mapBackground: 'house',
  mapLabel: 'HOUSE MAP · LIVE',
  detail1Name: 'House map',
  detail2Name: '4 rooms (2×2)',
  detail3Name: 'Live view',
  mapDriveLabel: 'DRIVEWAY',
  mapTip: 'Click a room to inspect · click the light icon to switch it',
  mapFooterKind: 'ACTORS',
  mapFooterLitTotal: 9,
  activityLabel: 'HOUSE ACTIVITY',
  mapsButtonCopy: 'Three floors, three rooms each. Basement rooms are fully simulated. Select any room on the map to open a live inspection.',
  mapsButtonTarget: 'B2',
  mapsButtonLabel: 'Open basement laundry',
  helpTitle: 'Investigate the Mayfield House',
  helpSteps: [
    'Click any room on the 3×3 house map or one of the four stop-motion cameras to open a full live view.',
    'A live inspection lasts 60 seconds. Watching consumes focus. Turn room lights on and off with the light control.',
    'Use the speaker icon beside a camera to mute or unmute its sounds. The Sound panel aggregates every unmuted room.',
    'Click a story in the ticker to listen and restore gold focus, or capture a ghost using the trap to restore magenta focus.',
    'Cat residency is rolled on each new game. Guests enter, follow their route, then leave. Finish all five objectives before the day ends or your focus runs out.',
  ],
  rooms: HOUSE_ROOMS,
  mapCells: ['2A','2B','2C','1A','1B','1C','B1','B2','B3'],
  defaultSelected: '1B',
  defaultCameras: ['1A', '2A', 'B2', '2C'],
  initialMuted: {'2A':true, '1C':true, 'B3':true},
  dayDurationSeconds: 300,
  objectives: [
    {id:'inspect-laundry', label:'Inspect basement laundry', hint:'Select the B2 laundry camera.', eventType:'inspect', room:'B2'},
    {id:'inspect-bedroom', label:'Inspect the child’s bedroom', hint:'Select the 2C camera upstairs.', eventType:'inspect', room:'2C'},
    {id:'hear-story', label:'Hear a resident story', hint:'Listen to a story in the ticker while its room is unmuted.', eventType:'listen_story'},
    {id:'record-sound', label:'Record an audio clue', hint:'Use Audio Recorder in a room with an unmuted sound.', eventType:'audio_recorded'},
    {id:'capture-ghost', label:'Capture one ghost', hint:'Open a room containing a ghost, then use Ghost Trap.', eventType:'capture_ghost'},
  ],
  randomAnimals: [
    {id:'mittens',name:'Mittens',kind:'animal',role:'cat',color:'#ebc07e',room:'1A',x:76,dir:-1,speed:2.2,route:['1A','1B','1C','1B'],guestStartTick:8},
  ],
  initialActors: [
    { id: 'charles', name: 'Charles', kind: 'human', stay: 'resident', role: 'homeowner', color: '#4dc4ff', room: '1B', x:36, dir:1, speed:3.2, route:['1B','1A','1B','B2','1B','1C'] },
    { id: 'elinor', name: 'Elinor', kind: 'human', stay: 'resident', role: 'parent', color: '#f69ad0', room: '1B', x:61, dir:-1, speed:2.5, route:['1B','1C','1B','2B','2A','2B'] },
    { id: 'june', name: 'June', kind: 'human', stay: 'resident', role: 'child', color: '#ffc65c', room: '1A', x:43, dir:1, speed:3.1, route:['1A','2A','2B','2C','2B','2A'] },
    { id: 'sam', name: 'Sam', kind: 'human', stay: 'resident', role: 'family member', color: '#8ef1a1', room: 'B2', x:28, dir:1, speed:3.5, route:['B2','B1','B2','1B','1A','1B'] },
    { id: 'blue-lady', name: 'The Blue Lady', kind: 'ghost', stay: 'resident', role: 'house spirit', color: '#8defff', room: '1B', x:79, dir:-1, speed:1.5, route:['1B','1A','1B'] },
    { id: 'music-box', name: 'The Humming Child', kind: 'ghost', stay: 'resident', role: 'music-box spirit', color: '#a9c8ff', room: '2C', x:66, dir:1, speed:1.5, route:['2C','2B','2C'] },
  ],
  guestVisits: [
    { id:'delivery-visit', startTick:12, repeatEvery:230, members:[
      {id:'delivery-driver',name:'Delivery Driver',kind:'human',stay:'guest',role:'courier',color:'#ffcc79',room:'1A',x:12,dir:1,speed:5.3,route:['1A','1B','1A']},
    ]},
    { id:'neighbor-visit', startTick:45, repeatEvery:260, members:[
      {id:'neighbor',name:'Neighbor',kind:'human',stay:'guest',role:'neighbor visiting',color:'#a8bdff',room:'1A',x:14,dir:1,speed:4.8,route:['1A','1B','1A']},
      {id:'neighbor-dog',name:'Scout',kind:'animal',stay:'guest',role:'pet dog',color:'#f2b982',room:'1A',x:24,dir:1,speed:4.8,route:['1A','1B','1A']},
    ]},
    { id:'passing-spirit', startTick:95, repeatEvery:240, members:[
      {id:'hallway-wisp',name:'Passing Spirit',kind:'ghost',stay:'guest',role:'wandering apparition',color:'#91f4fc',room:'B3',x:13,dir:1,speed:5.5,route:['B3','B2','B3']},
    ]},
  ],
  mainConversations: [
    {from:'Charles', to:'Elinor', a:'I still think we heard someone upstairs last night…', b:'I know. It wasn’t the house settling. It sounded like footsteps.'},
    {from:'Elinor', to:'Charles', a:'Why did the music stop when I opened the door?', b:'I didn’t even know that music box worked.'},
    {from:'June', to:'Sam', a:'There’s somebody standing by the old wardrobe.', b:'Don’t move. I’ll go get the flashlight.'},
  ],
  storyEvents: [
    { id: 'storm', room: '1B', who: 'Charles', text: 'When the lights flickered last night, I heard someone on the stairs. But the stairs were empty.', reward: 4 },
    { id: 'music', room: '2C', who: 'June', text: 'Grandma used to wind this music box. It started playing by itself after she passed.', reward: 4 },
    { id: 'basement', room: 'B2', who: 'Sam', text: 'The washer door opened on its own. Someone was singing just behind me.', reward: 4 },
    { id: 'portrait', room: '1A', who: 'Elinor', text: 'The woman in the family portrait keeps showing up in the television reflection.', reward: 4 },
  ],
  startLogEntries: [
    {room:'2C',kind:'ghost',text:'A music box plays without anyone touching it.'},
    {room:'1A',kind:'ambient',text:'Television playing in living room.'},
    {room:'B2',kind:'ambient',text:'Washer spinning and pipes knocking.'},
    {room:'1B',kind:'story',text:'Charles: I heard someone upstairs last night…'},
  ],
  toolItems: [
    { name: 'Ghost Trap', icon: '◎', count: 2, color: '#70eff8', details: 'A rune-bound device that attracts and contains a nearby ghost. Select a haunted live room, then activate it.' },
    { name: 'EMF Reader', icon: '▥', count: 1, color: '#92b7ff', details: 'Detects unnatural energy in the selected room.' },
    { name: 'Spirit Lantern', icon: '♨', count: 2, color: '#ffd075', details: 'Reveals a ghost hidden in a dark room.' },
    { name: 'Binding Tome', icon: '▤', count: 1, color: '#c68cff', details: 'Records clues and weakens an identified spirit.' },
    { name: 'Audio Recorder', icon: '◉', count: 1, color: '#d0e2f2', details: 'Stores a selected sound as evidence.' },
    { name: 'Ectoplasm Jar', icon: '▣', count: 0, color: '#c8e1f2', details: 'A container for residual paranormal evidence.' },
  ],
};

const PARK_ROOMS = [
  { id: 'S1', name: 'Park Shelter', short: 'Shelter', floor: 'PARK', image: 'park_shelter', glyph: '▤', color: '#df7dff', light: true, links: ['S2','F2','F1'], ambient: ['murmured conversation under the shelter', 'a lantern buzzing softly', 'rainwater dripping from the shelter roof'], ghostPos: { left: '70%', top: '24%' } },
  { id: 'S2', name: 'Playground Swings', short: 'Swings', floor: 'PARK', image: 'park_swings', glyph: '◫', color: '#ffd554', light: true, links: ['S1','T1','F2'], ambient: ['chains squeaking on the swings', 'rubber mulch crunching', 'the slide rattling lightly'] },
  { id: 'T1', name: 'Tree Bench', short: 'Tree', floor: 'PARK', image: 'park_treebench', glyph: '✿', color: '#77ed89', light: true, links: ['S2','F3'], ambient: ['leaves rustling overhead', 'someone sitting on the bench', 'night insects humming'] },
  { id: 'F1', name: 'Soccer Field A', short: 'Field A', floor: 'FIELD', image: 'park_field', glyph: '◉', color: '#5deeff', light: true, links: ['F2','S1'], ambient: ['a soccer ball rolling across wet grass', 'players calling for a pass', 'cleats skidding on the turf'] },
  { id: 'F2', name: 'Soccer Field B', short: 'Field B', floor: 'FIELD', image: 'park_field', glyph: '⬢', color: '#ff76df', light: true, links: ['F1','F3','S1','S2'], ambient: ['the referee whistle blowing', 'spectators clapping', 'the center field chatter carrying on the wind'] },
  { id: 'F3', name: 'Soccer Field C', short: 'Field C', floor: 'FIELD', image: 'park_field', glyph: '◌', color: '#ffdf66', light: true, links: ['F2','T1'], ambient: ['goal netting shaking', 'players jogging back into position', 'stadium lights buzzing overhead'] },
];

const PARK_LEVEL = {
  id: 'park',
  title: 'Mayfield Park',
  subtitle: 'PARK INVESTIGATION · DRY TEST',
  roof: '🌳 🌳 🌳',
  mapBackground: 'park_map',
  mapLabel: 'PARK MAP · LIVE',
  detail1Name: 'Park map',
  detail2Name: '4 zones (2×2)',
  detail3Name: 'Live view',
  mapDriveLabel: 'PARKING / ENTRY',
  mapTip: 'Six active park zones · the bottom row shows outside / parking / driveway',
  mapFooterKind: 'ACTORS',
  mapFooterLitTotal: 6,
  activityLabel: 'PARK ACTIVITY',
  mapsButtonCopy: 'The park level uses six active zones in the same framework: shelter, swings, tree bench, and three connected field sectors.',
  mapsButtonTarget: 'S1',
  mapsButtonLabel: 'Open park shelter',
  helpTitle: 'Investigate Mayfield Park',
  helpSteps: [
    'Use the 3×3 park map to inspect the six active zones: shelter, swings, tree bench, and the three field sectors.',
    'The bottom row of the map shows the outside edge, parking, and driveway / entry, while the 2×2 camera wall gives stop-motion updates.',
    'Listen for story points from investigators and park visitors. Unmuted rooms contribute to the central sound feed.',
    'Trap ghosts to replenish magenta focus. Story moments replenish gold focus.',
    'The cat and squirrel independently roll resident or guest status at the start. Complete all five objectives before the day ends or focus runs out.',
  ],
  rooms: PARK_ROOMS,
  mapCells: ['S1','S2','T1','F1','F2','F3',{ filler: true, label: 'PARK', icon: '🌲' },{ filler: true, label: 'PARKING', icon: '🅿' },{ filler: true, label: 'ENTRY', icon: '🚙' }],
  defaultSelected: 'S1',
  defaultCameras: ['F2', 'S2', 'S1', 'T1'],
  initialMuted: {'F3':true, 'T1':true},
  dayDurationSeconds: 300,
  objectives: [
    {id:'inspect-swings', label:'Inspect the playground swings', hint:'Select S2 on the park map.', eventType:'inspect', room:'S2'},
    {id:'inspect-field', label:'Watch the center soccer field', hint:'Select F2 on the park map.', eventType:'inspect', room:'F2'},
    {id:'hear-story', label:'Hear a park visitor’s story', hint:'Listen to a story in an unmuted park zone.', eventType:'listen_story'},
    {id:'scan-ghost', label:'Find a paranormal EMF spike', hint:'Use the EMF reader in a zone occupied by a ghost.', eventType:'emf_scan_ghost'},
    {id:'capture-ghost', label:'Capture a park ghost', hint:'Open a haunted park zone and activate Ghost Trap.', eventType:'capture_ghost'},
  ],
  randomAnimals: [
    {id:'park-cat',name:'Whiskers',kind:'animal',role:'cat',color:'#edbf80',room:'T1',x:72,dir:-1,speed:2.5,route:['T1','S2','S1','S2','T1'],guestStartTick:8},
    {id:'park-squirrel',name:'Acorn',kind:'animal',role:'squirrel',color:'#c99b5b',room:'T1',x:35,dir:1,speed:3.6,route:['T1','S2','T1'],guestStartTick:14},
  ],
  initialActors: [
    { id:'ranger',name:'Ranger',kind:'human',stay:'resident',role:'park ranger',color:'#4dc4ff',room:'S1',x:26,dir:1,speed:2.6,route:['S1','F2','F1','F2','S2'] },
    { id:'coach',name:'Coach',kind:'human',stay:'resident',role:'soccer coach',color:'#f69ad0',room:'S1',x:64,dir:-1,speed:2.4,route:['S1','S2','T1','S2','S1'] },
    { id:'player',name:'Player',kind:'human',stay:'resident',role:'soccer player',color:'#ffc65c',room:'F2',x:42,dir:1,speed:3.0,route:['F2','F1','F2','F3','T1','F3'] },
    { id:'photo-mom',name:'Maya',kind:'human',stay:'resident',role:'photographer / parent',color:'#8ef1a1',room:'F1',x:25,dir:1,speed:3.0,route:['F1','F2','F3','F2'] },
    { id:'park-dog',name:'Patches',kind:'animal',stay:'resident',role:'park dog',color:'#e2aa79',room:'T1',x:70,dir:-1,speed:3.2,route:['T1','S2','T1'] },
    { id:'tree-line',name:'The Tree-Line Watcher',kind:'ghost',stay:'resident',role:'tree spirit',color:'#8defff',room:'T1',x:72,dir:-1,speed:1.5,route:['T1','S2','T1'] },
    { id:'midfield-echo',name:'The Midfield Echo',kind:'ghost',stay:'resident',role:'field spirit',color:'#a9c8ff',room:'F2',x:65,dir:1,speed:1.7,route:['F2','F1','F2','F3'] },
  ],
  guestVisits: [
    { id:'press-photographer',startTick:12,repeatEvery:230,members:[
      {id:'quick-photog',name:'Alex',kind:'human',stay:'guest',role:'photographer',color:'#75e3ef',room:'S1',x:12,dir:1,speed:5.5,route:['S1','F1','F2','F1','S1']},
    ]},
    { id:'family-playdate',startTick:36,repeatEvery:260,members:[
      {id:'visiting-mom',name:'Dana',kind:'human',stay:'guest',role:'parent',color:'#fb8fb4',room:'S1',x:10,dir:1,speed:5.6,route:['S1','S2','T1','S2','S1']},
      {id:'child-ivy',name:'Ivy',kind:'human',stay:'guest',role:'child',color:'#fdcb76',room:'S1',x:17,dir:1,speed:5.6,route:['S1','S2','T1','S2','S1']},
      {id:'child-noah',name:'Noah',kind:'human',stay:'guest',role:'child',color:'#87afff',room:'S1',x:24,dir:1,speed:5.6,route:['S1','S2','T1','S2','S1']},
      {id:'family-dog',name:'Buddy',kind:'animal',stay:'guest',role:'pet dog',color:'#f7ad79',room:'S1',x:32,dir:1,speed:5.6,route:['S1','S2','T1','S2','S1']},
    ]},
    { id:'park-wisp',startTick:110,repeatEvery:250,members:[
      {id:'transient-spirit',name:'Passing Specter',kind:'ghost',stay:'guest',role:'wandering ghost',color:'#b5a1ff',room:'T1',x:14,dir:1,speed:5.2,route:['T1','F3','F2','S1']},
    ]},
  ],
  mainConversations: [
    {from:'Ranger', to:'Coach', a:'There it is again — something just moved past the tree line…', b:'That’s the third time. Let’s keep the trap running and check Field B.'},
    {from:'Player', to:'Maya', a:'I heard someone whisper from the swings, but nobody was there.', b:'The lights on the field dipped when the whistle blew.'},
    {from:'Coach', to:'Ranger', a:'The shelter microphones keep picking up voices after everyone stops talking.', b:'If the ghost crosses the field again, we’ll catch it on the wide camera.'},
  ],
  storyEvents: [
    { id: 'shelter-story', room: 'S1', who: 'Ranger', text: 'The first time we saw the apparition, it crossed behind the shelter and vanished into the trees.', reward: 4 },
    { id: 'swings-story', room: 'S2', who: 'Coach', text: 'The swings started moving even when the playground was empty. Then we heard a child laugh.', reward: 4 },
    { id: 'photographer-story', room: 'F1', who: 'Maya', text: 'I have been photographing this whole soccer game. My lens caught a figure no one else could see.', reward: 4 },
    { id: 'field-story', room: 'F2', who: 'Player', text: 'Right after the winning goal, every field light dimmed and a blue figure walked across midfield.', reward: 4 },
    { id: 'tree-story', room: 'T1', who: 'Ranger', text: 'People keep hearing footsteps near the bench, but the path camera never sees anyone human.', reward: 4 },
  ],
  startLogEntries: [
    {room:'S1',kind:'story',text:'Ranger: There it is again — something just moved past the tree line…'},
    {room:'F2',kind:'ambient',text:'Voices carrying across the center field.'},
    {room:'S2',kind:'ambient',text:'The swings squeak in the night breeze.'},
    {room:'T1',kind:'ghost',text:'A distant whisper rises from the trees.'},
  ],
  toolItems: [
    { name: 'Ghost Trap', icon: '◎', count: 2, color: '#70eff8', details: 'Deploy the rune trap inside an active park zone to capture a visible spirit.' },
    { name: 'EMF Reader', icon: '▥', count: 1, color: '#92b7ff', details: 'Scans the selected zone for an energy spike.' },
    { name: 'Spirit Lantern', icon: '♨', count: 2, color: '#ffd075', details: 'Reveals spirits hiding in the dark tree line or behind the shelter.' },
    { name: 'Binding Tome', icon: '▤', count: 1, color: '#c68cff', details: 'Notes story clues and weakens a ghost after enough evidence is gathered.' },
    { name: 'Audio Recorder', icon: '◉', count: 1, color: '#d0e2f2', details: 'Records voices, whistles, and paranormal EVP from the selected zone.' },
    { name: 'Ectoplasm Jar', icon: '▣', count: 0, color: '#c8e1f2', details: 'Reserved for future park-level residue sampling.' },
  ],
};

for (const level of [HOUSE_LEVEL, PARK_LEVEL]) {
  level.roomById = Object.fromEntries(level.rooms.map(room => [room.id, room]));
}

export const LEVELS = {
  house: HOUSE_LEVEL,
  park: PARK_LEVEL,
};

export const DEFAULT_LEVEL_ID = 'house';
