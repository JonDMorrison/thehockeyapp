interface StarterInput {
  type: "day_card"|"week_plan";date?: string;start_date?: string;tier: "rec"|"rep"|"elite";
  time_budget: number;days_per_week?: number;keep_simple?: boolean;allowed_task_types: string[];
  focus_areas?: string[];
  schedule_events?: Array<{date:string;event_type:string}>;
}
export function starterWorkout(input: StarterInput) {
  const perWeek:Record<number,number[]>={1:[0],2:[0,3],3:[0,2,4],4:[0,2,4,6],5:[0,1,3,4,6],6:[0,1,2,4,5,6],7:[0,1,2,3,4,5,6]};
  const buildDay=(date:string)=>{
    const iceDay=Boolean(input.schedule_events?.some(event=>event.date===date));
    const shots={rec:25,rep:50,elite:75}[input.tier];
    const focus=(input.focus_areas??[]).join(" ").toLowerCase();
    const puck=/(puck|stickhandling)/.test(focus);
    const backhand=focus.includes("backhand");
    const tasks=[
      ...(puck?[{task_type:"other",label:"Controlled puck touches",target_type:"minutes",target_value:3,shot_type:"none",shots_expected:null,is_required:true}]:[]),
      {task_type:"shooting",label:backhand?"Backhand shots":"Wrist shots",target_type:"none",target_value:null,shot_type:backhand?"backhand":"wrist",shots_expected:iceDay?Math.ceil(shots/2):shots,is_required:true},
      {task_type:"mobility",label:"Easy mobility",target_type:"minutes",target_value:3,shot_type:"none",shots_expected:null,is_required:true},
      {task_type:"prep",label:"Ready position and focus",target_type:"minutes",target_value:2,shot_type:"none",shots_expected:null,is_required:true},
      {task_type:"conditioning",label:"Light footwork",target_type:"seconds",target_value:30,shot_type:"none",shots_expected:null,is_required:true},
      {task_type:"recovery",label:"Easy recovery",target_type:"minutes",target_value:3,shot_type:"none",shots_expected:null,is_required:true},
    ].filter(task=>input.allowed_task_types.includes(task.task_type)&&!(task.task_type==="conditioning"&&(iceDay||input.time_budget<15)&&input.allowed_task_types.some(type=>type!=="conditioning"))).slice(0,input.keep_simple?3:4);
    return {date,title:iceDay?"Light starter session":"Starter skills session",tier:input.tier,estimated_minutes:Math.min(input.time_budget,iceDay?10:15),notes:"Starter template: review and adjust the activities for your players before publishing.",tasks};
  };
  if(input.type==="day_card")return buildDay(input.date!);
  return {name:"Starter skills week",tier:input.tier,start_date:input.start_date,days:perWeek[input.days_per_week??5].map(offset=>{const date=new Date(input.start_date+"T12:00:00Z");date.setUTCDate(date.getUTCDate()+offset);return buildDay(date.toISOString().slice(0,10));})};
}
