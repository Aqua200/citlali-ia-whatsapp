import baileys from '@whiskeysockets/baileys'
const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, DisconnectReason } = baileys

import { handleMessage } from './bot/core/ia.js'

async function start() {
  const { version } = await fetchLatestBaileysVersion()
  const { state, saveCreds } = await useMultiFileAuthState('session')

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: true
  })

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update
    if (qr) {
      console.log('Escanea este QR con tu WhatsApp para vincular el bot:')
    }
    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode
      if (statusCode !== DisconnectReason.loggedOut) {
        console.log('Conexión cerrada inesperadamente, reconectando...')
        start()
      } else {
        console.log('Sesión cerrada, necesitas volver a vincular el bot.')
      }
    } else if (connection === 'open') {
      console.log('Conectado a WhatsApp exitosamente')
    }
  })

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0]
    if (!msg?.message) return
    await handleMessage(sock, msg)
  })

  sock.ev.on('creds.update', saveCreds)
}

start()
