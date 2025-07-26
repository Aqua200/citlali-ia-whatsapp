import pino from 'pino'
import { useMultiFileAuthState, fetchLatestBaileysVersion, makeWASocket, DisconnectReason, Browsers } from '@whiskeysockets/baileys'
import readline from 'readline'
import fs from 'fs'
import qrcode from 'qrcode-terminal' 

const sessionsFolder = './sessions'
if (!fs.existsSync(sessionsFolder)) fs.mkdirSync(sessionsFolder)

const rl = readline.createInterface({ input: process.stdin, output: process.stdout })

export async function connect() {
  const { state, saveCreds } = await useMultiFileAuthState(sessionsFolder)
  const { version } = await fetchLatestBaileysVersion()

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: true, 
    logger: pino({ level: 'silent' }),
    browser: Browsers.macOS('Desktop'),
  })

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update
    if (qr) {
      console.log('\n📲 Escanea este QR con tu WhatsApp para vincular el bot.\n')
      
      qrcode.generate(qr, { small: true }, (qrCodeString) => {
        console.log(qrCodeString);
      });
      
    }
    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode
      if (statusCode !== DisconnectReason.loggedOut) {
        console.log('⚠️ Conexión cerrada inesperadamente, reconectando...')
        connect()
      } else {
        console.log('❌ Sesión cerrada, necesitas volver a vincular el bot.')
        fs.rmSync(sessionsFolder, { recursive: true, force: true }); 
        rl.close()
      }
    } else if (connection === 'open') {
      console.log('✅ Conectado a WhatsApp exitosamente.')
      rl.close()
    }
  })

  sock.ev.on('creds.update', saveCreds)

  return sock
}
