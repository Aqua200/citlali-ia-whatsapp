export async function resolveGroupJIDs(sock) {
  try {
    if (config.officialGroup && config.officialGroup.startsWith('https://chat.whatsapp.com/')) {
      const groupInviteCode = config.officialGroup.split('/').pop();
      const groupInfo = await sock.groupGetInviteInfo(groupInviteCode);
      config.officialGroupJID = groupInfo.id;
    }
  } catch (e) {
    console.error(`Error al resolver JID del grupo:`, e.message);
  }
}

const config = {
  owner: ['5211234567890@s.whatsapp.net'],
  botAge: 11,
  officialGroup: 'https://chat.whatsapp.com/JchA8tqCFPLCRbG8aKIF2e',
  officialChannel: 'https://whatsapp.com/channel/0029VbAZ6vWF1YlYsbKCrx1k',
  officialGroupJID: null,
  officialChannelJID: null,
};

export default config;
