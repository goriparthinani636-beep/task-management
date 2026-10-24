const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const axios = require('axios');

function setup(refreshStatus = 200) {
  let accessToken = 'old-access';
  let refreshToken = 'old-refresh';
  let refreshCalls = 0;
  let expired = 0;
  const clients = [];
  const storage = {
    getAccessToken: async () => accessToken,
    getRefreshToken: async () => refreshToken,
    saveTokens: async (access, refresh) => { accessToken = access; refreshToken = refresh; },
    clearTokens: async () => { accessToken = null; refreshToken = null; },
  };
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/services/api.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText, {
    exports, process,
    require: name => name === 'axios' ? {
      ...axios,
      create: options => { const client = axios.create(options); clients.push(client); return client; },
    } : { secureStorage: storage },
  });
  const reject = (config, status) => Promise.reject(new axios.AxiosError(
    'Request failed', 'ERR_BAD_RESPONSE', config, null,
    { config, status, data: {}, headers: {}, statusText: 'Error' },
  ));
  clients[0].defaults.adapter = async config => {
    if (config.url === '/auth/login') {
      assert.equal(config.headers.Authorization, undefined);
    } else if (config.headers.Authorization !== 'Bearer new-access') {
      return reject(config, 401);
    }
    return { config, status: 200, data: {}, headers: {}, statusText: 'OK' };
  };
  clients[1].defaults.adapter = async config => {
    refreshCalls++;
    await new Promise(resolve => setTimeout(resolve, 5));
    if (refreshStatus !== 200) return reject(config, refreshStatus);
    return { config, status: 200, data: { accessToken: 'new-access', refreshToken: 'new-refresh' }, headers: {}, statusText: 'OK' };
  };
  exports.onSessionExpired(() => { expired++; });
  return { api: exports.api, state: () => ({ accessToken, refreshToken, refreshCalls, expired }) };
}

test('concurrent unauthorized requests share a refresh and retry with the new token', async () => {
  const { api, state } = setup();
  await Promise.all([api.get('/auth/me'), api.get('/FileUploads')]);
  assert.deepEqual(state(), { accessToken: 'new-access', refreshToken: 'new-refresh', refreshCalls: 1, expired: 0 });
});

test('temporary refresh server failure preserves saved session', async () => {
  const { api, state } = setup(503);
  await assert.rejects(api.get('/auth/me'));
  assert.equal(state().accessToken, 'old-access');
  assert.equal(state().expired, 0);
  await assert.rejects(api.get('/auth/me'));
  assert.equal(state().refreshCalls, 2);
});

test('rejected refresh clears saved session and notifies the app once', async () => {
  const { api, state } = setup(401);
  await Promise.allSettled([api.get('/auth/me'), api.get('/FileUploads')]);
  assert.equal(state().accessToken, null);
  assert.equal(state().refreshToken, null);
  assert.equal(state().expired, 1);
});

test('login does not send a stale bearer token', async () => {
  const { api, state } = setup();
  await api.post('/auth/login', { email: 'test@example.com', password: 'test-only' });
  assert.equal(state().refreshCalls, 0);
});
