import test from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, chmodSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { digits, isOwner, extractText, chunk, runClaude } from './lib.js';

test('digits menormalkan JID', () => {
  assert.equal(digits('6281234567890:12@s.whatsapp.net'), '6281234567890');
  assert.equal(digits('+62 812-3456-7890'), '6281234567890');
});

test('isOwner cocok lewat nomor atau LID, menolak yang lain', () => {
  const owners = ['6281234567890'];
  assert.ok(isOwner({ remoteJid: '6281234567890@s.whatsapp.net' }, owners));
  assert.ok(isOwner({ remoteJid: '99887766@lid', remoteJidAlt: '6281234567890@s.whatsapp.net' }, owners));
  assert.ok(!isOwner({ remoteJid: '99887766@lid' }, owners));
  assert.ok(!isOwner({ remoteJid: '628999@s.whatsapp.net' }, owners));
});

test('extractText membaca berbagai bentuk pesan', () => {
  assert.equal(extractText({ conversation: ' hai ' }), 'hai');
  assert.equal(extractText({ extendedTextMessage: { text: 'a' } }), 'a');
  assert.equal(extractText({ ephemeralMessage: { message: { conversation: 'b' } } }), 'b');
  assert.equal(extractText({ audioMessage: {} }), '');
});

test('chunk memecah tanpa kehilangan isi', () => {
  const text = Array.from({ length: 300 }, (_, i) => `baris ${i}`).join('\n');
  const parts = chunk(text, 500);
  assert.ok(parts.length > 1 && parts.every((p) => p.length <= 500));
  assert.equal(parts.join('\n'), text);
  assert.deepEqual(chunk('pendek'), ['pendek']);
});

function fakeClaude(body) {
  const file = join(mkdtempSync(join(tmpdir(), 'fake-claude-')), 'claude');
  writeFileSync(file, `#!/usr/bin/env node\n${body}\n`);
  chmodSync(file, 0o755);
  return file;
}
const base = { cwd: process.cwd(), permissionMode: 'acceptEdits', allowedTools: ['Bash(git *)'], timeoutMs: 5000 };

test('runClaude mengirim prompt lewat stdin dan meneruskan --resume', async () => {
  const bin = fakeClaude(`
    let s=''; process.stdin.on('data',d=>s+=d).on('end',()=>{
      console.log(JSON.stringify({result:'echo:'+s+'|'+process.argv.slice(2).join(' '),session_id:'S2',is_error:false}));
    });`);
  const { text, sessionId } = await runClaude({ ...base, bin, prompt: '--bahaya', sessionId: 'S1' }).promise;
  assert.equal(sessionId, 'S2');
  assert.match(text, /^echo:--bahaya\|/);
  assert.match(text, /--resume S1/);
  assert.match(text, /--allowedTools Bash\(git \*\)/);
});

test('runClaude melaporkan error dan bisa dihentikan', async () => {
  const bad = fakeClaude(`console.error('belum login'); process.exit(1);`);
  await assert.rejects(runClaude({ ...base, bin: bad, prompt: 'x' }).promise, /belum login/);

  const slow = fakeClaude(`setTimeout(()=>{}, 60000);`);
  const job = runClaude({ ...base, bin: slow, prompt: 'x' });
  setTimeout(() => job.kill('dihentikan'), 200);
  await assert.rejects(job.promise, /dihentikan/);

  await assert.rejects(runClaude({ ...base, bin: slow, prompt: 'x', timeoutMs: 200 }).promise, /batas waktu/);
  await assert.rejects(runClaude({ ...base, bin: '/tidak/ada', prompt: 'x' }).promise, /Tidak bisa menjalankan/);
});
