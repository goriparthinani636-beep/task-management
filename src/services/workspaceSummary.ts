export type SummaryTask = { id: number; title: string; description?: string; employeeId: number; status: string; priority: string;
  employee?: { firstName: string; lastName: string } };
type Person = { id: number; firstName: string; lastName: string };
export function taskSummary(tasks: SummaryTask[]) {
  const completed = tasks.filter(t => t.status.toLowerCase() === 'completed').length;
  return { total: tasks.length, completed,
    pending: tasks.filter(t => t.status.toLowerCase() === 'pending').length,
    inProgress: tasks.filter(t => t.status.toLowerCase() === 'inprogress').length,
    urgent: tasks.filter(t => t.priority.toLowerCase() === 'high' && t.status.toLowerCase() !== 'completed').length,
    completionPercent: tasks.length ? Math.round(completed / tasks.length * 100) : 0 };
}
export function indiaWorkDate(date = new Date()) { return new Date(date.getTime() + 330 * 60000).toISOString().slice(0, 10); }
export function todayAttendanceCount(records: { employeeId: number; workDate: string }[], date = new Date()) {
  const today = indiaWorkDate(date);
  return new Set(records.filter(r => r.workDate.slice(0, 10) === today).map(r => r.employeeId)).size;
}
export function searchTaskList<T extends SummaryTask>(tasks: T[], people: Person[], query: string, status: string, highOnly = false, focusedId: number | null = null): T[] {
  const term = query.trim().toLowerCase();
  return tasks.filter(task => {
    if (focusedId !== null) return task.id === focusedId;
    if (status !== 'All' && task.status.toLowerCase() !== status.toLowerCase()) return false;
    if (highOnly && task.priority.toLowerCase() !== 'high') return false;
    const person = task.employee ?? people.find(p => p.id === task.employeeId);
    return !term || [task.title, task.description, person ? `${person.firstName} ${person.lastName}` : '', String(task.id)]
      .some(value => value?.toLowerCase().includes(term));
  });
}
