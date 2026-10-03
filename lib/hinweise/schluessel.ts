// One key per cause (decision 40): the same cause never yields a second hint. A key changes
// when the cause is a new one – a moved due date, new movement on a topic, a new handover.
const s = (d: Date) => Math.floor(d.getTime() / 1000);

export const schluessel = {
  overdue: (taskId: string, due: Date) => `overdue:${taskId}:${s(due)}`,
  zusage: (taskId: string, due: Date) => `waiting:task:${taskId}:${s(due)}`,
  mail: (entryId: string, userId: string | null) => `waiting:mail:${entryId}:${userId ?? 'team'}`,
  stale: (matterId: string, lastAt: Date) => `stale:${matterId}:${s(lastAt)}`,
  handover: (matterId: string, to: string) => `handover:${matterId}:${to}`,
  nachTermin: (entryId: string, start: Date) => `after_event:${entryId}:${s(start)}`,
  outcome: (matterId: string, actionId: string) => `outcome:${matterId}:${actionId}`,
  rat: (matterId: string) => `advice:${matterId}`,
  vorgaenger: (matterId: string) => `vorgaenger:${matterId}`,
};
