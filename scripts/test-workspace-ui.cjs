const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const exportsForTest = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/services/workspaceSummary.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText, { exports: exportsForTest, Date, Set });
const { taskSummary, todayAttendanceCount, indiaWorkDate, searchTaskList } = exportsForTest;
const people = [{ id: 4, firstName: 'Maya', lastName: 'Rao' }, { id: 5, firstName: 'Arun', lastName: 'Sen' }];
const tasks = [
  { id: 1, title: 'Review onboarding', description: 'Mobile screens', employeeId: 4, status: 'InProgress', priority: 'High' },
  { id: 2, title: 'Weekly report', employeeId: 5, status: 'Pending', priority: 'Medium' },
  { id: 3, title: 'Design audit', employeeId: 4, status: 'Completed', priority: 'High' },
];
test('dashboard counts completed tasks and only unfinished high priority work', () => {
  const result = taskSummary(tasks);
  assert.equal(result.total, 3); assert.equal(result.completed, 1);
  assert.equal(result.inProgress, 1); assert.equal(result.pending, 1);
  assert.equal(result.urgent, 1); assert.equal(result.completionPercent, 33);
});
test('empty task lists produce finite progress and no invented work', () => {
  assert.equal(taskSummary([]).completionPercent, 0);
  assert.equal(taskSummary([]).urgent, 0);
});
test('today attendance uses the Indian work date across UTC midnight', () => {
  const now = new Date('2026-10-28T19:00:00Z');
  assert.equal(indiaWorkDate(now), '2026-10-29');
  assert.equal(todayAttendanceCount([
    { employeeId: 4, workDate: '2026-10-29' }, { employeeId: 4, workDate: '2026-10-29' },
    { employeeId: 5, workDate: '2026-10-28' }, { employeeId: 6, workDate: '2026-10-29' },
  ], now), 2);
});
test('task search matches title, description and full assignee name without case sensitivity', () => {
  assert.equal(searchTaskList(tasks, people, '  MAYA RAO  ', 'All').length, 2);
  assert.equal(searchTaskList(tasks, people, 'mobile', 'All')[0].id, 1);
  assert.equal(searchTaskList(tasks, people, 'weekly', 'All')[0].id, 2);
});
test('status and priority filters combine with task search', () => {
  assert.equal(searchTaskList(tasks, people, 'Maya', 'Completed', true)[0].id, 3);
  assert.equal(searchTaskList(tasks, people, '', 'Pending', true).length, 0);
  assert.equal(searchTaskList(tasks, people, 'missing', 'All').length, 0);
});
test('notification task focus can only select an existing scoped task', () => {
  assert.equal(searchTaskList(tasks, people, 'old search', 'Pending', true, 3)[0].id, 3);
  assert.equal(searchTaskList(tasks, people, '', 'All', false, 999).length, 0);
});
test('task search also understands employee names embedded in the server task record', () => {
  const embedded = [{ ...tasks[0], employee: { firstName: 'Sara', lastName: 'Ali' } }];
  assert.equal(searchTaskList(embedded, [], 'Sara Ali', 'All')[0].id, 1);
});
