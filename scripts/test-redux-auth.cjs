const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const cache = new Map();
function load(file) {
  file = path.resolve(file);
  if (cache.has(file)) return cache.get(file);
  const exports = {};
  cache.set(file, exports);
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText, {
    exports, process,
    require: name => name.startsWith('.') ? load(path.resolve(path.dirname(file), name + '.ts')) : require(name),
  });
  return exports;
}
const { createAppStore } = load('src/store/store.ts');
const { login, logout, restoreSession } = load('src/store/authOperations.ts');
const { selectCurrentUser, sessionCleared, notificationStatusChanged } = load('src/store/authSlice.ts');
const employee = { id: 10, employeeId: 4, name: 'Example Employee', email: 'person@example.com', role: 'Employee' };
function deferred() { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; }

function setup(overrides = {}, saved = [null, null]) {
  let [access, refresh] = saved;
  const calls = [];
  const services = {
    api: {
      post: async (url, body) => {
        calls.push([url, body]);
        return { data: { user: employee, accessToken: 'private-access', refreshToken: 'private-refresh' } };
      },
      get: async url => { calls.push([url]); return { data: { user: employee } }; },
    },
    storage: {
      getAccessToken: async () => access,
      getRefreshToken: async () => refresh,
      clearTokens: async () => { access = refresh = null; },
      saveTokens: async (a, r, current = () => true) => { if (current()) { access = a; refresh = r; } },
    },
    validateUser: (user, email, role) => {
      if (!user || (user.role === 'Employee' && !user.employeeId) ||
          (email && user.email !== email.trim()) || (role && user.role !== role))
        throw new Error('Different or missing employee account.');
      return user;
    },
    resetApiSession: () => calls.push(['reset']),
    stopNotifications: () => calls.push(['stop-notifications']),
    ...overrides,
  };
  return { store: createAppStore(services), services, calls, tokens: () => [access, refresh] };
}

test('login shares the validated user while keeping passwords and both tokens outside Redux', async () => {
  const s = setup();
  await s.store.dispatch(login(' person@example.com ', 'private-password', 'Employee'));
  assert.equal(s.store.getState().auth.isAuthenticated, true);
  assert.equal(selectCurrentUser(s.store.getState()).employeeId, 4);
  assert.deepEqual(s.tokens(), ['private-access', 'private-refresh']);
  const state = JSON.stringify(s.store.getState());
  for (const secret of ['private-access', 'private-refresh', 'private-password']) assert.equal(state.includes(secret), false);
  assert.equal(s.calls.find(([url]) => url === '/auth/login')[1].email, 'person@example.com');
});

test('a different employee response cannot authenticate or save credentials', async () => {
  const s = setup();
  await assert.rejects(s.store.dispatch(login('other@example.com', 'password', 'Employee')), /Different/);
  assert.equal(s.store.getState().auth.user, null);
  assert.equal(s.store.getState().auth.isSigningIn, false);
  assert.deepEqual(s.tokens(), [null, null]);
});

test('manager login needs no employee link and drops unexpected user fields from Redux actions', async () => {
  const s = setup();
  const manager = { ...employee, id: 20, role: 'Manager', employeeId: null, passwordHash: 'never-in-redux' };
  s.services.api.post = async () => ({ data: {
    user: manager, accessToken: 'manager-access', refreshToken: 'manager-refresh',
  } });
  await s.store.dispatch(login(manager.email, 'password', 'Manager'));
  assert.equal(s.store.getState().auth.user.role, 'Manager');
  assert.equal(s.store.getState().auth.user.employeeId, null);
  assert.equal(JSON.stringify(s.store.getState()).includes('never-in-redux'), false);
});

test('incomplete token response leaves the form available for retry', async () => {
  const s = setup({ api: { post: async () => ({ data: { user: employee } }) } });
  await assert.rejects(s.store.dispatch(login(employee.email, 'password', 'Employee')), /missing session tokens/);
  assert.equal(s.store.getState().auth.isAuthenticated, false);
  assert.equal(s.store.getState().auth.isSigningIn, false);
});

