// Jembatan WhatsApp -> Claude Code. Jalankan: npm start  (lihat README.md)
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import makeWASocket, { useMultiFileAuthState, DisconnectReason, Browsers } from '@whiskeysockets/baileys';
import qrcode from 'qrcode-terminal';
import pino from 'pino';
import { digits, isOwner, senderIds, extractText, chunk, runClaude } from './lib.js';

const HERE = dirname(fileURLToPath(import.meta.url));

// --- konfigurasi: file .env sederhana (KEY=nilai), lalu environment ---
const envFile = resolve(HERE, '.env');
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}
const list = (v) => (v ?? '').split(',').map((s) => s.trim()).filter(Boolean);

const OWNERS = list(process.env.OWNER_NUMBERS).map(digits);
const BOT_NUMBER = digits(process.env.WA_BOT_NUMBER);
const REPO_DIR = resolve(HERE, process.env.REPO_DIR ?? '..');
const CLAUDE_BIN = process.env.CLAUDE_BIN ?? 'claude';
const PERMISSION_MODE = process.env.CLAUDE_PERMISSION_MODE ?? 'acceptEdits';
const ALLOWED_TOOLS = list(process.env.CLAUDE_ALLOWED_TOOLS ?? 'Bash(git *),Bash(graphify *)');
const TIMEOUT_MS = Number(process.env.CLAUDE_TIMEOUT_MIN ?? 20) * 60_000;
const AUTH_DIR = resolve(HERE, 'auth');
const STATE_FILE = resolve(HERE, 'state.json');

const SYSTEM_PROMPT =
  'Kamu dikendalikan pemilik repo lewat WhatsApp. Balas dalam Bahasa Indonesia, ringkas, teks polos ' +
  '(tanpa tabel atau heading markdown). Tidak ada yang bisa menjawab pertanyaan di tengah jalan: ' +
  'kerjakan sampai tuntas, lalu laporkan apa yang diubah. Commit dan push hanya bila diminta, ' +
  'jangan pernah force-push atau menghapus branch.';

if (!OWNERS.length) {
  console.error('OWNER_NUMBERS belum diisi. Salin .env.example menjadi .env lalu isi nomor WA pribadimu.');
  process.exit(1);
}

// --- state kecil: id sesi Claude supaya obrolan bersambung ---
const state = existsSync(STATE_FILE) ? JSON.parse(readFileSync(STATE_FILE, 'utf8')) : {};
const saveState = () => writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));

const startedAt = Math.floor(Date.now() / 1000);
const queue = [];
let running = null; // { kill, prompt, since }
let sock;

const HELP =
  'Perintah:\n' +
  '/baru  - mulai percakapan baru (lupa konteks lama)\n' +
  '/stop  - hentikan tugas yang sedang jalan\n' +
  '/status - lihat apa yang sedang dikerjakan\n' +
  '/bantuan - pesan ini\n\n' +
  'Selain itu, tulis saja permintaanmu, mis. "ganti warna tombol di index.html jadi biru lalu push".';

async function send(jid, text) {
  for (const part of chunk(text)) await sock.sendMessage(jid, { text: part });
}

async function handle(jid, text) {
  const cmd = text.toLowerCase();
  if (cmd === '/bantuan' || cmd === '/help') return send(jid, HELP);
  if (cmd === '/baru' || cmd === '/new') {
    delete state.sessionId;
    saveState();
    return send(jid, 'Percakapan baru dimulai.');
  }
  if (cmd === '/stop') {
    queue.length = 0;
    if (!running) return send(jid, 'Tidak ada tugas yang berjalan.');
    running.kill('dihentikan');
    return;
  }
  if (cmd === '/status') {
    if (!running) return send(jid, 'Menganggur. Siap menerima tugas.');
    const menit = Math.round((Date.now() - running.since) / 60_000);
    return send(jid, `Sedang mengerjakan (${menit} mnt): "${running.prompt.slice(0, 200)}"\nAntrean: ${queue.length}`);
  }
  queue.push({ jid, text });
  if (running) await send(jid, `Masuk antrean (${queue.length}). Kirim /stop untuk membatalkan semuanya.`);
  else pump();
}

