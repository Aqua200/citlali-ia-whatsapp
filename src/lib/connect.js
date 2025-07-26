
import pino from 'pino'
import { useMultiFileAuthState, fetchLatestBaileysVersion, makeWASocket, DisconnectReason, Browsers } from '@whiskeysockets/baileys'
import readline from 'readline'
import fs from 'fs'
import qrcode from 'qrcode-terminal' // <-- 1. IMPORTA LA LIBRERÍA

const sessionsFolder = './sessions'
if (!fs.existsSync(sessionsFolder)) fs.mkdirSync(sessionsFolder)

const rl = readline.createInterface({ input: process.stdin, output: process.stdout })

export async function connect() {
  const { state, saveCreds } = await useMultiFileAuthState(sessionsFolder)
  const { version } = await fetchLatestBaileysVersion()

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: true, // Se puede dejar, pero nuestra implementación manual es más segura
    logger: pino({ level: 'silent' }),
    browser: Browsers.macOS('Desktop'),
  })

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update
    if (qr) {
      console.log('\n📲 Escanea este QR con tu WhatsApp para vincular el bot.\n')
      // --- INICIO DE LA CORRECCIÓN ---
      // 2. Muestra el QR manualmente en la terminal
      qrcode.generate(qr, { small: true }, (qrCodeString) => {
        console.log(qrCodeString);
      });
      // --- FIN DE LA CORRECCIÓN ---
    }
    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode
      if (statusCode !== DisconnectReason.loggedOut) {
        console.log('⚠️ Conexión cerrada inesperadamente, reconectando...')
        connect()
      } else {
        console.log('❌ Sesión cerrada, necesitas volver a vincular el bot.')
        fs.rmSync(sessionsFolder, { recursive: true, force: true }); // Elimina la sesión para empezar de cero
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
