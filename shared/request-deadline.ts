/** Business hours run continuously on weekdays in Belém; weekends pause the clock. No holiday calendar. */
export function requestDeadline(type:string,now=new Date()){
 let due=new Date(now),remaining=(type==='remover_conteudo'?48:120)*3600000;
 const weekday=new Intl.DateTimeFormat('en-US',{weekday:'short',timeZone:'America/Belem'});
 const clock=new Intl.DateTimeFormat('en-GB',{hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23',timeZone:'America/Belem'});
 while(remaining>0){
  const parts=clock.formatToParts(due),value=(type:string)=>Number(parts.find(part=>part.type===type)?.value||0);
  const untilMidnight=86400000-((value('hour')*60+value('minute'))*60+value('second'))*1000-due.getUTCMilliseconds();
  const weekend=['Sat','Sun'].includes(weekday.format(due));
  const advance=weekend?untilMidnight:Math.min(untilMidnight,remaining);
  if(!weekend)remaining-=advance;due=new Date(due.getTime()+advance);
 }
 return due.toISOString();
}
