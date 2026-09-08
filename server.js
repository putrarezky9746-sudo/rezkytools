const express = require('express');
const QRCode = require('qrcode');
const P = require('pino');
const makeWASocket = require('@whiskeysockets/baileys').default;
const { useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, '..', 'public')));

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY || '';
const AUTH_DIR = path.join(__dirname, '..', 'auth_info_baileys');
let sock = null;
let qrData = null;
let status = 'DISCONNECTED';
let lastError = null;

function authorized(req) {
  if (!API_KEY) return true;
  return req.headers['x-api-key'] === API_KEY || req.query.api_key === API_KEY;
}
function protect(req, res, next) {
  if (!authorized(req)) return res.status(401).json({ ok:false, error:'API key salah atau belum dikirim.' });
  next();
}

async function startWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  let version;
  try { ({ version } = await fetchLatestBaileysVersion()); } catch (_) { version = undefined; }
  sock = makeWASocket({
    auth: state,
    version,
    logger: P({ level: 'silent' }),
    printQRInTerminal: false,
    browser: ['REZKYTOOLS', 'Chrome', '1.0.0']
  });

  sock.ev.on('creds.update', saveCreds);
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;
    if (qr) {
      qrData = await QRCode.toDataURL(qr);
      status = 'QR_READY';
    }
    if (connection === 'open') {
      status = 'CONNECTED'; qrData = null; lastError = null;
      console.log('REZKYTOOLS WhatsApp connected');
    }
    if (connection === 'close') {
      status = 'DISCONNECTED';
      const code = lastDisconnect?.error?.output?.statusCode;
      lastError = String(code || 'connection closed');
      if (code !== DisconnectReason.loggedOut) setTimeout(startWhatsApp, 3000);
    }
  });
}

app.get('/api/status', protect, (req,res) => res.json({ ok:true, status, connected: status==='CONNECTED', qrAvailable: !!qrData, error:lastError }));
app.get('/api/qr', protect, (req,res) => res.json({ ok:true, status, qr:qrData }));
app.post('/api/logout', protect, async (req,res) => {
  try {
    if (sock) await sock.logout();
    sock = null; qrData = null; status='DISCONNECTED';
    fs.rmSync(AUTH_DIR, { recursive:true, force:true });
    res.json({ok:true});
  } catch (e) { res.status(500).json({ok:false,error:e.message}); }
});
app.post('/api/send-message', protect, async (req,res) => {
  try {
    if (!sock || status !== 'CONNECTED') return res.status(409).json({ok:false,error:'WhatsApp belum terhubung.'});
    const { number, message } = req.body || {};
    if (!number || !message) return res.status(400).json({ok:false,error:'number dan message wajib diisi.'});
    const digits = String(number).replace(/\D/g,'');
    if (digits.length < 8) return res.status(400).json({ok:false,error:'Nomor WhatsApp tidak valid.'});
    const jid = `${digits}@s.whatsapp.net`;
    const result = await sock.sendMessage(jid, { text: String(message) });
    res.json({ok:true, id:result?.key?.id || null});
  } catch (e) { res.status(500).json({ok:false,error:e.message}); }
});

app.get('*', (req,res) => res.sendFile(path.join(__dirname,'..','public','index.html')));
app.listen(PORT, () => { console.log(`REZKYTOOLS running on port ${PORT}`); startWhatsApp().catch(e => { lastError=e.message; console.error(e); }); });
