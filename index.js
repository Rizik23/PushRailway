require("./lib/myfunc.js");
const { Telegraf } = require("telegraf");
const config = require("./config");

(async () => {
  console.log("=".repeat(50));
  console.log("AUTOORDER BOT STARTING");
  console.log("MODE : BOT ONLY");
  console.log("=".repeat(50));

  let bot = null;
  let botConnected = false;

  /* ================= BOT ================= */
  if (!config.botToken) {
    console.log("• Bot token tidak ditemukan");
    process.exit(1);
  }

  try {
    console.log("• Menghubungkan Bot Telegram");

    bot = new Telegraf(config.botToken);

    const userCommands = [
      { command: "ping", description: "Mᴇʟɪʜᴀᴛ ~Sᴛᴀᴛᴜs Bᴏᴛ Fᴜʟʟ ™Tᴀᴍᴘɪʟᴀɴ 🧸" },
      { command: "start", description: "Tᴀᴍᴘɪʟ'Kᴀɴ Mᴇɴᴜ Uᴛᴀᴍᴀ Kᴀᴇʟʟ 🍁" },
      { command: "menu", description: "Kᴀᴇʟʟ Gᴀɴᴛᴇɴɢ Tʜᴇ Rᴏᴡʀʀ 🦄" },
      { command: "rating", description: "Mᴇᴍʙᴇʀɪ Rᴀᴛɪɴɢ Sᴇʙᴇʀᴀᴘᴀ Bᴀɪᴋ Bᴏᴛ 🌟" },
      { command: "profile", description: "Mᴇʟɪʜᴀᴛ Pʀᴏғɪʟᴇ Bᴇʟᴀɴᴊᴀ Kᴀᴍᴜ 👤" },
      { command: "referral", description: "Mᴇɴɢᴀᴊᴀᴋ Tᴇᴍᴀɴ Uɴᴛᴜᴋ Mᴇɴᴅᴀᴘᴀᴛᴋᴀɴ Sᴀʟᴅᴏ 💸" },
      { command: "redeem", description: "Cᴏᴅᴇ Rᴇᴅᴇᴇᴍ Mᴇɴᴅᴀᴘᴀᴛᴋᴀɴ Sᴀʟᴅᴏ 💰" },
      { command: "cekid", description: "Mᴇʟɪʜᴀᴛ Sɪᴍ Cᴀʀᴅ Pʀᴏғɪʟ Kᴀᴍᴜ 💳" },
      { command: "info", description: "Rᴇᴘʟᴀʏ Pᴇsᴀɴ Usᴇʀ Aᴛᴀᴜ LᴀɴɢSung Iɴғᴏ ᴜNᴛᴜᴋ ᴅiʀɪ SᴇɴDɪʀɪ ‼️" },
      { command: "adu", description: "Tᴀɴɢtᴀɴɢ Pʟᴀʏᴇʀ Dɪ Gʀᴏᴜᴘ ⚔️" },
      { command: "arisan", description: "Jᴜᴅɪ Dᴇɴɢᴀɴ Bᴇʙᴇʀᴀᴘᴀ Pʟᴀʏᴇʀ ⚠️" }
    ];
    
    const ownerCommands = [
      { command: "backup", description: "Bᴀᴄᴋᴜᴘ Dᴀᴛᴀʙᴀsᴇ Bᴏᴛ Sᴇᴄᴀʀᴀ Aᴍᴀɴ 🗂️" },
      { command: "broadcast", description: "Kɪʀɪᴍ PᴇsᴀΠ Kᴇ Sᴇʟᴜʀᴜʜ Uꜱᴇʀ 📣" },
      { command: "addscript", description: "Tᴀᴍʙᴀʜ Sᴛᴏᴋ Sᴄʀɪᴘᴛ Bᴀʀᴜ 📜" },
      { command: "getscript", description: "Lɪʜᴀᴛ -Dᴀғᴛᴀʀ Sᴄʀɪᴘᴛ 📂" },
      { command: "delscript", description: "^Hᴀᴘᴜs Sᴛᴏᴋ Aᴘᴋ 🗑️" },
      { command: "addapk", description: "Tᴀᴍʙᴀʜ Sᴛᴏᴋ Sᴄʀɪᴘᴛ Bᴀʀᴜ 🔋" },
      { command: "getapk", description: "Lɪʜᴀᴛ -Dᴀғᴛᴀʀ Aᴘᴋ 📱" },
      { command: "delapk", description: "^Hᴀᴘᴜs Sᴛᴏᴋ Aᴘᴋ 🗑️" },
      { command: "addcoin", description: "Tᴀᴍʙᴀʜ Sᴀʟᴅᴏ ≠Uꜱᴇʀ 💳" },
      { command: "delcoin", description: "Kᴜʀᴀɴɢɪ Sᴀʟᴅᴏ Uꜱᴇʀ 💸" },
      { command: "userlist", description: "Dᴀғᴛᴀʀ »Sᴇʟᴜʀᴜʜ Uꜱᴇʀ 👥" },
      { command: "cekipbot", description: "Lɪʜᴀᴛ IP Bᴏᴛ 🌐" },
      { command: "lihatallcoin", description: "Lɪʜᴀᴛ Sᴇᴍᴜᴀ Sᴀʟᴅᴏ Uꜱᴇʀ 📊" },
      { command: "deleteallcoin", description: "Hᴀᴘᴜs Sᴇᴍ·ᴜᴀ Sᴀʟᴅᴏ Uꜱᴇʀ ⚠️" },
      { command: "adddistributor", description: "Mᴇɴᴀᴍʙᴀʜ R★ʟʟᴇ Dɪs†ʀᴏ 🪙" },
      { command: "addregular", description: "Mᴇɴᴀᴍʙᴀʜ ≈ʀᴏʟʟᴇ Rᴇɢᴜʟᴀʀ 💰" },
      { command: "addvip", description: "Mᴇɴᴀᴍʙᴀʜ Vɪᴘ 💎" },
      { command: "delrole", description: "Mᴇɴɢʜᴀᴘᴜs Rᴏʟʟᴇ ≈Usᴇʀ ♣" },
      { command: "addvoucher", description: "Mᴇᴍʙᴜᴀᴛ Rᴇғᴇʀʀᴀʟ Sᴀʟᴅᴏ Dᴀɴ Kᴜᴏᴛᴀ 🪔" },
      { command: "getdb", description: "Bᴀᴄᴋᴜᴘ Hᴀɴʏᴀ Bᴀɢɪᴀɴ Dʙ ( Pᴇɴᴛɪɴɢ ) 🎁" },
      { command: "ganti", description: "Mᴇɴɢɢᴀɴᴛɪ Fɪʟᴇ Dᴀʀɪ Tᴇʟᴇɢʀᴀᴍ 🐇" },
      { command: "mt", description: "Fɪᴛᴜʀ Mᴀɪɴᴛᴇɴᴀɴᴄᴇ Oɴ/Oғ 🎛" }
    ];

    // PELINDUNG 1: Set Command User
    try {
      await bot.telegram.setMyCommands(userCommands);
      console.log("• User commands diatur");
    } catch (cmdErr) {
      console.log("⚠️ Gagal set User Commands (Bot tetap nyala):", cmdErr.message);
    }

    // PELINDUNG 2: Set Command Owner
    if (config.ownerId) {
      try {
        await bot.telegram.setMyCommands(
          [...userCommands, ...ownerCommands],
          { scope: { type: "chat", chat_id: config.ownerId } }
        );
        console.log("• Owner commands diatur");
      } catch (cmdErr) {
        console.log("⚠️ Gagal set Owner Commands (Owner belum Start bot?):", cmdErr.message);
      }
    }

    // Load semua logika bot dulu
    require("./bot")(bot);

    // BARU NYALAKAN BOT DISINI (dengan fitur Anti-Nyangkut)
    bot.launch({ dropPendingUpdates: true });

    botConnected = true;
    console.log("• Bot Connected");

  } catch (err) {
    console.log("• Bot gagal fatal:", err.message);
    process.exit(1);
  }

  /* ================= STATUS ================= */
  console.log("=".repeat(50));
  console.log("STATUS KONEKSI");
  console.log(`• Bot : ${botConnected ? "AKTIF" : "TIDAK AKTIF"}`);
  console.log("=".repeat(50));
  console.log("• Bot siap digunakan");
  console.log("• Gunakan /menu");
  console.log("=".repeat(50));

  /* ================= SHUTDOWN ================= */
  process.once("SIGINT", async () => {
    console.log("• Menghentikan bot");
    if (bot) await bot.stop().catch(() => {});
    console.log("• Shutdown selesai");
    process.exit(0);
  });

  process.once("SIGTERM", async () => {
    if (bot) await bot.stop().catch(() => {});
    process.exit(0);
  });
})();