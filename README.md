# REZKYTOOLS — Railway

Versi ini disiapkan untuk deploy di Railway dengan Node.js + Express dan backend WhatsApp berbasis Baileys.

## Deploy cepat
1. Upload folder ini ke GitHub sebagai repository baru.
2. Di Railway pilih **New Project → Deploy from GitHub Repo**.
3. Pilih repository REZKYTOOLS.
4. Tambahkan variable `API_KEY` dengan nilai rahasia yang kuat. `PORT` tidak perlu diisi karena Railway menyediakan PORT.
5. Deploy. Buka domain Railway yang diberikan.
6. Saat status `QR_READY`, QR akan tampil. Scan QR dari WhatsApp yang ingin digunakan.

## API
- `GET /api/status`
- `GET /api/qr`
- `POST /api/send-message` body: `{ "number":"628...", "message":"Halo" }`
- `POST /api/logout`

Jika `API_KEY` diaktifkan, kirim header `x-api-key` pada request API.

## Catatan penting
Folder `auth_info_baileys` sengaja tidak diikutkan ke Git karena berisi kredensial sesi WhatsApp. Railway menyimpan filesystem container secara ephemeral; untuk sesi yang persisten, gunakan Railway Volume dan mount ke `/app/auth_info_baileys`.
