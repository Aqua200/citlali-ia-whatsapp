import { connect } from './connect.js'
import { handleMessage } from './bot/core/ia.js'

async function start() {
  const sock = await connect()

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0]
    if (!msg?.message) return
    await handleMessage(sock, msg)
  })
}

start()
