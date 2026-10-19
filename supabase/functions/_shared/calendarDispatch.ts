/** Refresh the oldest connections in bounded batches, including private home calendars. */
export async function dispatchCalendarSources(client: any, projectUrl: string, serviceKey: string, fetcher: typeof fetch = fetch) {
  const tasks: Array<{action:string;team_id?:string;player_id?:string}> = [];
  for (const [table, column, action] of [['team_schedule_sources','team_id','sync'],['solo_schedule_sources','player_id','sync_solo']]) {
    const {data,error} = await client.from(table).select(column).eq('source_type','teamsnap_ical').order('updated_at',{ascending:true,nullsFirst:true}).limit(12);
    if (error) throw new Error('Could not read calendar connections');
    for (const row of data || []) tasks.push({action,[column]:row[column]});
  }
  let synced=0, failed=0;
  for(let index=0;index<tasks.length;index+=4){
    const results=await Promise.allSettled(tasks.slice(index,index+4).map(async body=>{
      const response=await fetcher(`${projectUrl}/functions/v1/sync-schedule`,{
        method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${serviceKey}`},body:JSON.stringify(body),signal:AbortSignal.timeout(18_000),
      });
      if(!response.ok)throw new Error('Calendar refresh failed');
      const result=await response.json();
      if(result.success!==true)throw new Error('Calendar refresh was not saved');
    }));
    for(const result of results)if(result.status==='fulfilled')synced++;else failed++;
  }
  return {success:failed===0,synced,failed,total:tasks.length};
}