async function pump() {
  while (queue.length) {
    const { jid, text } = queue.shift();
    const typing = setInterval(() => sock.sendPresenceUpdate('composing', jid).catch(() => {}), 8000);
    sock.sendPresenceUpdate('composing', jid).catch(() => {});
    try {
      const job = runClaude({
        prompt: text,
        cwd: REPO_DIR,
        sessionId: state.sessionId,
        bin: CLAUDE_BIN,
        permissionMode: PERMISSION_MODE,
        allowedTools: ALLOWED_TOOLS,
        systemPrompt: SYSTEM_PROMPT,
        timeoutMs: TIMEOUT_MS,
      });
      running = { kill: job.kill, prompt: text, since: Date.now() };
      const res = await job.promise;
      state.sessionId = res.sessionId ?? state.sessionId;
      saveState();
      await send(jid, res.text);
    } catch (e) {
      console.error('[claude]', e.message);
      await send(jid, `⚠️ ${e.message}`).catch(() => {});
    } finally {
      clearInterval(typing);
      running = null;
      sock.sendPresenceUpdate('paused', jid).catch(() => {});
    }
  }
}

async function connect() {
  mkdirSync(AUTH_DIR, { recursive: true });
  const { state: auth, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  sock = makeWASocket({
    auth,
    logger: pino({ level: process.env.LOG_LEVEL ?? 'silent' }),
    browser: Browsers.macOS('Chrome'),
    markOnlineOnConnect: false,
    syncFullHistory: false,
  });
  sock.ev.on('creds.update', saveCreds);

  let pairingAsked = false;
  sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
    if (qr && !auth.creds.registered) {
      if (BOT_NUMBER) {
        if (!pairingAsked) {
          pairingAsked = true;
          try {
            const code = await sock.requestPairingCode(BOT_NUMBER);
            console.log(`\nKode tautan untuk +${BOT_NUMBER}: ${code.match(/.{1,4}/g).join('-')}`);
            console.log('Di HP nomor bot: WhatsApp > Perangkat tertaut > Tautkan perangkat > "Tautkan dengan nomor telepon".\n');
          } catch (e) {
            console.error('Gagal meminta kode tautan:', e.message);
          }
        }
      } else {
        console.log('\nPindai QR ini dari HP nomor bot (WhatsApp > Perangkat tertaut > Tautkan perangkat):\n');
        qrcode.generate(qr, { small: true });
      }
    }
    if (connection === 'open') {
      console.log(`Tersambung sebagai ${digits(sock.user?.id)}. Pemilik: ${OWNERS.join(', ')}. Repo: ${REPO_DIR}`);
    }
    if (connection === 'close') {
      const code = lastDisconnect?.error?.output?.statusCode;
      if (code === DisconnectReason.loggedOut) {
        console.error('Sesi WhatsApp dikeluarkan. Menghapus auth/; jalankan ulang untuk menautkan lagi.');
        rmSync(AUTH_DIR, { recursive: true, force: true });
        process.exit(1);
      }
      console.log(`Koneksi putus (${code ?? '?'}), menyambung ulang...`);
      setTimeout(() => connect().catch((e) => console.error(e)), 3000);
    }
  });

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    for (const msg of messages) {
      const jid = msg.key?.remoteJid ?? '';
      if (msg.key?.fromMe || !msg.message) continue;
      if (jid.endsWith('@g.us') || jid.endsWith('@broadcast') || jid.endsWith('@newsletter')) continue;
      if (Number(msg.messageTimestamp ?? 0) < startedAt - 30) continue; // abaikan pesan lama saat baru nyala
      if (!isOwner(msg.key, OWNERS)) {
        // Sengaja tidak dibalas. ID dicetak agar pemilik bisa menambahkannya ke OWNER_NUMBERS bila itu dirinya (LID).
        console.log(`[ditolak] pesan dari ID: ${senderIds(msg.key).join(' / ')}`);
        continue;
      }
      const text = extractText(msg.message);
      if (!text) {
        await send(jid, 'Untuk saat ini aku hanya bisa membaca pesan teks.').catch(() => {});
        continue;
      }
      sock.readMessages([msg.key]).catch(() => {});
      handle(jid, text).catch((e) => console.error('[handle]', e));
    }
  });
}

connect().catch((e) => {
  console.error(e);
  process.exit(1);
});
