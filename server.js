import express from 'express';
import makeWASocket, { useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } from '@whiskeysockets/baileys';
import pino from 'pino';
import QRCode from 'qrcode';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

let sock = null;
let state = { status:'offline', qr:null, pairingCode:null, phone:null, messagesIn:0, messagesOut:0, startedAt:null, logs:[] };

function addLog(text){ state.logs.push(new Date().toLocaleTimeString()+' '+text); if(state.logs.length>200) state.logs.shift(); }

async function startBot(phoneNumber=''){
  if(sock) return;
  const { state: authState, saveCreds } = await useMultiFileAuthState(path.join(__dirname,'auth'));
  const { version } = await fetchLatestBaileysVersion().catch(()=>({version:[2,3000,1023223820]}));

  sock = makeWASocket({
    version,
    auth: authState,
    logger: pino({ level:'silent' }),
    printQRInTerminal:false,
    browser:['REZKYTOOLS','Chrome','1.0.0'],
    markOnlineOnConnect:false
  });

  state.status='connecting'; state.qr=null; state.pairingCode=null; state.startedAt=Date.now();
  addLog('[BOT] Connecting to WhatsApp...');

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async ({connection,lastDisconnect,qr})=>{
    if(qr){
      state.qr = await QRCode.toDataURL(qr);
      state.status='qr';
      addLog('[PAIR] QR code ready.');
    }
    if(connection==='open'){
      state.status='online'; state.qr=null; state.pairingCode=null;
      state.phone = sock.user?.id || null;
      addLog('[BOT] Connected.');
    }
    if(connection==='close'){
      const code = lastDisconnect?.error?.output?.statusCode;
      sock=null; state.status='offline';
      addLog('[BOT] Disconnected ('+(code ?? 'unknown')+').');
      if(code !== DisconnectReason.loggedOut) setTimeout(()=>startBot(phoneNumber),3000);
    }
  });

  sock.ev.on('messages.upsert', ({messages,type})=>{
    if(type!=='notify') return;
    for(const m of messages){
      if(!m.message || m.key.fromMe) continue;
      state.messagesIn++;
      const text = m.message.conversation || m.message.extendedTextMessage?.text || '';
      if(text.trim().toLowerCase()==='.ping'){
        sock.sendMessage(m.key.remoteJid,{text:'Pong! REZKYTOOLS aktif.'});
        state.messagesOut++;
        addLog('[MSG] .ping replied.');
      }
    }
  });
}

// Pairing-code endpoint. Use only for your own WhatsApp account.
app.post('/api/pair', async (req,res)=>{
  try{
    const phone=String(req.body.phone||'').replace(/\D/g,'');
    if(!phone) return res.status(400).json({error:'Masukkan nomor WhatsApp dengan kode negara.'});
    await startBot(phone);
    if(sock && !sock.authState?.creds?.registered){
      const code = await sock.requestPairingCode(phone);
      state.pairingCode = code;
      addLog('[PAIR] Pairing code generated.');
    }
    res.json({ok:true, pairingCode:state.pairingCode, status:state.status});
  }catch(e){res.status(500).json({error:e.message});}
});

app.post('/api/start', async(req,res)=>{
  try{ await startBot(); res.json({ok:true,status:state.status}); }
  catch(e){res.status(500).json({error:e.message});}
});

app.post('/api/stop', (req,res)=>{
  if(sock){ try{sock.end(undefined);}catch{} sock=null; }
  state.status='offline'; state.qr=null; state.pairingCode=null; addLog('[BOT] Stopped by owner.');
  res.json({ok:true});
});

app.get('/api/status',(req,res)=>{
  res.json({...state,uptime:state.startedAt?Math.floor((Date.now()-state.startedAt)/1000):0});
});

app.post('/api/send',async(req,res)=>{
  try{
    if(!sock || state.status!=='online') return res.status(409).json({error:'Bot belum online.'});
    const jid=String(req.body.jid||'').trim(), text=String(req.body.text||'');
    if(!jid || !text) return res.status(400).json({error:'jid dan text wajib diisi.'});
    await sock.sendMessage(jid,{text});
    state.messagesOut++; addLog('[SEND] Message sent.');
    res.json({ok:true});
  }catch(e){res.status(500).json({error:e.message});}
});

app.get('*',(req,res)=>res.sendFile(path.join(__dirname,'public','index.html')));
app.listen(process.env.PORT||3000,()=>console.log('REZKYTOOLS running on port '+(process.env.PORT||3000)));
