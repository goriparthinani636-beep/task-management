const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function load(path, dependencies = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText, { exports, require: name => dependencies[name] });
  return exports;
}
function deferred() { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; }
const { createPushDeviceSession } = load('src/services/pushDeviceSession.ts');
function setup(overrides = {}) {
  const calls = [], statuses = [];
  let stored = null;
  const deps = {
    getPushToken: async () => 'ExpoPushToken[new]',
    getSession: async () => ({ userId: 1, accessToken: 'account-1' }),
    readToken: async () => stored,
    writeToken: async token => { stored = token; },
    register: async (token, account) => { calls.push(['register', token, account.userId]); },
    unregister: async (token, account) => { calls.push(['unregister', token, account.userId]); },
    onStatus: message => statuses.push(message), ...overrides,
  };
  return { session: createPushDeviceSession(deps), calls, statuses, deps, setStored: token => { stored = token; }, stored: () => stored };
}

test('registration saves the installation token for the authenticated account', async () => {
  const s = setup(); s.session.activate(1); await s.session.sync(true);
  assert.deepEqual(s.calls, [['register', 'ExpoPushToken[new]', 1]]);
  assert.equal(s.stored(), 'ExpoPushToken[new]');
});

test('a permission prompt completing after logout cannot register the old account', async () => {
  const gate = deferred();
  const s = setup({ getPushToken: () => gate.promise });
  s.session.activate(1); const pending = s.session.sync(true);
  s.session.stop(); gate.resolve('ExpoPushToken[old]'); await pending;
  assert.equal(s.calls.length, 0); assert.equal(s.statuses.length, 0);
});

test('account switching serializes writes and does not let the old completion replace new status', async () => {
  const firstStarted = deferred(), releaseFirst = deferred(); let owner = 1;
  const s = setup({ getSession: async () => ({ userId: owner, accessToken: `account-${owner}` }),
    register: async (_, account) => {
      s.calls.push(['register', account.userId]);
      if (account.userId === 1) { firstStarted.resolve(); await releaseFirst.promise; }
    } });
  s.session.activate(1); const first = s.session.sync(true); await firstStarted.promise;
  owner = 2; s.session.activate(2); const second = s.session.sync(true);
  releaseFirst.resolve(); await Promise.all([first, second]);
  assert.deepEqual(s.calls, [['register', 1], ['register', 2]]);
  assert.equal(s.statuses.length, 1);
});

test('a changed authentication identity cannot bind the token to the wrong account', async () => {
  const s = setup({ getSession: async () => ({ userId: 2, accessToken: 'other-account' }) });
  s.session.activate(1); await s.session.sync(); assert.equal(s.calls.length, 0);
});

test('denied permission removes an existing registration and reports the disabled state', async () => {
  const s = setup({ getPushToken: async () => null }); s.setStored('ExpoPushToken[previous]');
  s.session.activate(1); await s.session.sync();
  assert.deepEqual(s.calls, [['unregister', 'ExpoPushToken[previous]', 1]]);
  assert.equal(s.stored(), null); assert.match(s.statuses[0], /Notifications are off/);
});

test('rotating a native token removes the old registration before saving the new one', async () => {
  const s = setup(); s.setStored('ExpoPushToken[previous]'); s.session.activate(1); await s.session.sync();
  assert.deepEqual(s.calls, [['unregister', 'ExpoPushToken[previous]', 1], ['register', 'ExpoPushToken[new]', 1]]);
});

test('registration network failure does not reject login and remains retryable', async () => {
  let fail = true;
  const s = setup({ register: async () => { if (fail) throw Error('network'); } });
  s.session.activate(1); await s.session.sync(); assert.match(s.statuses[0], /could not be registered/);
  fail = false; await s.session.sync(); assert.match(s.statuses.at(-1), /enabled/);
});

test('concurrent foreground and login synchronization share one registration', async () => {
  let count = 0;
  const s = setup({ getPushToken: async () => { count++; return 'ExpoPushToken[new]'; } });
  s.session.activate(1); await Promise.all([s.session.sync(), s.session.sync()]); assert.equal(count, 1);
});

test('notification taps accept only a valid task for the signed-in recipient', () => {
  const { notificationTaskId } = load('src/services/notificationTarget.ts');
  const user = { id: 5, employeeId: 4 };
  const data = { type: 'task-assigned', taskId: 10, recipientUserId: 5, employeeId: 4 };
  assert.equal(notificationTaskId(data, user), 10);
  for (const invalid of [undefined, { ...data, recipientUserId: 10 }, { ...data, employeeId: 9 },
    { ...data, taskId: -1 }, { ...data, taskId: '10' }, { ...data, type: 'unknown' }])
    assert.equal(notificationTaskId(invalid, user), null);
  assert.equal(notificationTaskId(data, null), null);
});

test('native registration configures Android channel before permission and uses the EAS project ID', async () => {
  const calls = [];
  const target = load('src/services/notificationTarget.ts');
  const notifications = {
    setNotificationHandler: handler => { calls.push(['handler', handler]); },
    AndroidImportance: { HIGH: 4 },
    setNotificationChannelAsync: async id => { calls.push(['channel', id]); },
    getPermissionsAsync: async () => { calls.push(['permission']); return { status: 'undetermined', canAskAgain: true }; },
    requestPermissionsAsync: async () => ({ status: 'granted' }),
    getExpoPushTokenAsync: async options => { assert.equal(options.projectId, 'eas-project'); return { data: 'ExpoPushToken[test]' }; },
  };
  const service = load('src/services/notifications.ts', { 'expo-notifications': notifications,
    'expo-constants': { __esModule: true, default: { executionEnvironment: 'standalone', expoConfig: { extra: { eas: { projectId: 'eas-project' } } } } },
    'react-native': { Platform: { OS: 'android' } }, './notificationTarget': target });
  assert.equal(await service.registerForPushNotificationsAsync(), 'ExpoPushToken[test]');
  assert.equal(calls[1][0], 'channel'); assert.equal(calls[2][0], 'permission');
});
