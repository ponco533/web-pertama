// Bagian yang tidak bergantung pada WhatsApp: bisa diuji tanpa nomor.
import { spawn } from 'node:child_process';

export const digits = (s) => String(s ?? '').split('@')[0].split(':')[0].replace(/\D/g, '');

// Semua identitas pengirim yang mungkin dibawa sebuah pesan (nomor HP atau LID).
export function senderIds(key = {}) {
  return [key.remoteJid, key.remoteJidAlt, key.senderPn, key.participant, key.participantAlt]
    .filter(Boolean)
    .map(digits)
    .filter(Boolean);
}

export function isOwner(key, owners) {
  return senderIds(key).some((id) => owners.includes(id));
}

export function extractText(message) {
  let m = message;
  for (let i = 0; i < 4 && m; i++) {
    const inner =
      m.ephemeralMessage?.message ?? m.viewOnceMessage?.message ?? m.viewOnceMessageV2?.message;
    if (!inner) break;
    m = inner;
  }
  return (
    m?.conversation ??
    m?.extendedTextMessage?.text ??
    m?.imageMessage?.caption ??
    m?.videoMessage?.caption ??
    m?.documentMessage?.caption ??
    ''
  ).trim();
}

// WhatsApp memotong pesan panjang; pecah di batas paragraf/baris bila bisa.
export function chunk(text, max = 3500) {
  const out = [];
  let rest = text.trim();
  while (rest.length > max) {
    let cut = rest.lastIndexOf('\n\n', max);
    if (cut < max / 2) cut = rest.lastIndexOf('\n', max);
    if (cut < max / 2) cut = rest.lastIndexOf(' ', max);
    if (cut < max / 2) cut = max;
    out.push(rest.slice(0, cut).trimEnd());
    rest = rest.slice(cut).trimStart();
  }
  if (rest) out.push(rest);
  return out;
}

/**
 * Jalankan Claude Code tanpa layar (headless) di folder repo.
 * Mengembalikan { promise, kill }. promise -> { text, sessionId }.
 */
export function runClaude({ prompt, cwd, sessionId, bin, permissionMode, allowedTools, systemPrompt, timeoutMs }) {
  const args = ['-p', '--output-format', 'json', '--permission-mode', permissionMode];
  if (systemPrompt) args.push('--append-system-prompt', systemPrompt);
  if (sessionId) args.push('--resume', sessionId);
  if (allowedTools.length) args.push('--allowedTools', ...allowedTools);

  const child = spawn(bin, args, { cwd, stdio: ['pipe', 'pipe', 'pipe'] });
  let stdout = '';
  let stderr = '';
  let killed = null;
  child.stdout.on('data', (d) => (stdout += d));
  child.stderr.on('data', (d) => (stderr += d));
  child.stdin.on('error', () => {});
  child.stdin.end(prompt); // lewat stdin supaya isi pesan tak pernah dibaca sebagai opsi CLI

  const kill = (reason = 'dihentikan') => {
    killed = reason;
    child.kill('SIGTERM');
    setTimeout(() => child.exitCode === null && child.kill('SIGKILL'), 5000).unref();
  };
  const timer = setTimeout(() => kill('melewati batas waktu'), timeoutMs);

  const promise = new Promise((resolve, reject) => {
    child.on('error', (e) => {
      clearTimeout(timer);
      reject(new Error(`Tidak bisa menjalankan "${bin}": ${e.message}`));
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (killed) return reject(new Error(`Claude ${killed}.`));
      let json;
      try {
        json = JSON.parse(stdout);
      } catch {
        return reject(new Error(`Claude keluar (kode ${code}): ${(stderr || stdout).trim().slice(-800) || 'tanpa keluaran'}`));
      }
      const text = String(json.result ?? '').trim();
      if (json.is_error) {
        const err = new Error(text || `Claude gagal (${json.subtype ?? code})`);
        err.sessionId = json.session_id;
        return reject(err);
      }
      resolve({ text: text || '(selesai, tanpa teks balasan)', sessionId: json.session_id });
    });
  });
  return { promise, kill };
}
