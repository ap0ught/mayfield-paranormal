import React, { useEffect, useRef, useState } from 'react';
import {
  AudioLines, BookOpen, Camera, ChevronRight, CircleHelp, Clock3,
  Eye, FileText, Ghost, Headphones, Home, Lightbulb, Map as MapIcon,
  Moon, Pause, Play, Radio, ScanEye, Settings, ShieldAlert,
  Volume2, VolumeX, Zap
} from 'lucide-react';
import { DEFAULT_LEVEL_ID, LEVELS } from './rooms.js';
import { MAX_FOCUS, initializeLevel, advanceWorld, spendFocus, restoreFocus, audibleEvents, isGhost, isGuest, applyObjectiveEvent, advanceDay, evaluateLevel, dropScheduledLostItems, recoverLostItem, returnLostItem, reportThief } from './level-engine.js';
import { createScheduledWorld, advanceScheduledWorld, formatParkTime } from './role-scheduler.js';
import { spriteUrl, actorPose, snapshotFramePosition } from './sprite-animation.js';
import { ParkLive3D, Park2DSnapshot } from './Park3DView.jsx';

const humanSound = ['footsteps', 'a door closing', 'whispered conversation', 'a chair scraping'];
const timeLabel = date => date.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit', second:'2-digit'});
const clockLabel = date => date.toLocaleString([], {weekday:'short', month:'short', day:'numeric', hour:'numeric', minute:'2-digit', hour12:true});
const minutesLabel = seconds => `${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;
const iconColor = (room) => ({'--room-accent': room.color});
const randomOf = items => items[Math.floor(Math.random() * items.length)];
const freshSoundLog = level => level.startLogEntries.map((entry, index) => ({
  id: `start-${level.id}-${index}`,
  room: entry.room,
  kind: entry.kind,
  text: entry.text,
  at: new Date(Date.now() - (level.startLogEntries.length - index) * 3000),
}));

function useLiveClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const id = window.setInterval(() => setTime(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);
  return time;
}

function PersonSprite({person, levelId, roomById, small=false, snapshotFrame=0}) {
  const pose=actorPose(person);
  const sprite=spriteUrl(levelId,person);
  const frame=small ? snapshotFramePosition(pose,snapshotFrame) : pose==='interact'?'100%':'0%';
  return <div className={`person-sprite actor-sprite ${small?'person-small':''} ${isGuest(person)?'person-guest':'person-resident'} ${person.kind==='animal'?'person-animal':''} ${pose==='walk'?'actor-walking':''}`} style={{left:`${person.x}%`, '--person-color':person.color}} title={`${person.name} · ${person.kind}, ${person.role}, ${person.stay} · ${roomById[person.room]?.name}`}>
    <span className="actor-pixels" style={{backgroundImage:sprite?`url("${sprite}")`:undefined, backgroundPositionX:frame, transform:person.dir<0?'scaleX(-1)':undefined}} role="img" aria-label={`${person.name} ${pose}`}/>
    {person.role.includes('photographer') && <span className="actor-action photographer">📸</span>}
    {person.role==='child' && person.room==='S2' && <span className="actor-action">🛝</span>}
    <span className="person-name">{person.name} <b>{isGuest(person)?'G':'R'}</b></span>
  </div>;
}

function RoomScene({room, actors, levelId, lightsOn, roomById, items=[], small=false, snapshotFrame=0, ghostRevealed=false, trapActive=false}) {
  const roomGhosts = actors.filter(g => isGhost(g) && g.room===room.id);
  return <div className={`scene ${small ? 'scene-small' : ''} ${lightsOn ? '' : 'scene-dark'}`}>
    <img draggable="false" src={`/assets/${room.image}.webp`} className="scene-art" alt={`${room.name} view`} />
    <div className="room-film" />
    {actors.filter(p=>!isGhost(p) && p.room===room.id).map(person=><PersonSprite key={person.id} person={person} levelId={levelId} roomById={roomById} small={small} snapshotFrame={snapshotFrame}/>) }
    {roomGhosts.map(ghost=><div key={ghost.id} className={`floating-ghost ghost-actor ${ghostRevealed?'ghost-revealed':''}`} style={{left:`${ghost.x}%`,top:room.ghostPos?.top || '25%'}} title={`${ghost.name} · ${ghost.stay} ${ghost.kind}`} aria-label={`Ghost in ${room.name}`}>
      <span className={`actor-pixels ${small?'ghost-snapshot':''}`} style={{backgroundImage:`url("${spriteUrl(levelId,ghost)}")`,backgroundPositionX:small?snapshotFramePosition('float',snapshotFrame):'0%'}}/>
    </div>)}
    {items.filter(item=>item.status==='dropped'&&item.room===room.id).map(item=><div key={item.id} className="lost-item-scene" title={item.name}>{item.icon} <span>LOST ITEM</span></div>)}
    {trapActive && !small && <div className="floor-trap"><span>◎</span><i>ACTIVE TRAP</i></div>}
    {!lightsOn && <div className="lights-off-overlay" />}
    {roomGhosts.length>0 && <div className="cold-spot">❄ COLD SPOT</div>}
  </div>;
}

function ColoredGlyph({room, compact=false}) {
  return <span className={`camera-glyph ${compact ? 'compact-glyph' : ''}`} style={iconColor(room)}>{room.glyph}</span>;
}

function Meter({focus}) {
  return <div className="focus-meter">
    <div className="meter-stats"><span>FOCUS & DISCOVERY</span><strong>{focus.length} <span>/ {MAX_FOCUS}</span></strong></div>
    <div className="segments" aria-label={`${focus.length} of ${MAX_FOCUS} focus segments remaining`}>
      {Array.from({length:MAX_FOCUS}, (_,i) => <span key={i} className={`segment ${focus[i] || 'empty'}`}/>) }
    </div>
  </div>;
}

export default function App() {
  const now = useLiveClock();
  const [activeLevelId, setActiveLevelId] = useState(DEFAULT_LEVEL_ID);
  const level = LEVELS[activeLevelId];
  const rooms = level.rooms;
  const roomById = level.roomById;
  const toolItems = level.toolItems;
  const storyEvents = level.storyEvents;
  const mainConversations = level.mainConversations;
  const [initialWorld] = useState(() => initializeLevel(LEVELS[DEFAULT_LEVEL_ID]));

  const [selected, setSelected] = useState(initialWorld.selected);
  const [cameras, setCameras] = useState(initialWorld.cameras);
  const [lights, setLights] = useState(initialWorld.lights);
  const [muted, setMuted] = useState(initialWorld.muted);
  const [focus,setFocus] = useState(initialWorld.focus);
  const [guestVisits,setGuestVisits] = useState(initialWorld.guestVisits);
  const [animalRolls,setAnimalRolls] = useState(initialWorld.animalRolls);
  const [lostItems,setLostItems] = useState(initialWorld.lostItems);
  const lostItemsRef = useRef(initialWorld.lostItems);
  const [objectiveProgress,setObjectiveProgress] = useState(initialWorld.objectiveProgress);
  const [dayRemaining,setDayRemaining] = useState(initialWorld.dayRemaining);
  const [timeLeft,setTimeLeft] = useState(60);
  const [feedClosed,setFeedClosed] = useState(false);
  const [playing,setPlaying] = useState(true);
  const [speed,setSpeed] = useState(1);
  const [nav,setNav] = useState('Cameras');
  const [actors,setActors] = useState(initialWorld.actors);
  const [snapshotActors,setSnapshotActors] = useState(initialWorld.actors);
  const [snapshotFrame,setSnapshotFrame] = useState(0);
  const actorsRef = useRef(actors);
  const simTickRef = useRef(0);
  const parkScheduleRef = useRef(null);
  const [trapCount,setTrapCount] = useState(initialWorld.trapCount);
  const [ghostCaptures,setGhostCaptures] = useState(0);
  const [selectedTool,setSelectedTool] = useState(level.toolItems[0].name);
  const [trapActive,setTrapActive] = useState(true);
  const [audioEnabled,setAudioEnabled] = useState(false);
  const [soundLog,setSoundLog] = useState(() => freshSoundLog(level));
  const [heardStories,setHeardStories] = useState([]);
  const [evidence,setEvidence] = useState([]);
  const [conversationIndex,setConversationIndex] = useState(0);
  const [notice,setNotice] = useState('Select a room to inspect. Capture a ghost or hear a story to restore focus.');
  const [revealed,setRevealed] = useState(false);
  const [recentRoomSwitch,setRecentRoomSwitch] = useState(null);
  const [scanResult,setScanResult] = useState(null);
  const [showHelp,setShowHelp] = useState(false);
  const [activityMode,setActivityMode] = useState('ALL');

  const room = roomById[selected] ?? rooms[0];
  const displayedCameras = cameras.map((id,i)=>roomById[id] ? id : level.defaultCameras[i]);
  const ghosts = actors.filter(isGhost);
  const people = actors.filter(actor=>!isGhost(actor));
  const residentActors = actors.filter(actor=>!isGuest(actor));
  const guestActors = actors.filter(isGuest);
  const availableGhost = ghosts.find(g=>g.room===selected);
  const suspectsHere = actors.filter(a=>isGuest(a)&&a.role==='thief'&&a.room===selected);
  const droppedHere = lostItems.filter(item=>item.status==='dropped'&&item.room===selected);
  const carriedItems = lostItems.filter(item=>item.status==='recovered');
  const isBank = level.id==='bank';
  const audioEnabledRef = useRef(audioEnabled);
  const lastActors = useRef(new Map(initialWorld.actors.map(a=>[a.id,a])));

  useEffect(()=>{audioEnabledRef.current=audioEnabled},[audioEnabled]);
  actorsRef.current = actors;

  const outcome = evaluateLevel(level,objectiveProgress,focus,dayRemaining);
  const levelFinished = outcome.state !== 'playing';

  function loadLevel(levelId) {
    const nextLevel = LEVELS[levelId];
    const nextWorld = initializeLevel(nextLevel);
    // One shared schedule drives map dots, stop-motion previews and live rooms.
    parkScheduleRef.current = nextLevel.roleSchedules
      ? createScheduledWorld(nextLevel,nextLevel.roleSchedules,nextWorld.animalRolls) : null;
    if (parkScheduleRef.current) nextWorld.actors = parkScheduleRef.current.actors;
    setActiveLevelId(levelId);
    setSelected(nextWorld.selected);
    setCameras(nextWorld.cameras);
    setLights(nextWorld.lights);
    setMuted(nextWorld.muted);
    setFocus(nextWorld.focus);
    setGuestVisits(nextWorld.guestVisits);
    setAnimalRolls(nextWorld.animalRolls);
    setLostItems(nextWorld.lostItems);
    lostItemsRef.current=nextWorld.lostItems;
    setObjectiveProgress(nextWorld.objectiveProgress);
    setDayRemaining(nextWorld.dayRemaining);
    setTimeLeft(60);
    setFeedClosed(false);
    setPlaying(true);
    setSpeed(1);
    setNav('Cameras');
    setActors(nextWorld.actors);
    setSnapshotActors(nextWorld.actors.map(actor=>({...actor})));
    setSnapshotFrame(0);
    actorsRef.current = nextWorld.actors;
    simTickRef.current = 0;
    setTrapCount(nextWorld.trapCount);
    setGhostCaptures(0);
    setSelectedTool(nextLevel.toolItems[0].name);
    setTrapActive(true);
    setAudioEnabled(false);
    if(typeof window.speechSynthesis !== 'undefined')window.speechSynthesis.cancel();
    setSoundLog(freshSoundLog(nextLevel));
    setHeardStories([]);
    setEvidence([]);
    setConversationIndex(0);
    setNotice(`New game: ${nextLevel.title}. ${nextLevel.randomAnimals.length ? 'Animal stays rerolled.' : 'Security teams on duty.'}`);
    setRevealed(false);
    setRecentRoomSwitch(null);
    setScanResult(null);
    setShowHelp(false);
    setActivityMode('ALL');
    lastActors.current = new Map(nextWorld.actors.map(actor=>[actor.id,actor]));
  }

  function completeObjectiveEvent(type,roomId) {
    if (!levelFinished) setObjectiveProgress(prev=>applyObjectiveEvent(level,prev,{type,room:roomId}));
  }

  function addLog(roomId, kind, text) {
    setSoundLog(prev => [...prev.slice(-31), {id:`s-${Date.now()}-${Math.random()}`, room:roomId, kind, text, at:new Date()}]);
  }

  function announce(text) {setNotice(text);}

  function speak(text, force=false) {
    if ((!force && !audioEnabledRef.current) || typeof window.speechSynthesis==='undefined') return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 0.85;
      u.pitch = text.toLowerCase().includes('ghost') ? 0.5 : 1.05;
      u.volume = 0.65;
      window.speechSynthesis.speak(u);
    } catch {
      /* ignore speech synthesis errors in headless browsers */
    }
  }

  function changeRoom(roomId) {
    if (levelFinished) return;
    if (focus.length===0) {
      announce('No focus remaining. Hear a story or catch a ghost to restore it.');
      return;
    }
    setSelected(roomId);
    setTimeLeft(60);
    setFeedClosed(false);
    setTrapActive(false);
    setScanResult(null);
    setRevealed(false);
    setNav('Cameras');
    completeObjectiveEvent('inspect', roomId);
    announce(`${roomById[roomId].name}: 60-second inspection window opened.`);
  }

  function toggleLight(id) {
    setLights(prev=>({...prev,[id]:!prev[id]}));
    announce(`${roomById[id].name}: light ${!lights[id]?'on':'off'}. All camera feeds updated.`);
  }

  function toggleMute(id) {
    setMuted(prev=>({...prev,[id]:!prev[id]}));
    announce(`${roomById[id].name} ${!muted[id]?'muted — removed from live sound':'unmuted — added to live sound'}.`);
  }

  function hearStory(story) {
    if (levelFinished) return;
    if (heardStories.includes(story.id)) {
      announce('This story has already restored your focus.');
      return;
    }
    if (muted[story.room]) {
      announce(`Unmute ${roomById[story.room].name} first to hear this story.`);
      return;
    }
    if (level.roleSchedules && !actors.some(actor=>actor.name===story.who && actor.room===story.room)) {
      announce(`${story.who} is not in ${roomById[story.room].name} right now. Listen when their job brings them here.`);
      return;
    }
    setHeardStories(prev=>[...prev,story.id]);
    completeObjectiveEvent('listen_story',story.room);
    setFocus(prev=>restoreFocus(prev, 'story', story.reward));
    addLog(story.room,'story',`${story.who}: “${story.text}” (+${story.reward} focus)`);
    setConversationIndex(i=>(i+1)%mainConversations.length);
    setAudioEnabled(true);
    speak(story.text, true);
    announce(`Story heard: +${story.reward} yellow segments added to the ticker.`);
  }

  function triggerTrap() {
    if (levelFinished) return;
    if (trapCount <= 0) {
      announce('No ghost traps left. Keep investigating for more opportunities.');
      return;
    }
    if (feedClosed) {
      announce('Open a live inspection window before deploying a trap.');
      return;
    }
    if (availableGhost) {
      if (parkScheduleRef.current) {
        parkScheduleRef.current = {...parkScheduleRef.current, actors:parkScheduleRef.current.actors.filter(actor=>actor.id!==availableGhost.id)};
      }
      setActors(prev=>prev.filter(actor=>actor.id!==availableGhost.id));
      setTrapCount(v=>v-1);
      setGhostCaptures(v=>v+1);
      completeObjectiveEvent('capture_ghost',selected);
      setFocus(prev=>restoreFocus(prev, 'ghost', 7));
      setEvidence(prev=>[...prev,`Captured ${availableGhost.name} in ${room.name}`]);
      setTrapActive(false);
      addLog(selected,'ghost',`Ghost capture successful: ${availableGhost.name}! +7 focus.`);
      announce(`👻 Captured ${availableGhost.name}! Seven magenta focus segments restored.`);
      // Ghosts are actors: new visiting ghosts follow the same scheduled arrival lifecycle as people.

    } else {
      setTrapActive(true);
      announce(`Trap armed in ${room.name}. No ghost is visible yet — monitor for activity.`);
    }
  }

  function alertSecurity(actorId) {
    if (levelFinished || !isBank) return;
    const result=reportThief(actors, selected, actorId);
    if (!result.ok) { announce('Security needs a thief on the currently selected live camera.'); return; }
    setActors(prev=>reportThief(prev,selected,actorId).actors);
    completeObjectiveEvent('thief_reported',selected);
    setEvidence(prev=>[...prev,`Security intercepted ${result.reported.name} in ${room.name}`]);
    addLog(selected,'ambient',`Security alert! Guards intercept a thief in ${room.name}.`);
    announce('🚨 Thief intercepted! Resident security guards responded to your report.');
  }

  function takeLostItem(itemId) {
    if (levelFinished || !isBank) return;
    const result=recoverLostItem(lostItemsRef.current,itemId,selected);
    if (!result.ok) {announce('Inspect the room with the dropped item before recovering it.');return;}
    lostItemsRef.current=result.items;
    setLostItems(result.items);
    completeObjectiveEvent('item_recovered',selected);
    addLog(selected,'ambient',`Lost property recovered: ${result.item.name}.`);
    announce(`🧳 Recovered ${result.item.name}. Find ${result.item.ownerName}, or go to the Lost Property Desk.`);
  }

  function deliverLostItem(itemId) {
    if (levelFinished || !isBank) return;
    const result=returnLostItem(lostItemsRef.current,itemId,selected,actors);
    if (!result.ok) {announce('Find the owner in a camera, or select the Lost Property Desk to let resident customer-care staff return it.');return;}
    lostItemsRef.current=result.items;
    setLostItems(result.items);
    completeObjectiveEvent('item_returned',selected);
    const destination=result.deliveredBy==='owner'?'directly to its owner':'to the resident customer-care team for the owner';
    setEvidence(prev=>[...prev,`Returned ${result.item.name} ${destination}`]);
    addLog(selected,'ambient',`Lost item returned: ${result.item.name} ${destination}.`);
    announce(`✅ ${result.item.name} returned ${destination}.`);
  }

  function useTool(tool) {
    if (levelFinished) return;
    setSelectedTool(tool.name);
    if (tool.name==='Ghost Trap') {
      triggerTrap();
      return;
    }
    if (tool.name==='EMF Reader') {
      setScanResult(availableGhost?'EMF 5 — severe paranormal spike':'EMF 1 — background field stable');
      announce(`EMF scan of ${room.name}: ${availableGhost?'high paranormal activity!':'normal reading'}.`);
      if (availableGhost) {
        setEvidence(prev=>[...prev,`EMF Level 5 in ${room.name}`]);
        completeObjectiveEvent('emf_scan_ghost',selected);
      }
    } else if (tool.name==='Spirit Lantern') {
      setRevealed(true);
      announce(`Spirit lantern illuminates ${room.name}.`);
    } else if (tool.name==='Audio Recorder') {
      const latest=[...soundLog].reverse().find(e=>e.room===selected && !muted[e.room]);
      if (latest) {
        setEvidence(prev=>[...prev,`Audio: ${latest.text}`]);
        completeObjectiveEvent('audio_recorded',selected);
        announce(`Recorded evidence from ${room.name}.`);
      } else {
        announce(`Unmute ${room.name} to capture audio.`);
      }
    } else if (tool.name==='Security Radio') {
      if (suspectsHere.length) alertSecurity(suspectsHere[0].id);
      else announce('No suspicious visitor in this room. Watch the entrance and teller counters.');
    } else if (tool.name==='Lost Property Kit') {
      if (droppedHere.length) takeLostItem(droppedHere[0].id);
      else if (carriedItems.length) deliverLostItem(carriedItems[0].id);
      else announce('Look for the dropped-item marker in the bank cameras.');
    } else if (tool.name==='Binding Tome') {
      announce('Binding Tome opened. Review and identify the spirit from your evidence.');
      setNav('Evidence');
    } else {
      announce(tool.details);
    }
  }

  useEffect(()=>{
    if(!playing || levelFinished || level.roleSchedules)return;
    const id=setInterval(()=>{
      simTickRef.current += 1;
      setActors(prev=>advanceWorld(level,prev,simTickRef.current,1.2,guestVisits).actors);
    },350/speed);
    return ()=>clearInterval(id);
  },[playing,speed,activeLevelId,guestVisits,levelFinished]);

  // Incidents use the exact actor positions driving the other two camera detail levels.
  useEffect(()=>{
    if (!isBank || !playing || levelFinished) return;
    const id=setInterval(()=>{
      const result=dropScheduledLostItems(lostItemsRef.current,actorsRef.current,simTickRef.current);
      if (result.dropped.length) {
        lostItemsRef.current=result.items;
        setLostItems(result.items);
        for (const item of result.dropped) addLog(item.room,'ambient',`${item.ownerName} accidentally dropped ${item.name} in ${roomById[item.room].name}.`);
        announce('🧳 Lost item detected on a bank camera. Inspect the marked room to help its owner.');
      }
    },450/speed);
    return ()=>clearInterval(id);
  },[activeLevelId,playing,levelFinished,speed]);

  useEffect(()=>{
    if (!playing || levelFinished) return;
    const id=setInterval(()=>{setSnapshotActors(actorsRef.current.map(a=>({...a})));setSnapshotFrame(f=>(f+1)%4);},1300/speed);
    return ()=>clearInterval(id);
  },[playing,speed,activeLevelId,levelFinished]);

  useEffect(()=>{
    if(!playing||feedClosed||levelFinished)return;
    const id=setInterval(()=>setTimeLeft(prev=>Math.max(0,prev-1)),1000/speed);
    return ()=>clearInterval(id);
  },[playing,feedClosed,speed,activeLevelId,levelFinished]);

  useEffect(()=>{
    if(timeLeft===0 && !feedClosed) {
      setFeedClosed(true);
      setTrapActive(false);
      announce('The 60-second inspection has ended. Choose a room to open a new live view.');
    }
  },[timeLeft,feedClosed]);

  useEffect(()=>{
    if(!playing||feedClosed||levelFinished)return;
    const id=setInterval(()=>setFocus(spendFocus),4500/speed);
    return ()=>clearInterval(id);
  },[playing,feedClosed,speed,activeLevelId,levelFinished]);

  useEffect(()=>{
    if(!playing || levelFinished) return;
    const id=setInterval(()=>{
      // Park's schedule uses the same 1-second step as the day countdown;
      // the old 350ms movement loop remains available to legacy levels.
      if (level.roleSchedules && parkScheduleRef.current) {
        const world=parkScheduleRef.current;
        const nextSecond=Math.min(level.dayDurationSeconds, world.elapsedGameSeconds+1);
        const updated=advanceScheduledWorld(world,level,nextSecond);
        parkScheduleRef.current=updated;
        actorsRef.current=updated.actors;
        setActors(updated.actors);
      }
      setDayRemaining(advanceDay);
    },1000/speed);
    return ()=>clearInterval(id);
  },[playing,speed,activeLevelId,levelFinished]);

  useEffect(()=>{
    if (!levelFinished) return;
    setPlaying(false);
    setFeedClosed(true);
    setTrapActive(false);
    if(typeof window.speechSynthesis !== 'undefined')window.speechSynthesis.cancel();
  },[levelFinished]);

  useEffect(()=>{
    if(!playing || levelFinished)return;
    const id=setInterval(()=>{
      const unmuted = rooms.filter(r=>!muted[r.id]);
      if(unmuted.length===0)return;
      const chosen=randomOf(unmuted);
      const haunted=actorsRef.current.some(a=>isGhost(a) && a.room===chosen.id);
      const ghostSound=haunted&&Math.random()<0.6;
      const peopleHere = actorsRef.current.filter(a=>!isGhost(a) && a.kind==='human' && a.room===chosen.id);
      const conversation = !ghostSound && peopleHere.length>0 && Math.random()<0.37;
      const speaker = conversation ? randomOf(peopleHere) : null;
      const nearbyAnimal = actorsRef.current.find(a=>a.kind==='animal' && a.room===chosen.id);
      const animalSound = !ghostSound && !conversation && nearbyAnimal && Math.random()<0.45;
      const text=ghostSound
        ? randomOf(['A distant voice whispers a name.','Unexplained footsteps in an empty room.','A cold, breathy laugh on the microphone.','A ghostly voice says “Come closer…”'])
        : conversation
          ? `${speaker.name}: ${randomOf(['Did you hear that?', 'Someone just walked past the doorway.', 'I thought I left the lights on.', 'There is something strange about this place.'])}`
          : animalSound ? `${nearbyAnimal.name}: ${nearbyAnimal.role.includes('cat') ? 'soft meowing and paw steps' : nearbyAnimal.role.includes('squirrel') ? 'chattering and small claws scraping bark' : 'a bark and paws moving across the ground'}` : randomOf([...chosen.ambient,...humanSound]);
      addLog(chosen.id,ghostSound?'ghost':conversation?'conversation':'ambient',text);
      if(audioEnabledRef.current) speak(`${chosen.name}. ${ghostSound ? 'Ghost detected. ' : ''}${text}`);
    },3400/speed);
    return ()=>clearInterval(id);
  },[playing,muted,speed,activeLevelId,levelFinished]);

  useEffect(()=>{
    if(levelFinished || !playing) return;
    const id=setInterval(()=>setConversationIndex(i=>(i+1)%mainConversations.length),17000/speed);
    return ()=>clearInterval(id);
  },[speed,activeLevelId,playing,levelFinished]);

  useEffect(()=>{
    if(!recentRoomSwitch) return;
    const id=setTimeout(()=>setRecentRoomSwitch(null),2200);
    return ()=>clearTimeout(id);
  },[recentRoomSwitch]);

  useEffect(()=>{
    if (actors.some(a=>!roomById[a.room])) return; // ignore previous level during a level switch
    const previous=lastActors.current;
    const latest=new Map(actors.map(a=>[a.id,a]));
    for (const actor of actors) {
      const old=previous.get(actor.id);
      if (!old && isGuest(actor)) {
        addLog(actor.room, actor.kind==='ghost'?'ghost':'ambient', `${actor.name} (${actor.role}) arrives as a guest.`);
        setRecentRoomSwitch(`${actor.name} has arrived at ${roomById[actor.room]?.short}`);
        if (level.id==='bank' && actor.role==='thief') addLog(actor.room,'ambient','Security camera: a visitor arrives and surveys the counter drawers.');
      } else if (old?.room!==actor.room && old && roomById[old.room] && roomById[actor.room]) {
        setRecentRoomSwitch(`${actor.name}: ${roomById[old.room].short} → ${roomById[actor.room].short}`);
        if (level.id==='bank' && actor.role==='thief' && ['T1','OFF'].includes(actor.room)) {
          addLog(actor.room,'ambient','Security monitor: a visitor lingers by a teller drawer. The cameras mark suspicious behavior.');
        }
        if (actor.role.includes('photographer') && actor.room.startsWith('F')) {
          addLog(actor.room,'ambient',`📸 Camera shutter: ${actor.name} photographs the soccer match.`);
        }
        if (actor.role==='child' && actor.room==='S2') {
          addLog(actor.room,'ambient',`${actor.name} runs over to the playground swings.`);
        }
      }
    }
    for (const actor of previous.values()) {
      if (isGuest(actor) && !latest.has(actor.id)) {
        addLog(actor.room, actor.kind==='ghost'?'ghost':'ambient', `${actor.name} (${actor.role}) leaves the scene.`);
        setRecentRoomSwitch(`${actor.name} has left ${level.title}`);
      }
    }
    lastActors.current=latest;
  },[actors,level]);

  useEffect(()=>{
    return ()=>{
      if(typeof window.speechSynthesis!=='undefined')window.speechSynthesis.cancel();
    };
  },[]);

  const soundRows = audibleEvents(soundLog, muted, activityMode).filter(e=>roomById[e.room]).reverse();
  const transcript = mainConversations[conversationIndex] ?? mainConversations[0];
  const earnedStory = focus.filter(s=>s==='story').length;
  const earnedGhost = focus.filter(s=>s==='ghost').length;
  const litCount = Object.values(lights).filter(Boolean).length;

  return <div className={`app-shell ${!playing||levelFinished?'simulation-paused':''}`}>
    <div className="dashboard">
      <aside className="left-area">
        <section className="map-panel panel">
          <div className="brand">
            <div className="brand-roof">{level.roof}</div>
            <h1>{level.title}</h1>
            <span>{level.subtitle}</span>
            <div className="level-switcher">
              {Object.values(LEVELS).map(item => <button key={item.id} className={`level-chip ${item.id===activeLevelId?'active-level-chip':''}`} onClick={()=>loadLevel(item.id)}>{item.id.charAt(0).toUpperCase()+item.id.slice(1)}</button>)}
            </div>
          </div>
          <div className="map-title"><Home size={17}/><b>DETAIL 1</b><span>{level.mapLabel}</span><span className="live-dot">● LIVE</span></div>
          <div className="house-scene">
            <img src={`/assets/${level.mapBackground}.webp`} alt={`${level.title} overview map`} />
            <div className={`house-tiles ${level.mapRows > 4 ? 'map-grid-dense' : level.mapRows === 4 ? 'map-grid-medium' : ''}`} style={{...level.mapOverlay,gridTemplateColumns:`repeat(${level.mapColumns ?? 3},minmax(0,1fr))`,gridTemplateRows:`repeat(${level.mapRows ?? 3},minmax(0,1fr))`}}>
              {level.mapCells.map((cell, index) => {
                if (typeof cell === 'string') {
                  const r = roomById[cell];
                  return <button key={`${r.id}-${index}`} className={`map-room ${selected===r.id?'chosen':''} ${lights[r.id]?'lit':'unlit'}`} style={iconColor(r)} onClick={()=>changeRoom(r.id)} title={`${r.id} — ${r.name}. ${lights[r.id]?'Lights on':'Lights off'}. Click to inspect.`}>
                    <ColoredGlyph room={r} compact/>
                    <span className="tile-people">{people.filter(p=>p.room===r.id).map(p=><i key={p.id} className={isGuest(p)?'map-dot-guest':''} style={{background:p.color}} title={`${p.name} (${p.kind}, ${p.stay})`}/>)}</span>
                    <span className="tile-controls"><span className="tile-id">{r.id}</span><span role="button" tabIndex={0} onClick={e=>{e.stopPropagation();toggleLight(r.id)}} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.stopPropagation();toggleLight(r.id)}}} className={`tile-light ${lights[r.id]?'on':''}`} title={`Toggle light in ${r.name}`}><Lightbulb size={12}/></span></span>
                    {ghosts.some(g=>g.room===r.id) && <span className="map-ghost">✧</span>}
                    {isBank && lostItems.some(item=>item.status==='dropped'&&item.room===r.id) && <span className="map-lost-item" title="Lost item reported">{lostItems.find(item=>item.status==='dropped'&&item.room===r.id)?.icon || '👛'}</span>}
                  </button>;
                }
                return <div key={`filler-${index}`} className="map-filler"><span>{cell.icon}</span><b>{cell.label}</b></div>;
              })}
            </div>
            <div className="driveway"><span>{level.mapDriveLabel}</span><span className="car-icon">{activeLevelId==='park' ? '🚗' : '🚙'}</span></div>
          </div>
          <div className="map-footer"><span>● <b>{litCount}/{level.mapFooterLitTotal}</b> LIT</span><span>● <b>{residentActors.length}R / {guestActors.length}G</b> ACTORS</span><span>✧ <b>{ghosts.length}</b> GHOSTS</span></div>
          <div className="map-tip">{level.mapTip}</div>
        </section>
        <section className="operations">
          <nav className="side-nav panel" aria-label="Game panels">
            {[
              ['Cameras', Camera], ['Sound', AudioLines], ['Evidence', Ghost],
              ['Traps', ScanEye], ...(isBank ? [['Incidents', ShieldAlert]] : []), ['Maps', MapIcon], ['Reports', FileText], ['Settings', Settings]
            ].map(([name,Icon])=><button key={name} className={`nav-button ${nav===name?'active':''}`} onClick={()=>setNav(name)}><Icon size={19}/>{name}</button>)}
          </nav>
          <div className="event-panel panel">
            {['Cameras','Sound'].includes(nav) ? <>
              <div className="event-heading"><AudioLines size={19}/><b>{nav==='Sound'?'SOUND · ALL UNMUTED':'LIVE SOUND LOG'}</b></div>
              <div className="sound-controls"><button className={`audio-enable ${audioEnabled?'listening':''}`} onClick={()=>{setAudioEnabled(prev=>!prev); if(audioEnabled&&window.speechSynthesis)window.speechSynthesis.cancel();}}>{audioEnabled?<><Volume2 size={14}/> Audio enabled</>:<><Headphones size={14}/> Enable listening</>}</button><span>{rooms.filter(r=>!muted[r.id]).length} mics on</span></div>
              {nav==='Sound'&&<div className="filter-row">{['ALL','GHOST','STORY'].map(mode=><button key={mode} className={activityMode===mode?'chosen-filter':''} onClick={()=>setActivityMode(mode)}>{mode}</button>)}</div>}
              <div className="sound-events">{soundRows.length ? soundRows.slice(0,nav==='Sound'?11:7).map(entry=><button key={entry.id} className={`sound-event ${entry.kind}`} onClick={()=>{if(!audioEnabled){setAudioEnabled(true)}speak(entry.text);announce(`Replaying audio from ${roomById[entry.room].name}.`)}} title="Click to hear this event using speech synthesis">
                <ColoredGlyph room={roomById[entry.room]} compact/>
                <span className="sound-text"><strong>{entry.room} · {entry.kind==='ghost'?'EVP / Ghost':entry.kind==='story'?'Story':entry.text}</strong><span className="waveform">▂▅▃▆▃▇▂▆▅▃▆▂▅▃▇</span></span><time>{timeLabel(entry.at)}</time>
              </button>) : <div className="empty-note">No sounds from unmuted rooms.</div>}</div>
              {nav==='Sound'&&<div className="sound-caption">All sound sources are synchronized with {activeLevelId==='house'?'the house':activeLevelId==='park'?'the park':'the bank'}. Unmute a camera to receive its voices and ghost sounds.</div>}
            </> : nav==='Evidence' ? <><h3><FileText size={18}/> Evidence log</h3><div className="event-copy">{evidence.length===0?'No evidence collected yet. Use an EMF reader, audio recorder, or trap.':evidence.map((e,i)=><p key={i}>✓ {e}</p>)}</div><button className="wide-button" onClick={()=>useTool(toolItems[4])}>Record selected room audio</button></> : nav==='Traps' ? <><h3><Ghost size={18}/> Trap control</h3><div className="event-copy">Select a haunted room and activate an enchanted trap. Caught ghosts restore <b className="magenta">+7 focus segments</b>.</div><button className="wide-button" onClick={triggerTrap}>◎ {availableGhost?'Capture visible ghost':'Arm trap'} ({trapCount} left)</button></> : nav==='Incidents' ? <><h3><ShieldAlert size={18}/> Bank incident desk</h3><div className="event-copy"><p>👮 Guards and employees are residents. Customers and thieves are guests.</p><p><b>Suspect in selected room:</b> {suspectsHere.length ? suspectsHere[0].name : 'None'}</p><p><b>Lost property:</b></p>{lostItems.map(item=><p key={item.id}>{item.icon} {item.name} · {item.status}{item.room?` · ${roomById[item.room]?.short}`:''}</p>)}</div>{suspectsHere.length>0 && <button className="wide-button" onClick={()=>alertSecurity(suspectsHere[0].id)}>🚨 Report thief to security</button>}{droppedHere.map(item=><button key={item.id} className="wide-button" onClick={()=>takeLostItem(item.id)}>🧳 Recover {item.name}</button>)}{carriedItems.map(item=><button key={item.id} className="wide-button" onClick={()=>deliverLostItem(item.id)}>↪ Return {item.name}</button>)}</> : nav==='Maps' ? <><h3><MapIcon size={18}/> Map overview</h3><div className="event-copy">{level.mapsButtonCopy}</div><button className="wide-button" onClick={()=>changeRoom(level.mapsButtonTarget)}>{level.mapsButtonLabel}</button></> : nav==='Reports' ? <><h3><FileText size={18}/> Investigation report</h3><div className="event-copy">Ghosts captured: {ghostCaptures}<p>Clues collected: {evidence.length}</p><p>Stories heard: {heardStories.length} / {storyEvents.length}</p><p>Rooms illuminated: {litCount} / {level.mapFooterLitTotal}</p><p>Residents: {actors.filter(a=>!isGuest(a)).length}</p><p>Guests visiting: {actors.filter(isGuest).length}</p><p>Humans: {actors.filter(a=>a.kind==='human').length} · Animals: {actors.filter(a=>a.kind==='animal').length} · Ghosts: {ghosts.length}</p><p><b>ACTOR ROSTER</b></p>{actors.map(a=><p key={a.id}>{a.name} · {a.role} · {a.kind} · {a.stay} · {roomById[a.room]?.short}</p>)}</div></> : <><h3><Settings size={18}/> Settings</h3><div className="event-copy">Pause or speed up the simulation. Audio requires a user click because browsers block autoplay.</div><button className="wide-button" onClick={()=>setPlaying(v=>!v)}>{playing?'Pause simulation':'Resume simulation'}</button><button className="wide-button" onClick={()=>window.location.reload()}>Reset demo</button></>}
          </div>
        </section>
      </aside>
      <main className="center-area">
        <section className="main-feed panel">
          <div className="feed-topline"><span className="time-box"><Clock3 size={16}/>{clockLabel(now)}</span><span className="room-box"><ColoredGlyph room={room} compact/>{room.id} — {room.name}<b>DETAIL 3 · LIVE</b></span><span className={`timer-box ${timeLeft<=15?'critical':''}`}><Clock3 size={20}/>{`00:${String(timeLeft).padStart(2,'0')}`}</span></div>
          <div className="main-image">
            {level.id==='park' ? <ParkLive3D zoneId={selected} actors={actors} lightsOn={lights[selected]} trapActive={trapActive} playing={playing&&!levelFinished&&!feedClosed}/> : <RoomScene room={room} levelId={level.id} roomById={roomById} actors={actors} items={lostItems} lightsOn={lights[selected]} ghostRevealed={revealed} trapActive={trapActive} />}
            <div className="main-room-tag"><ColoredGlyph room={room} compact/>{room.id} · {room.name}</div>
            {scanResult && <div className="scan-result"><Zap size={15}/>{scanResult}</div>}
            {recentRoomSwitch&&<div className="room-transition">🚶 {recentRoomSwitch}</div>}
            {feedClosed && <div className="feed-closed"><Moon size={36}/><h2>INSPECTION CLOSED</h2><p>{focus.length===0?'Out of focus. Listen to stories or capture a ghost to restore it.':'The 60-second live view has ended.'}</p><button onClick={()=>changeRoom(selected)} disabled={focus.length===0}><Camera size={17}/> Reopen selected camera</button></div>}
            {!feedClosed&&<div className="feed-status"><Radio size={14}/> {level.id==='park'?'LIVE · 3D FIXED CAMERA':'LIVE · FULL MOTION'} <span className="feed-light">{lights[selected]?'☀ LIGHTS ON':'☾ LIGHTS OFF'}</span></div>}
            {isBank && !feedClosed && <div className="bank-live-actions">
              {suspectsHere.map(actor=><button key={actor.id} onClick={()=>alertSecurity(actor.id)} title="Radio resident security guards">🚨 REPORT SUSPECT</button>)}
              {droppedHere.map(item=><button key={item.id} onClick={()=>takeLostItem(item.id)}>👛 RECOVER {item.name.toUpperCase()}</button>)}
              {carriedItems.map(item=><button key={item.id} onClick={()=>deliverLostItem(item.id)}>📦 RETURN {item.name.toUpperCase()}</button>)}
            </div>}
            {!feedClosed && <div className="feed-actions"><button onClick={()=>toggleMute(selected)} title={muted[selected]?'Unmute this room':'Mute this room'}>{muted[selected]?<VolumeX size={17}/>:<Volume2 size={17}/>}</button><button onClick={()=>toggleLight(selected)} title="Toggle room light"><Lightbulb size={17}/></button><button className="trap-action" onClick={triggerTrap} title="Activate enchanted ghost trap"><Ghost size={16}/> {availableGhost?'CAPTURE GHOST':'ARM TRAP'}</button></div>}
          </div>
        </section>
        <section className="conversation-strip panel">
          <div className="conversation-title"><AudioLines size={22}/><div><b>LIVE CONVERSATION</b><span>Story clues · +4 focus each</span></div></div>
          <div className="talker"><span className="avatar male">{transcript.from?.[0] || 'A'}</span><div><strong>{transcript.from}</strong><p>“{transcript.a}”</p></div></div>
          <span className="talk-arrows">↔</span>
          <div className="talker"><span className="avatar female">{transcript.to?.[0] || 'B'}</span><div><strong>{transcript.to}</strong><p>“{transcript.b}”</p></div></div>
        </section>
        <section className="multi-cams panel">
          <div className="cameras-header"><span><Camera size={17}/><b>DETAIL 2</b> · {cameras.length} CAMERA FEEDS</span><span><span className="snap-pulse"/> STOP-MOTION <b>1.3s</b></span></div>
          <div className="camera-grid" style={{gridTemplateColumns:`repeat(${level.cameraColumns ?? 2},minmax(0,1fr))`,gridTemplateRows:`repeat(${level.cameraRows ?? 2},minmax(0,1fr))`}}>
            {displayedCameras.map((id,index)=>{
              const r=roomById[id];
              return <div key={`${index}-${id}`} className={`mini-camera ${selected===id?'camera-selected':''}`} style={iconColor(r)}>
                <div className="mini-video" onClick={()=>changeRoom(id)} role="button" tabIndex={0} onKeyDown={e=>{if(e.key==='Enter')changeRoom(id)}}>
                  {level.id==='park' ? <Park2DSnapshot zoneId={id} actors={snapshotActors} lightsOn={lights[id]} snapshotFrame={snapshotFrame}/> : <RoomScene room={r} levelId={level.id} roomById={roomById} actors={snapshotActors} snapshotFrame={snapshotFrame} items={lostItems} lightsOn={lights[id]} small />}
                  <div className="mini-header"><ColoredGlyph room={r} compact/><span>{r.id} — {r.name}</span></div>
                  <span className="snapshot-label">● {index+1} · SNAP</span>
                </div>
                <button className={`mini-mute ${muted[id]?'is-muted':''}`} onClick={()=>toggleMute(id)} title={muted[id]?'Unmute this camera':'Mute this camera'}>{muted[id]?<VolumeX size={20}/>:<Volume2 size={20}/>}</button>
                <button className="mini-change" onClick={()=>{const next=rooms.findIndex(rm=>rm.id===id);const newId=rooms[(next+1)%rooms.length].id;setCameras(prev=>prev.map((v,i)=>i===index?newId:v));announce(`Camera ${index+1} now monitors ${roomById[newId].name}.`)}} title="Cycle which room this camera monitors"><ChevronRight size={14}/></button>
              </div>;
            })}
          </div>
        </section>
      </main>
      <aside className="tools-area panel">
        <h2>GHOST TRAPS & TOOLS</h2>
        <div className="tool-list">{toolItems.map(tool=><button key={tool.name} className={`tool-line ${selectedTool===tool.name?'tool-selected':''}`} onClick={()=>useTool(tool)} title={tool.details}>
          <span className="tool-illustration" style={{color:tool.color}}>{tool.icon}</span><span>{tool.name}</span><span className="tool-count">×{tool.name==='Ghost Trap'?trapCount:tool.count}</span>
        </button>)}</div>
        <div className="tool-info"><div className="tool-info-heading"><span className="rune-icon">◎</span><b>{selectedTool}</b></div><p>{toolItems.find(t=>t.name===selectedTool)?.details}</p></div>
        <div className="tool-subpanel objectives-panel"><h3>MISSION CHECKLIST · {objectiveProgress.length}/5</h3>{level.objectives.map(goal=><label key={goal.id} className={`mission-goal ${objectiveProgress.includes(goal.id)?'done':''}`} title={goal.hint}><input type="checkbox" checked={objectiveProgress.includes(goal.id)} readOnly/><span>{goal.label}</span></label>)}</div>
        <div className="tool-subpanel"><h3>{level.activityLabel}</h3><p>👥 Residents: <b>{residentActors.length}</b> · Guests: <b>{guestActors.length}</b></p><p>🐾 Animals: <b>{actors.filter(a=>a.kind==='animal').length}</b></p>{isBank && <p>👮 Guards: <b>{actors.filter(a=>a.role==='security guard').length}</b> · 💼 Employees: <b>{actors.filter(a=>a.role.includes('bank employee')).length}</b> · 👛 Dropped items: <b>{lostItems.filter(item=>item.status==='dropped').length}</b></p>}{animalRolls.map(roll=><p className="animal-roll" key={roll.id}>{roll.role==='squirrel'?'🐿️':'🐈'} {roll.name}: <b>{roll.stay==='resident'?'Resident':'Guest'}</b></p>)}<p>💡 Rooms lit: <b>{litCount}/{level.mapFooterLitTotal}</b></p><p>👻 Ghost activity: <strong className="high-alert">{ghosts.length?'HIGH':'LOW'}</strong></p></div>
        <button className="help-button" onClick={()=>setShowHelp(v=>!v)}><CircleHelp size={16}/> How to play</button>
      </aside>
      <aside className="ticker-area panel">
        <h2><AudioLines size={17}/> INVESTIGATION TICKER</h2>
        <div className={`day-countdown ${dayRemaining<=60?'day-urgent':''}`}><Clock3 size={16}/><span>{level.roleSchedules ? formatParkTime(level.dayDurationSeconds - dayRemaining) : 'DAY ENDS IN'}</span><strong>{minutesLabel(dayRemaining)}</strong></div>
        <div className="mission-ticker">MISSION <strong>{objectiveProgress.length}/5</strong> COMPLETE</div>
        <Meter focus={focus}/>
        <div className="resource-card cyan-card"><div className="resource-title"><Eye size={19}/><b>VIEW TIME</b><span>−1 / 4.5 sec</span></div><div className="resource-preview"><span style={{width:`${focus.length/MAX_FOCUS*100}%`}}/></div><p>Looking at a live room spends one focus segment every 4.5 seconds.</p></div>
        <div className="resource-card gold-card"><div className="resource-title"><BookOpen size={19}/><b>STORY POINTS</b><span>+4</span></div><div className="resource-preview"><span style={{width:`${earnedStory/MAX_FOCUS*100}%`}}/></div><p>Listen to important story beats to refill <b>gold</b> segments.</p></div>
        <div className="resource-card magenta-card"><div className="resource-title"><Ghost size={19}/><b>GHOST CAPTURE</b><span>+7</span></div><div className="resource-preview"><span style={{width:`${earnedGhost/MAX_FOCUS*100}%`}}/></div><p>Capture a spirit with a trap to refill <b>magenta</b> segments.</p></div>
        <div className="stories-panel"><h3><BookOpen size={15}/> LISTEN FOR STORY POINTS</h3>
          {storyEvents.map(story=><button key={story.id} disabled={heardStories.includes(story.id)} className={`story-entry ${heardStories.includes(story.id)?'heard':''}`} onClick={()=>hearStory(story)} title={muted[story.room]?'Unmute this room first':story.text}>
            <ColoredGlyph room={roomById[story.room]} compact/><span>{story.who} · {story.room}</span><b>{heardStories.includes(story.id)?'✓':`+${story.reward}`}</b>
          </button>)}
        </div>
        <div className="ticker-legend"><b>TICKER LEGEND</b><p><i className="legend-cyan"/> Base focus · spent watching</p><p><i className="legend-gold"/> Story reward · refreshed</p><p><i className="legend-magenta"/> Ghost reward · refreshed</p><p><i className="legend-empty"/> Empty · unavailable</p></div>
      </aside>
    </div>
    <div className="bottom-status panel"><div className="playback"><button onClick={()=>setPlaying(v=>!v)} title={playing?'Pause simulation':'Resume simulation'}>{playing?<Pause size={19}/>:<Play size={19}/>}</button><button onClick={()=>setSpeed(s=>s===1?2:1)} title="Toggle simulation speed">{speed}×</button><span className={`live-state ${playing?'':'paused'}`}><span/> {playing?'LIVE':'PAUSED'}</span></div>
      <div className="bottom-section-label"><Home size={19}/><b>DETAIL 1</b> · {level.detail1Name}</div><div className="bottom-section-label"><Camera size={18}/><b>DETAIL 2</b> · {level.detail2Name}</div><div className="bottom-section-label selected-stage"><Radio size={18}/><b>DETAIL 3</b> · {level.detail3Name}</div>
      <span className="bottom-metrics"><FileText size={16}/> EVIDENCE <b>{evidence.length}/3</b></span><span className="bottom-metrics"><Ghost size={16}/> ACTIVITY <b>{ghosts.length?'HIGH':'LOW'}</b></span>
    </div>
    <div className="toast" role="status">{notice}</div>
    {levelFinished && <div className="game-end-backdrop" role="dialog" aria-modal="true" aria-labelledby="game-end-heading">
      <div className={`game-end-panel panel ${outcome.state==='won'?'game-won':'game-lost'}`}>
        <div className="game-end-icon">{outcome.state==='won'?'🏆':'🌑'}</div>
        <h2 id="game-end-heading">{outcome.state==='won'?'LEVEL COMPLETE!':'GAME OVER'}</h2>
        <p>{outcome.state==='won'?'All five objectives completed before the day ended!':outcome.reason==='day'?'The day ended before you finished all five objectives.':'Your investigation focus ran out before you finished all five objectives.'}</p>
        <div className="game-end-stats"><span>Objectives: <b>{objectiveProgress.length}/5</b></span><span>Day remaining: <b>{minutesLabel(dayRemaining)}</b></span><span>Focus: <b>{focus.length}/{MAX_FOCUS}</b></span></div>
        <div className="game-end-checklist">{level.objectives.map(goal=><div key={goal.id} className={objectiveProgress.includes(goal.id)?'complete':''}>{objectiveProgress.includes(goal.id)?'✓':'○'} {goal.label}</div>)}</div>
        <div className="game-end-actions"><button onClick={()=>loadLevel(activeLevelId)}>↻ Retry level (reroll animals)</button><button onClick={()=>loadLevel(activeLevelId==='house'?'park':activeLevelId==='park'?'bank':'house')}>Next level</button></div>
      </div>
    </div>}
    {showHelp&&<div className="help-backdrop" onClick={()=>setShowHelp(false)}><div className="help-modal panel" onClick={e=>e.stopPropagation()}><button className="close-help" onClick={()=>setShowHelp(false)}>×</button><h2>👻 {level.helpTitle}</h2>{level.helpSteps.map((step, i)=><p key={i}><b>{i+1}.</b> {step}</p>)}<button className="wide-button" onClick={()=>setShowHelp(false)}>Start investigating</button></div></div>}
  </div>;
}
