const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, dependencies = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText, { exports, Date, Number, require: name => dependencies[name] });
  return exports;
}
const { validateLeave } = load('src/services/leaves.ts', { './api': { api: {} } });
const { notificationLeaveId } = load('src/services/notificationTarget.ts');
const today = '2026-10-30';
test('same-day and future leave requests are valid', () => {
  assert.equal(validateLeave(today, today, 'Medical appointment', today), null);
  assert.equal(validateLeave('2026-11-01', '2026-11-05', 'Family event', today), null);
});
test('invalid calendar dates and non ISO input are rejected', () => {
  for (const date of ['2026-02-30', '30-10-2026', '', '2026-13-01'])
    assert.ok(validateLeave(date, '2026-12-01', 'Reason', today));
});
test('past dates and reversed ranges are rejected', () => {
  assert.ok(validateLeave('2026-10-29', today, 'Reason', today));
  assert.ok(validateLeave('2026-11-05', '2026-11-04', 'Reason', today));
});
test('empty or oversized leave reasons are rejected', () => {
  assert.ok(validateLeave(today, today, '  ', today));
  assert.ok(validateLeave(today, today, 'x'.repeat(1001), today));
});
test('unbounded leave ranges are rejected', () => {
  assert.ok(validateLeave(today, '2028-01-01', 'Reason', today));
});
test('leave notification only opens for the correct account and employee', () => {
  const data = { type: 'leave-decision', leaveId: 7, recipientUserId: 2, employeeId: 4 };
  assert.equal(notificationLeaveId(data, { id: 2, employeeId: 4 }), 7);
  assert.equal(notificationLeaveId(data, { id: 3, employeeId: 4 }), null);
  assert.equal(notificationLeaveId(data, { id: 2, employeeId: 5 }), null);
  assert.equal(notificationLeaveId(data, null), null);
});
test('invalid leave IDs and unrelated notifications cannot open a leave', () => {
  const data = { type: 'leave-decision', leaveId: 7, recipientUserId: 2, employeeId: 4 };
  for (const leaveId of [0, -1, '7', 1.5, Number.MAX_SAFE_INTEGER + 1])
    assert.equal(notificationLeaveId({ ...data, leaveId }, { id: 2, employeeId: 4 }), null);
  assert.equal(notificationLeaveId({ ...data, type: 'task-assigned' }, { id: 2, employeeId: 4 }), null);
});
test('leave API sends no employee ID and uses manager decision endpoint', async () => {
  const calls = [];
  const api = {
    post: async (...args) => { calls.push(args); return { data: { id: 3 } }; },
    patch: async (...args) => { calls.push(args); return { data: { status: 'Approved' } }; },
  };
  const service = load('src/services/leaves.ts', { './api': { api } });
  await service.applyLeave({ startDate: today, endDate: today, leaveType: 'Casual', reason: 'Event' });
  assert.equal(calls[0][0], '/leaves');
  assert.equal('employeeId' in calls[0][1], false);
  await service.reviewLeave(3, 'Approved', 'Agreed');
  assert.equal(calls[1][0], '/leaves/3/decision');
  assert.equal(calls[1][1].status, 'Approved');
});

test('missing deployed leave API shows a clear deployment message', () => {
  const { leaveErrorMessage } = load('src/services/leaves.ts', { './api': { api: {} }, axios: require('axios') });
  assert.match(leaveErrorMessage({ isAxiosError: true, response: { status: 404, data: '' } }), /Deploy the updated EmployeeApi/);
  assert.match(leaveErrorMessage({ isAxiosError: true }), /internet connection/);
  assert.match(leaveErrorMessage({ isAxiosError: true, response: { status: 500 } }), /backend logs/);
  assert.equal(leaveErrorMessage({ isAxiosError: true, response: { status: 409, data: { message: 'Dates overlap.' } } }), 'Dates overlap.');
});
