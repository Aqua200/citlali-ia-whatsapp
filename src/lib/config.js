export async function resolveGroupJIDs(sock) {
  try {
    if (config.officialGroup && config.officialGroup.startsWith('https://chat.whatsapp.com/')) {
      const groupInviteCode = config.officialGroup.split('/').pop();
      const groupInfo = await sock.groupGetInviteInfo(groupInviteCode);
      config.officialGroupJID = groupInfo.id;
      console.log(`✅ JID del grupo resuelto: ${config.officialGroupJID}`);
    }
  } catch (e) {
    console.error(`❌ No se pudo resolver JID del grupo:`, e.message);
  }
}

const config = {
  owner: [
    ['5216631079388', '🜲 Propietario 🜲', true],
    ['5212202410659', 'Co-Dueño', false],
    ['573154062343', 'Colaborador', false],
  ],
  botAge: 11,
  officialGroup: 'https://chat.whatsapp.com/JchA8tqCFPLCRbG8aKIF2e',
  officialChannel: 'https://whatsapp.com/channel/0029VbAZ6vWF1YlYsbKCrx1k',
  officialGroupJID: null,
  officialChannelJID: null,
};

export default config;
