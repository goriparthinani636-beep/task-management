const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function load(path, dependencies) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText, { exports, require: name => dependencies[name], setTimeout, clearTimeout, Date });
  return exports;
}
const user = { id: 2, name: 'Lahari A', email: 'lahari@gmail.com', role: 'Employee', employeeId: 4 };

test('personal details request uses the authenticated endpoint and verifies profile ownership', async () => {
  const profile = { id: 4, email: 'lahari@gmail.com', firstName: 'Lahari' };
  const module = load('src/services/employeeScope.ts', { './api': { api: { get: async path => {
    assert.equal(path, '/employees/me'); return { data: profile };
  } } } });
  assert.equal((await module.loadMyEmployee(user)).id, 4);
});

test('Raju or an unfiltered employee list can never be displayed for Lahari', async () => {
  for (const data of [{ id: 9, email: 'raju@gmail.com' }, [{ id: 9, email: 'raju@gmail.com' }]]) {
    const module = load('src/services/employeeScope.ts', { './api': { api: { get: async () => ({ data }) } } });
    await assert.rejects(module.loadMyEmployee(user), /different employee profile/);
  }
});

test('login rejects mismatched accounts and legacy responses with no employee link', () => {
  const module = load('src/services/employeeScope.ts', {});
  assert.equal(module.validateSessionUser(user, 'LAHARI@gmail.com', 'Employee').employeeId, 4);
  assert.throws(() => module.validateSessionUser(user, 'srikanth@gmail.com', 'Employee'), /different login/);
  assert.throws(() => module.validateSessionUser({ ...user, employeeId: null }), /Deploy the updated/);
});

test('employee tasks use the personal endpoint and reject another employee task', async () => {
  let records = [{ id: 1, employeeId: 4 }];
  const module = load('src/services/employeeScope.ts', { './api': { api: { get: async path => {
    assert.equal(path, '/employees/me/tasks'); return { data: records };
  } } } });
  assert.equal((await module.loadScopedTasks(user)).length, 1);
  records = [{ id: 2, employeeId: 9 }];
  await assert.rejects(module.loadScopedTasks(user), /different employee/);
});

function attendance(overrides = {}, api = { get: async () => ({ data: { latitude: 17, longitude: 78, radiusMeters: 500 } }) }) {
  const location = {
    requestForegroundPermissionsAsync: async () => ({ granted: true }),
    hasServicesEnabledAsync: async () => true,
    getCurrentPositionAsync: async () => { throw Error('GPS unavailable'); },
    getLastKnownPositionAsync: async () => null,
    Accuracy: { High: 4 }, ...overrides,
  };
  return load('src/services/attendanceLocation.ts', {
    'expo-location': location, 'react-native': { Platform: { OS: 'android' } }, './api': { api },
  });
}

test('missing live attendance API reports deployment failure instead of a GPS error', async () => {
  const module = attendance({}, { get: async () => { throw { response: { status: 404 } }; } });
  await assert.rejects(module.getAttendanceOffice(), error => error.title === 'Attendance service unavailable' && /Deploy/.test(error.message));
});

test('office radius is taken from the server as 500 metres', async () => {
  assert.equal((await attendance().getAttendanceOffice()).radiusMeters, 500);
});

test('failed GPS can use a recent accurate fix but rejects stale or inaccurate cached data', async () => {
  const recent = { timestamp: Date.now(), coords: { latitude: 17, longitude: 78, accuracy: 30 } };
  assert.equal((await attendance({ getLastKnownPositionAsync: async () => recent }).getAttendanceLocation()).coords.accuracy, 30);
  for (const fix of [{ ...recent, timestamp: Date.now() - 60000 }, { ...recent, coords: { ...recent.coords, accuracy: 1000 } }])
    await assert.rejects(attendance({ getLastKnownPositionAsync: async () => fix }).getAttendanceLocation(), /Enable precise location/);
});

test('disabled Android location requests provider enablement and permission denial is actionable', async () => {
  let enabled = false;
  const fix = { timestamp: Date.now(), coords: { latitude: 17, longitude: 78, accuracy: 10 } };
  const module = attendance({ hasServicesEnabledAsync: async () => enabled,
    enableNetworkProviderAsync: async () => { enabled = true; }, getCurrentPositionAsync: async () => fix });
  assert.equal((await module.getAttendanceLocation()).coords.accuracy, 10);
  assert.equal(enabled, true);
  await assert.rejects(attendance({ requestForegroundPermissionsAsync: async () => ({ granted: false }) }).getAttendanceLocation(),
    error => error.title === 'Location permission required');
});
