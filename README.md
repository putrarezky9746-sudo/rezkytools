# REZKYTOOLS — WhatsApp Bot

Panel web + backend Node.js untuk bot WhatsApp milik sendiri.

## Struktur
- `index.html` — panel utama (tersedia melalui `public/index.html`)
- `server.js` — backend
- `package.json` — dependency
- `auth/` — sesi WhatsApp, sengaja diabaikan Git
- `.gitignore` — melindungi sesi dan `node_modules`

## Menjalankan
Gunakan server/VPS yang mendukung Node.js 20+.

```bash
npm install
npm start
```

Kemudian buka port aplikasi (default 3000).

## Pairing
Buka menu **Perangkat Tertaut**, masukkan nomor WhatsApp milik sendiri dalam format internasional, lalu ikuti proses pairing di WhatsApp.

## GitHub
Upload seluruh isi folder ini ke repository GitHub. Jangan menghapus `.gitignore`.

**Jangan pernah mengunggah folder `auth` yang sudah berisi sesi WhatsApp atau kredensial pribadi.**

## Catatan
GitHub Pages hanya dapat menyajikan frontend statis; `server.js` harus dijalankan pada server yang mendukung Node.js. Gunakan bot secara wajar dan patuhi ketentuan WhatsApp.
