import makeWASocket, { useMultiFileAuthState } from '@whiskeysockets/baileys'
import { handleMessage } from './bot/core/ia.js'

const start = async () => {
  const { state, saveCreds } = await useMultiFileAuthState('session')
  const sock = makeWASocket({ auth: state })

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0]
    if (!msg?.message) return
    await handleMessage(sock, msg)
  })

  sock.ev.on('creds.update', saveCreds)
}

start()
