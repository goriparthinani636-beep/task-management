const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const ts = require('typescript');

function load(path, deps, extra = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText, { exports, require: name => deps[name], URL, setTimeout, clearTimeout, AbortController, ...extra });
  return exports;
}

const payload = {
  firstName: 'Test', lastName: 'Employee', email: 'test@example.invalid', phone: '',
  department: 'IT', designation: 'Developer', status: 'Active',
  resumeUrl: 'https://files.example/resume.pdf', resumeFileName: 'resume.pdf',
};

test('employee save verifies the persisted record after update', async () => {
  const calls = [];
  const api = {
    put: async (path, body) => { calls.push(path); return { data: { id: 3, ...body } }; },
    get: async path => { calls.push(path); return { data: { id: 3, ...payload } }; },
  };
  const { saveEmployee } = load('src/services/employees.ts', { './api': { api } });
  assert.equal((await saveEmployee(payload, 3)).resumeUrl, payload.resumeUrl);
  assert.deepEqual(calls, ['/employees/3', '/employees/3']);
});

test('employee save rejects success when backend silently drops the resume', async () => {
  const { resumeUrl, resumeFileName, ...withoutResume } = payload;
  const api = {
    post: async () => ({ data: { id: 8 } }),
    get: async () => ({ data: { id: 8, ...withoutResume } }),
  };
  let acceptedId;
  const { saveEmployee } = load('src/services/employees.ts', { './api': { api } });
  await assert.rejects(saveEmployee(payload, undefined, id => { acceptedId = id; }), /backend did not save the resume/);
  assert.equal(acceptedId, 8, 'retry can update the created record instead of creating a duplicate');
});

test('accepted save with failed verification reports uncertain persistence', async () => {
  const api = { put: async () => ({ data: {} }), get: async () => { throw Error('offline'); } };
  const { saveEmployee } = load('src/services/employees.ts', { './api': { api } });
  await assert.rejects(saveEmployee(payload, 3), /could not be verified/);
});

function files(status = 200) {
  const opened = [];
  const exports = load('src/services/files.ts', {
    './api': { api: { defaults: { baseURL: 'https://api.example/api' } } },
    'react-native': { Linking: { openURL: async url => { opened.push(url); } } },
  }, { fetch: async () => ({ status, ok: status === 200 }) });
  return { ...exports, opened };
}

test('file links resolve from the server origin and reject unsafe schemes', () => {
  const { fileUrl } = files();
  assert.equal(fileUrl('/uploads/resume.pdf'), 'https://api.example/uploads/resume.pdf');
  assert.throws(() => fileUrl('javascript:alert(1)'), /invalid file link/);
  assert.throws(() => fileUrl(''), /No file link/);
});

test('file validation matches backend limits and supported resume types', () => {
  const { validateFile } = files();
  validateFile('Resume.PDF', 2000, true);
  assert.throws(() => validateFile('Resume.doc', 2000, true), /PDF or DOCX/);
  assert.throws(() => validateFile('Resume.pdf', 6 * 1024 * 1024, true), /5 MB/);
  assert.throws(() => validateFile('Resume.pdf', 0, true), /non-empty/);
});

test('upload response must confirm every file with a saved id and link', () => {
  const { uploadedFiles } = files();
  assert.equal(uploadedFiles({ files: [{ id: 1, fileName: 'a.pdf', fileUrl: '/uploads/a.pdf' }] }, 1)[0].fileUrl,
    'https://api.example/uploads/a.pdf');
  assert.throws(() => uploadedFiles({ files: [] }, 1), /did not confirm/);
  assert.throws(() => uploadedFiles({ files: [{ id: 1, fileName: 'a.pdf' }] }, 1), /No file link/);
  assert.throws(() => uploadedFiles({ success: false, message: 'Upload rejected' }), /Upload rejected/);
});

test('public file URLs open directly without a canOpenURL gate', async () => {
  const { openFile, opened } = files();
  await openFile('https://files.example/a.pdf');
  assert.deepEqual(opened, ['https://files.example/a.pdf']);
});

test('Cloudinary permission failures and missing files do not open a broken browser link', async () => {
  for (const [status, message] of [[401, /denied access/], [403, /denied access/], [404, /no longer exists/]]) {
    const { openFile, opened } = files(status);
    await assert.rejects(openFile('https://res.cloudinary.com/test/raw/upload/a.pdf'), message);
    assert.equal(opened.length, 0);
  }
});

test('removing a resume uses a dedicated endpoint and verifies removal without overwriting the employee', async () => {
  const calls = [];
  const api = {
    delete: async path => { calls.push(path); return { status: 204 }; },
    get: async path => { calls.push(path); return { data: { id: 3, firstName: 'Unchanged', resumeUrl: null, resumeFileName: null } }; },
  };
  const { removeEmployeeResume } = load('src/services/employees.ts', { './api': { api } });
  assert.equal((await removeEmployeeResume(3)).firstName, 'Unchanged');
  assert.deepEqual(calls, ['/employees/3/resume', '/employees/3']);
});

test('resume removal fails if the backend retains the attachment', async () => {
  const api = {
    delete: async () => ({ status: 204 }),
    get: async () => ({ data: { id: 3, resumeUrl: payload.resumeUrl } }),
  };
  const { removeEmployeeResume } = load('src/services/employees.ts', { './api': { api } });
  await assert.rejects(removeEmployeeResume(3), /could not be verified/);
});

test('file deletion sends the saved file id and propagates linked-file or permission failures', async () => {
  let path;
  const api = { delete: async url => { path = url; return { status: 204 }; } };
  const { deleteUploadedFile } = load('src/services/files.ts', { './api': { api }, 'react-native': {} });
  await deleteUploadedFile(7);
  assert.equal(path, '/FileUploads/7');
  api.delete = async () => { throw new Error('Remove the employee resume first'); };
  await assert.rejects(deleteUploadedFile(7), /employee resume first/);
  api.delete = async () => ({ data: { success: false, message: 'Deletion denied' } });
  await assert.rejects(deleteUploadedFile(7), /Deletion denied/);
});
