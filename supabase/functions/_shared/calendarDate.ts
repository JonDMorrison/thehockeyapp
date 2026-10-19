const fixedOffsets: Record<string, number> = { PST:-8,PDT:-7,MST:-7,MDT:-6,CST:-6,CDT:-5,EST:-5,EDT:-4,UTC:0,GMT:0 };
const aliases: Record<string,string> = {Pacific:'America/Vancouver',Mountain:'America/Denver',Central:'America/Chicago',Eastern:'America/New_York'};

/** Resolve wall time with the runtime's timezone database, including non-DST regions.
 * Repeated times use the first occurrence; skipped times use the preceding offset,
 * matching iCalendar's transition convention. Date-only behavior stays at noon UTC.
 */
export function parseICalDate(value: string, timezone?: string): Date {
  const match = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/i.exec(value);
  if (!match) throw new Error('The calendar contains an invalid date or time');
  const [,ys,ms,ds,hs,mins,ss,z] = match;
  const year=Number(ys), month=Number(ms), day=Number(ds), hour=Number(hs||0), minute=Number(mins||0), second=Number(ss||0);
  const wall=Date.UTC(year,month-1,day,hour,minute,second), check=new Date(wall);
  if(year<1000||check.getUTCFullYear()!==year||check.getUTCMonth()!==month-1||check.getUTCDate()!==day||hour>23||minute>59||second>59)throw new Error('The calendar contains an invalid date or time');
  if (!hs) return new Date(Date.UTC(year,month-1,day,12));
  if (z) return check;
  if (timezone && Object.hasOwn(fixedOffsets, timezone)) return new Date(wall-fixedOffsets[timezone]*3600000);
  const zone=aliases[timezone||''] || timezone || 'America/Vancouver';
  let formatter: Intl.DateTimeFormat;
  try { formatter=new Intl.DateTimeFormat('en-US',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}); }
  catch { throw new Error('The calendar uses an unsupported timezone'); }
  const localWall=(instant:number)=>{
    const parts=Object.fromEntries(formatter.formatToParts(new Date(instant)).map(part=>[part.type,part.value]));
    return Date.UTC(Number(parts.year),Number(parts.month)-1,Number(parts.day),Number(parts.hour),Number(parts.minute),Number(parts.second));
  };
  const offsets=new Set([-36,0,36].map(hours=>{const instant=wall+hours*3600000;return localWall(instant)-instant;}));
  const candidates=[...offsets].map(offset=>({instant:wall-offset,delta:localWall(wall-offset)-wall}));
  const matches=candidates.filter(candidate=>candidate.delta===0).sort((a,b)=>a.instant-b.instant);
  if(matches.length)return new Date(matches[0].instant);
  const gap=candidates.filter(candidate=>candidate.delta>0).sort((a,b)=>a.delta-b.delta);
  if(gap.length)return new Date(gap[0].instant);
  throw new Error('The calendar time could not be resolved');
}
