export const releaseSchedule = [14,15].flatMap(day =>
  [9,10,11,12,14,15].map((hour,index,all) => {
    const date = (d: number,h: number,m=30) => `2026-10-${d}T${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:00-04:00`;
    const release = date(day,hour);
    const start = index === 0 ? date(day-1,15) : date(day,all[index-1]);
    const due = index < 5 ? date(day,all[index+1],25) : day === 14 ? date(15,9,25) : date(16,8,0);
    return {round:(day-14)*6+index+1,round_id:`2026-10-${day}_${String(hour).padStart(2,"0")}:30`,release,window_start:start,deadline:due};
  })
);
export function formatNewYork(value: string) {
  return new Intl.DateTimeFormat("en-US",{timeZone:"America/New_York",month:"short",day:"numeric",hour:"2-digit",minute:"2-digit",hour12:false}).format(new Date(value));
}
