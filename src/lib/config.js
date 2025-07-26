//falta defir el numero 
export async function resolveGroupJIDs(sock) {
  try {
    if (config.officialGroup.startsWith('https://')) {
      console.log('🔗 Resolviendo JID del grupo oficial...');
      const groupInviteCode = config.officialGroup.split('/').pop();
      const groupInfo = await sock.groupGetInviteInfo(groupInviteCode);
      config.officialGroupJID = groupInfo.id;
      console.log(`✅ JID del grupo resuelto: ${config.officialGroupJID}`);
    }
  } catch (e) {
    console.error(`❌ No se pudo resolver el JID para el grupo. ¿El enlace es válido? Error:`, e);
  }
}

const config = {
  owner: [
    ''
  ],
  officialGroup: 'https://chat.whatsapp.com/Gqv0byeAjXiHPL5bX94UGE?mode=ac_t',
  officialChannel: 'https://whatsapp.com/channel/0029VbAZ6vWF1YlYsbKCrx1k',
  officialGroupJID: null,
  officialChannelJID: null,
};

export default config;
