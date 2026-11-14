export type DamageEvent = { time: number; amount: number };
export function damageSummary(events: DamageEvent[], now: number) {
  return {
    total: events.reduce((sum, event) => sum + event.amount, 0),
    hits: events.length,
    dps: events.reduce((sum, event) => sum + (event.time > now - 5 && event.time <= now ? event.amount : 0), 0) / 5,
  };
}