test('app restart validates the saved session before showing protected screens', async () => {
  const s = setup({}, ['saved-access', 'saved-refresh']);
  await s.store.dispatch(restoreSession());
  assert.equal(s.store.getState().auth.isLoading, false);
  assert.equal(s.store.getState().auth.isAuthenticated, true);
  assert.equal(s.calls.filter(([url]) => url === '/auth/me').length, 1);
  await s.store.dispatch(restoreSession());
  assert.equal(s.calls.filter(([url]) => url === '/auth/me').length, 1);
});

test('incomplete saved credentials are cleared without calling the profile API', async () => {
  const s = setup({}, ['saved-access', null]);
  await s.store.dispatch(restoreSession());
  assert.deepEqual(s.tokens(), [null, null]);
  assert.equal(s.store.getState().auth.isAuthenticated, false);
  assert.equal(s.calls.length, 0);
});

test('temporary restore network errors preserve saved tokens', async () => {
  const s = setup({ api: { get: async () => { throw Error('offline'); } } }, ['saved-access', 'saved-refresh']);
  await s.store.dispatch(restoreSession());
  assert.deepEqual(s.tokens(), ['saved-access', 'saved-refresh']);
  assert.equal(s.store.getState().auth.isLoading, false);
});

test('offline logout clears Redux, notifications and secure credentials', async () => {
  const s = setup();
  await s.store.dispatch(login(employee.email, 'password', 'Employee'));
  s.services.api.post = async () => { throw Error('offline'); };
  await s.store.dispatch(logout());
  assert.equal(s.store.getState().auth.user, null);
  assert.equal(s.store.getState().auth.isAuthenticated, false);
  assert.equal(s.store.getState().auth.isLoggingOut, false);
  assert.deepEqual(s.tokens(), [null, null]);
  assert.equal(s.calls.filter(([url]) => url === 'stop-notifications').length, 2);
});

test('a late restore response cannot overwrite a newer login', async () => {
  const gate = deferred(), started = deferred();
  const s = setup({}, ['saved-access', 'saved-refresh']);
  s.services.api.get = async () => { started.resolve(); await gate.promise; return { data: { user: employee } }; };
  const restoring = s.store.dispatch(restoreSession());
  await started.promise;
  const manager = { ...employee, id: 20, name: 'Manager', role: 'Manager' };
  s.services.validateUser = u => u;
  s.services.api.post = async () => ({ data: { user: manager, accessToken: 'new-access', refreshToken: 'new-refresh' } });
  await s.store.dispatch(login(manager.email, 'password', 'Manager'));
  gate.resolve(); await restoring;
  assert.equal(s.store.getState().auth.user.id, 20);
  assert.deepEqual(s.tokens(), ['new-access', 'new-refresh']);
});

test('a login response finishing after logout cannot sign the old employee back in', async () => {
  const gate = deferred(), started = deferred();
  const s = setup();
  s.services.api.post = async url => {
    if (url === '/auth/login') { started.resolve(); await gate.promise; }
    return { data: { user: employee, accessToken: 'stale-access', refreshToken: 'stale-refresh' } };
  };
  const signingIn = s.store.dispatch(login(employee.email, 'password', 'Employee'));
  await started.promise;
  await s.store.dispatch(logout());
  gate.resolve(); await signingIn;
  assert.equal(s.store.getState().auth.isAuthenticated, false);
  assert.deepEqual(s.tokens(), [null, null]);
});

test('concurrent sign-in submissions send only one login request', async () => {
  const s = setup();
  await Promise.all([s.store.dispatch(login(employee.email, 'password', 'Employee')),
    s.store.dispatch(login(employee.email, 'password', 'Employee'))]);
  assert.equal(s.calls.filter(([url]) => url === '/auth/login').length, 1);
});

test('session expiry resets account data and notification status', async () => {
  const s = setup();
  await s.store.dispatch(login(employee.email, 'password', 'Employee'));
  s.store.dispatch(notificationStatusChanged('Enabled for this account'));
  s.store.dispatch(sessionCleared());
  assert.equal(s.store.getState().auth.user, null);
  assert.equal(s.store.getState().auth.isAuthenticated, false);
  assert.match(s.store.getState().auth.notificationStatus, /Sign in/);
});
