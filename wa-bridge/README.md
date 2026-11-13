# wa-bridge — perintah Claude Code lewat WhatsApp

Kamu kirim pesan WA ke nomor bot → skrip ini menjalankan Claude Code di repo ini → hasilnya dibalas ke WA-mu.

```
HP kamu ──WA──> nomor bot (wa-bridge, Baileys) ──> claude -p (di folder repo) ──> balasan WA
```

## Yang dibutuhkan

- Komputer/VPS yang **menyala terus** (selama mati, bot tidak membalas), dengan Node.js 20+ dan git.
- Claude Code terpasang dan sudah login di mesin itu: `npm i -g @anthropic-ai/claude-code`, lalu jalankan `claude` sekali untuk login dengan akun Claude-mu.
- Repo ini sudah di-clone di mesin itu, dan `git push` dari sana sudah bisa jalan.
- Satu nomor WA khusus untuk bot (aktif di aplikasi WhatsApp di sebuah HP), terpisah dari nomor pribadimu.

## Pasang

```bash
cd wa-bridge
npm install
cp .env.example .env     # isi OWNER_NUMBERS (nomor pribadimu) dan WA_BOT_NUMBER (nomor bot)
npm start
```

Saat pertama jalan, terminal menampilkan **kode tautan** (atau QR bila `WA_BOT_NUMBER` kosong).
Di HP nomor bot: WhatsApp → Perangkat tertaut → Tautkan perangkat → masukkan kode / pindai QR.
Setelah muncul `Tersambung sebagai ...`, kirim pesan dari nomor pribadimu ke nomor bot.

Supaya tetap hidup setelah terminal ditutup: `npm i -g pm2 && pm2 start index.js --name wa-bridge && pm2 save`.

## Jalan di HP Android (Termux)

Tidak perlu VPS atau API key: HP Android (boleh HP nomor bot itu sendiri) bisa jadi mesinnya.

```bash
# Pasang Termux dari F-Droid (bukan Play Store), lalu:
pkg update && pkg install nodejs-lts git
npm i -g @anthropic-ai/claude-code
claude                       # login sekali dengan akun Claude-mu, lalu keluar
git clone https://github.com/ponco533/web-pertama && cd web-pertama/wa-bridge
npm install && cp .env.example .env && nano .env
termux-wake-lock             # supaya Android tidak menidurkan Termux
npm start
```

Matikan juga "optimasi baterai" untuk Termux di pengaturan Android. Agar `git push` jalan dari HP, login GitHub dulu (mis. `pkg install gh && gh auth login`).

## Pakai

Tulis permintaan biasa, mis. *"tambahkan bagian FAQ di projects/braille.html, commit dan push"*.

| Perintah | Fungsi |
|---|---|
| `/baru` | mulai percakapan baru (konteks lama dilupakan) |
| `/stop` | hentikan tugas berjalan dan kosongkan antrean |
| `/status` | lihat tugas yang sedang dikerjakan |
| `/bantuan` | daftar perintah |

Pesan diproses satu per satu; percakapan bersambung sampai kamu kirim `/baru`.

## Keamanan — baca dulu

- **Siapa pun yang menguasai nomor di `OWNER_NUMBERS` bisa mengubah kode dan push ke repo.** Hanya itu gerbangnya. Aktifkan verifikasi dua langkah di WhatsApp pribadimu.
- Claude boleh mengedit file di repo dan menjalankan `git`/`graphify` saja. Menambah izin di `CLAUDE_ALLOWED_TOOLS` (mis. `Bash(npm *)`) berarti pesan WA bisa menjalankan perintah itu di mesinmu. Jangan pakai `bypassPermissions` kecuali di mesin terisolasi.
- Folder `auth/` adalah kunci sesi WhatsApp bot; `.env` berisi nomormu. Keduanya sudah di-`.gitignore`, jangan pernah di-commit.
- Ini memakai WhatsApp Web **tidak resmi** (Baileys), melanggar ketentuan WhatsApp. Nomor bot bisa diblokir kapan saja; karena itu pakai nomor khusus, jangan nomor utama.

## Masalah umum

- **Bot diam padahal pesan terkirim.** Lihat terminal: bila ada `[ditolak] pesan dari ID: ...`, WhatsApp mengirim ID tersamar (LID), bukan nomormu. Tambahkan angka itu ke `OWNER_NUMBERS` (pisahkan dengan koma) lalu jalankan ulang.
- **`Sesi WhatsApp dikeluarkan`.** Tautan dicabut dari HP; jalankan `npm start` lagi dan tautkan ulang.
- **Balasan `⚠️ Claude keluar ...`.** Biasanya Claude Code belum login di mesin itu; jalankan `claude` di terminal untuk memeriksa.
