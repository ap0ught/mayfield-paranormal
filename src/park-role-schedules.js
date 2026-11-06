/**
 * PARK ROLE SCHEDULE — consumed by the opt-in runtime schedule engine.
 * Legacy `startTick` remains in use only for levels without `roleSchedules`.
 * One game second corresponds to one park clock minute in the 300-second demo day.
 */
const block = (start,end,zone,activity,priority='required') => ({start,end,zone,activity,priority});

const familyBlocks = [
  block(80,95,'S1','enter_and_find_shelter'),
  block(95,145,'S2','playground_visit'),
  block(145,182,'T1','bench_rest_and_snack'),
  block(182,195,'S2','finish_playing'),
  block(195,205,'S1','walk_to_exit'),
];

export const PARK_ROLE_SCHEDULES = {
  version: 1,
  levelId: 'park',
  status: 'runtime-active-park',
  clock: {
    gameStart: '16:00',
    gameEnd: '21:00',
    dayDurationSeconds: 300,
    gameMinutesPerSimulationSecond: 1,
    timeUnit: 'elapsed-game-seconds',
  },
  // This is a future level field, not an engine field today.
  actorPlans: [
    {templateId:'ranger',kind:'human',stay:'resident',job:'park_ranger',blocks:[
      block(0,30,'S1','open_shelter_and_check_lights'),
      block(30,70,'F1','inspect_north_field'),
      block(70,115,'F2','patrol_active_match'),
      block(115,150,'S2','playground_safety_check'),
      block(150,210,'T1','tree_path_and_bench_patrol'),
      block(210,255,'F3','field_safety_check'),
      block(255,300,'S1','close_shelter_and_sign_out'),
    ]},
    {templateId:'coach',kind:'human',stay:'resident',job:'soccer_coach',blocks:[
      block(0,20,'S1','check_team_roster'),
      block(20,35,'S2','playground_safety_briefing'),
      block(35,70,'F1','lead_warmups'),
      block(70,155,'F2','coach_match'),
      block(155,175,'S1','water_break'),
      block(175,255,'F3','coach_second_half'),
      block(255,300,'S1','team_debrief'),
    ]},
    {templateId:'player',kind:'human',stay:'resident',job:'soccer_player',blocks:[
      block(0,50,'F2','warm_up'),
      block(50,150,'F1','play_first_half'),
      block(150,175,'S1','hydration_break'),
      block(175,255,'F3','play_second_half'),
      block(255,300,'F2','cooldown'),
    ]},
    {templateId:'photo-mom',kind:'human',stay:'resident',job:'event_photographer',blocks:[
      block(0,45,'F1','photograph_warmups'),
      block(45,155,'F2','photograph_first_half'),
      block(155,240,'F3','photograph_second_half'),
      block(240,300,'F1','photograph_and_pack_equipment'),
    ]},
    {templateId:'park-dog',kind:'animal',stay:'resident',job:'park_companion',blocks:[
      block(0,60,'T1','rest_by_bench','preferred'),
      block(60,105,'S2','wander_near_playground','preferred'),
      block(105,155,'S1','drink_water','preferred'),
      block(155,240,'T1','patrol_tree_path','preferred'),
      block(240,300,'T1','rest','preferred'),
    ]},
    {templateId:'tree-line',kind:'ghost',stay:'resident',job:'haunt_tree_line',blocks:[
      block(0,90,'T1','tree_line_manifestation'),
      block(90,135,'S2','rattle_swing_chains'),
      block(135,245,'T1','whisper_near_bench'),
      block(245,300,'T1','dusk_apparition'),
    ]},
    {templateId:'midfield-echo',kind:'ghost',stay:'resident',job:'haunt_soccer_field',blocks:[
      block(0,50,'F2','field_light_interference'),
      block(50,95,'F1','footstep_echo'),
      block(95,210,'F2','whisper_during_match'),
      block(210,255,'F3','appear_near_goal'),
      block(255,300,'F2','final_apparition'),
    ]},
    {templateId:'quick-photog',visitId:'press-photographer',kind:'human',stay:'guest',job:'event_photographer',arrival:40,departure:95,entryZone:'S1',exitZone:'S1',blocks:[
      block(40,47,'S1','check_in'),
      block(47,64,'F1','photograph_sideline'),
      block(64,82,'F2','take_press_photos'),
      block(82,90,'F1','review_images'),
      block(90,95,'S1','depart'),
    ]},
    {templateId:'visiting-mom',visitId:'family-playdate',kind:'human',stay:'guest',job:'visiting_parent',arrival:80,departure:205,entryZone:'S1',exitZone:'S1',blocks:familyBlocks},
    {templateId:'child-ivy',visitId:'family-playdate',kind:'human',stay:'guest',job:'child_playground_visitor',arrival:80,departure:205,entryZone:'S1',exitZone:'S1',blocks:familyBlocks},
    {templateId:'child-noah',visitId:'family-playdate',kind:'human',stay:'guest',job:'child_playground_visitor',arrival:80,departure:205,entryZone:'S1',exitZone:'S1',blocks:familyBlocks},
    {templateId:'family-dog',visitId:'family-playdate',kind:'animal',stay:'guest',job:'family_companion',arrival:80,departure:205,entryZone:'S1',exitZone:'S1',blocks:familyBlocks},
    {templateId:'transient-spirit',visitId:'park-wisp',kind:'ghost',stay:'guest',job:'passing_apparition',arrival:220,departure:275,entryZone:'T1',exitZone:'S1',blocks:[
      block(220,238,'T1','appear_in_tree_line'),
      block(238,247,'F3','cross_behind_goal'),
      block(247,265,'F2','emit_whisper'),
      block(265,275,'S1','vanish_by_shelter'),
    ]},
    // Exactly one of the following variants is activated for each animal,
    // based on its independent 50/50 level-load residency roll.
    {templateId:'park-cat',kind:'animal',stay:'resident',job:'park_cat',blocks:[
      block(0,100,'T1','watch_birds','preferred'),
      block(100,170,'S2','prowl_playground','preferred'),
      block(170,220,'S1','rest_under_shelter','preferred'),
      block(220,300,'T1','return_to_bench','preferred'),
    ]},
    {templateId:'park-cat',kind:'animal',stay:'guest',job:'park_cat',arrival:125,departure:190,entryZone:'S1',exitZone:'S1',blocks:[
      block(125,145,'S1','enter_park','preferred'),
      block(145,170,'S2','investigate_swings','preferred'),
      block(170,180,'T1','watch_birds','preferred'),
      block(180,190,'S1','leave_park','preferred'),
    ]},
    {templateId:'park-squirrel',kind:'animal',stay:'resident',job:'tree_squirrel',blocks:[
      block(0,120,'T1','forage_for_acorns','preferred'),
      block(120,155,'S2','scurry_by_playground','preferred'),
      block(155,300,'T1','return_to_tree','preferred'),
    ]},
    {templateId:'park-squirrel',kind:'animal',stay:'guest',job:'tree_squirrel',arrival:65,departure:115,entryZone:'T1',exitZone:'T1',blocks:[
      block(65,90,'T1','arrive_from_trees','preferred'),
      block(90,105,'S2','scurry_by_swings','preferred'),
      block(105,115,'T1','leave_trees','preferred'),
    ]},
  ],
};
