require("./lib/myfunc.js");
const config = require("./config");
const fs = require("fs");
const path = require("path");
const os = require("os");
const axios = require("axios");
const crypto = require("crypto");
const { createCanvas, loadImage, registerFont } = require("canvas");

const prefix = config.prefix || ".";
const scriptDir = path.join(__dirname, "scripts");
const scriptDB = path.join(__dirname, "/db/scripts.json");
const userDB = path.join(__dirname, "/db/users.json");
const voucherDB = path.join(__dirname, "/db/vouchers.json");
const ratingDB = path.join(__dirname, "/db/ratings.json");
const missionDB = path.join(__dirname, "/db/missions.json");
const apkDB = path.join(__dirname, "/db/apks.json");
const settingsDB = path.join(__dirname, "/db/settings.json");

// prosses all produk
const orders = {};
const pendingDeposit = {};
const pendingCsChat = {};
const pendingStartArgs = {};
const pendingDeleteAllCoin = {};
const pendingTransfer = {};

// Inisialisasi database
if (!fs.existsSync(scriptDir)) fs.mkdirSync(scriptDir);
if (!fs.existsSync(missionDB)) fs.writeFileSync(missionDB, "[]");
if (!fs.existsSync(ratingDB)) fs.writeFileSync(ratingDB, "[]");
if (!fs.existsSync(scriptDB)) fs.writeFileSync(scriptDB, "[]");
if (!fs.existsSync(userDB)) fs.writeFileSync(userDB, "[]");
if (!fs.existsSync(apkDB)) fs.writeFileSync(apkDB, "[]");
if (!fs.existsSync(voucherDB)) fs.writeFileSync(voucherDB, "{}");
if (!fs.existsSync(settingsDB)) fs.writeFileSync(settingsDB, JSON.stringify({
    script: true
}, null, 2));

// ==========================================
// 🚀 IN-MEMORY DATABASE SYSTEM (ANTI-DELAY)
// ==========================================
// Muat data ke RAM HANYA SEKALI saat bot pertama kali menyala
global.dbCache = {
    users: JSON.parse(fs.readFileSync(userDB, 'utf-8')),
    scripts: JSON.parse(fs.readFileSync(scriptDB, 'utf-8')),
    vouchers: JSON.parse(fs.readFileSync(voucherDB, 'utf-8')),
    ratings: JSON.parse(fs.readFileSync(ratingDB, 'utf-8')),
    missions: JSON.parse(fs.readFileSync(missionDB, 'utf-8')),
    apks: JSON.parse(fs.readFileSync(apkDB, 'utf-8')),
    settings: JSON.parse(fs.readFileSync(settingsDB, 'utf-8'))
};

// Fungsi Load sekarang mengambil dari RAM (Instan 0ms)
const loadUsers = () => global.dbCache.users;
const loadScripts = () => global.dbCache.scripts;
const loadVouchers = () => global.dbCache.vouchers;
const loadRatings = () => global.dbCache.ratings;
const loadMissions = () => global.dbCache.missions;
const loadApks = () => global.dbCache.apks;
const loadSettings = () => global.dbCache.settings;

// Penanda jika ada data yang berubah
let needSave = { users: false, scripts: false, vouchers: false, ratings: false, missions: false, apks: false, settings: false };

// Fungsi Save sekarang hanya memperbarui RAM (Instan 0ms)
const saveUsers = (d) => { global.dbCache.users = d; needSave.users = true; };
const saveScripts = (d) => { global.dbCache.scripts = d; needSave.scripts = true; };
const saveVouchers = (d) => { global.dbCache.vouchers = d; needSave.vouchers = true; };
const saveRatings = (d) => { global.dbCache.ratings = d; needSave.ratings = true; };
const saveMissions = (d) => { global.dbCache.missions = d; needSave.missions = true; };
const saveApks = (d) => { global.dbCache.apks = d; needSave.apks = true; };
const saveSettings = (d) => { global.dbCache.settings = d; needSave.settings = true; };

// ⚙️ BACKGROUND WORKER: Menyimpan ke File secara diam-diam tiap 3 detik jika ada perubahan
setInterval(() => {
    if (needSave.users) { fs.writeFile(userDB, JSON.stringify(global.dbCache.users, null, 2), ()=>{}); needSave.users = false; }
    if (needSave.scripts) { fs.writeFile(scriptDB, JSON.stringify(global.dbCache.scripts, null, 2), ()=>{}); needSave.scripts = false; }
    if (needSave.vouchers) { fs.writeFile(voucherDB, JSON.stringify(global.dbCache.vouchers, null, 2), ()=>{}); needSave.vouchers = false; }
    if (needSave.ratings) { fs.writeFile(ratingDB, JSON.stringify(global.dbCache.ratings, null, 2), ()=>{}); needSave.ratings = false; }
    if (needSave.missions) { fs.writeFile(missionDB, JSON.stringify(global.dbCache.missions, null, 2), ()=>{}); needSave.missions = false; }
    if (needSave.apks) { fs.writeFile(apkDB, JSON.stringify(global.dbCache.apks, null, 2), ()=>{}); needSave.apks = false; }
    if (needSave.settings) { fs.writeFile(settingsDB, JSON.stringify(global.dbCache.settings, null, 2), ()=>{}); needSave.settings = false; }
}, 3000);
// ==========================================


// ===================== FUNGSI UTILITAS =====================
const start = process.hrtime.bigint();
const end = process.hrtime.bigint();
const speed = Number(end - start) / 1e6; // ms
const used = (process.memoryUsage().rss / 1024 / 1024 / 1024).toFixed(2);
const total = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2);

const USERS_PER_PAGE = 10;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const formatCoin = (angka) => {
    return Number(angka).toLocaleString('id-ID');
};

// Wajib ditaruh sebelum fungsi createCanvas dipanggil
try {
  registerFont('./font/NotoSans-Regular.ttf', { family: 'CustomFont' });
  registerFont('./font/NotoColorEmoji-Regular.ttf', { family: 'EmojiFont' });
} catch (e) {
  console.log("⚠️ File font tidak ditemukan, pastikan file .ttf ada di folder!");
}

// ============================================
// 🎨 FUNGSI PEMBUAT KARTU SULTAN CASINO (CANVAS)
// ============================================
async function createTopSlotCard(user, rank, favGameName) {
    const { createCanvas } = require("canvas");
    const width = 800;
    const height = 400;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    // Background Gradient (Dark Casino Vibe)
    const bgGradient = ctx.createLinearGradient(0, 0, width, height);
    bgGradient.addColorStop(0, "#111111"); // Hitam elegan
    bgGradient.addColorStop(1, "#3a0000"); // Merah gelap kasino
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    // Gold Border Dalam
    ctx.strokeStyle = "#FFD700";
    ctx.lineWidth = 6;
    ctx.strokeRect(10, 10, width - 20, height - 20);

    // Efek Watermark VIP di background
    ctx.globalAlpha = 0.05;
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 250px Arial";
    ctx.fillText("VIP", 450, 300);
    ctx.globalAlpha = 1.0;

    // Header Kartu
    ctx.fillStyle = "#FFD700"; // Emas
    ctx.font = "bold 35px Arial";
    ctx.textAlign = "center";
    ctx.fillText("👑 KING OF CASINO 👑", width / 2, 60);

    // Garis pemisah atas
    ctx.beginPath();
    ctx.moveTo(100, 80);
    ctx.lineTo(700, 80);
    ctx.strokeStyle = "#FFD700";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Rank Badge
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 80px Arial";
    ctx.textAlign = "left";
    ctx.fillText(`#${rank}`, 40, 170);

    // Nama Pemain
    ctx.fillStyle = "#FFA500";
    ctx.font = "bold 45px Arial";
    let name = user.first_name || user.username || "Anonymous";
    if (name.length > 15) name = name.substring(0, 15) + "...";
    ctx.fillText(name.toUpperCase(), 180, 170);

    // Garis pemisah tengah
    ctx.beginPath();
    ctx.moveTo(40, 200);
    ctx.lineTo(760, 200);
    ctx.strokeStyle = "rgba(255, 215, 0, 0.3)";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Statistik Info (Saldo & Jackpot)
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "30px Arial";
    ctx.fillText(`💰 Total Saldo   : ${user.balance.toLocaleString('id-ID')} Coin`, 40, 260);
    ctx.fillText(`🏆 Total Jackpot : ${user.slotStats.wins.toLocaleString('id-ID')} Coin`, 40, 310);
    
    ctx.fillStyle = "#FFD700";
    ctx.fillText(`🎰 Fav Mesin     : ${favGameName}`, 40, 360);

    return canvas.toBuffer();
}

function escapeHTML(str) {
  if (str === undefined || str === null) return '';
  return String(str).replace(/[&<>"']/g, m => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[m]));
}

function makeBar(p) {
  const total = 14;
  const fill = Math.round((p / 100) * total);
  return "▰".repeat(fill) + "▱".repeat(total - fill);
}

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function drawNoise(ctx, x, y, w, h, alpha = 0.05) {
  const img = ctx.getImageData(x, y, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() * 255) | 0;
    d[i] = d[i] + n * alpha;
    d[i + 1] = d[i + 1] + n * alpha;
    d[i + 2] = d[i + 2] + n * alpha;
  }
  ctx.putImageData(img, x, y);
}

// List Pilihan Bet (Dari 100 Ribu sampai 100 Juta)
const BET_LEVELS = [100000, 500000, 1000000, 2500000, 5000000, 10000000, 25000000, 50000000, 100000000];
global.userBets = global.userBets || {}; // Penyimpan memori taruhan user

// Mesin Pembuat Halaman Mahjong
async function renderMahjongMenu(ctx) {
    const userId = ctx.from.id;
    const users = loadUsers();
    const user = users.find(u => u.id === userId);
    const saldo = user ? (user.balance || 0) : 0;

    // Set default bet ke 1 Juta kalau user baru pertama kali main
    if (!global.userBets[userId]) global.userBets[userId] = BET_LEVELS[2]; 
    const currentBet = global.userBets[userId];

// 1. BIKIN KAMUS EMOJINYA DULU (Taruh di atas sebelum const text)
const e = {
    tujuh: '<tg-emoji emoji-id="5443135830883313930">7️⃣</tg-emoji>',
    uang: '<tg-emoji emoji-id="5224257782013769471">💰</tg-emoji>',
    naga: '<tg-emoji emoji-id="6267294270634334041">🐉</tg-emoji>'
};

// 2. TINGGAL PANGGIL NAMANYA DI DALAM TEKS
const text = `<blockquote>${e.tujuh} <b>MAHJONG WAYS (SLOT KASINO)</b></blockquote>
▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰
Atur jumlah taruhanmu dan putar mesinnya! Hadiah dihitung berdasarkan perkalian taruhan (Bet).

${e.uang} <b>Taruhan (Bet) Saat Ini:</b> ${currentBet.toLocaleString('id-ID')} Coin

<b>🏆 Daftar Perkalian (Multiplier):</b>
✨ ✨ ✨ = <b>SCATTER JACKPOT (x50)</b>
${e.naga} ${e.naga} ${e.naga} = <b>BIG WIN (x10)</b>
${e.tujuh} ${e.tujuh} ${e.tujuh} = <b>MEGA WIN (x5)</b>
🎋 🎋 🎋 = <b>SUPER WIN (x2)</b>
🀣 🀣 🀣 = <b>BALIK MODAL (x1)</b>
💔 💀 📉 = <b>ZONK (Koin Hangus)</b>
▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰
🪙 <b>Sisa Coin Kamu:</b> ${saldo.toLocaleString('id-ID')} Coin`;

    const keyboard = {
        inline_keyboard: [
            [
                { text: "➖ Turunkan Bet", callback_data: "bet_down" },
                { text: "➕ Naikkan Bet", callback_data: "bet_up" }
            ],
            [{ text: `SPIN MAHJONG (Bet: ${formatCoin(currentBet)})`, callback_data: "play_gacha", icon_custom_emoji_id: "5436386989857320953" }],
            [{ text: "Kembali", callback_data: "back_to_main_menu", icon_custom_emoji_id: "5258236805890710909" }]
        ]
    };

    try {
        await ctx.editMessageMedia({ type: "photo", media: config.menuImage, caption: text, parse_mode: "HTML" }, { reply_markup: keyboard });
    } catch (err) {
        if (!err.description?.includes("message is not modified")) {
            await ctx.editMessageText(text, { parse_mode: "HTML", reply_markup: keyboard }).catch(()=>{});
        }
    }
}
// FUNGSI INTI NGUNDI ARISAN
async function selesaikanArisan(ctx, arisanId, arisan) {
    // Putar gacha cari 1 pemenang dari array
    let pemenangIndex = Math.floor(Math.random() * arisan.players.length);
    let pemenang = arisan.players[pemenangIndex];
    
    let totalPot = arisan.nominal * arisan.players.length;
    let pajak = totalPot * 0.05; // Bandar ambil 5% total pot 🔥
    let hadiahBersih = totalPot - pajak;

    // Suntik saldo ke pemenang
    let users = global.dbCache.users;
    let winIdx = users.findIndex(u => u.id === pemenang.id);
    if (winIdx !== -1) {
        users[winIdx].balance += hadiahBersih;
        needSave.users = true;
    }

    delete global.activeArisan[arisanId]; // Hapus dari memori

    let text = `<blockquote>⚔️ <b>HASIL ARISAN KOIN</b> ⚔️</blockquote>\n▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰\n👥 <b>Total Peserta:</b> ${arisan.players.length} Orang\n🎟️ <b>Tiket:</b> ${formatCoin(arisan.nominal)} Coin\n▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰\n\n🎉 <b>PEMENANG JACKPOT:</b>\n👑 <b>${pemenang.name}</b> 👑\n\n🧾 <b>Struk Hadiah:</b>\n💰 Total Pot : <b>${formatCoin(totalPot)} Coin</b>\n🏦 Pajak Bot (5%) : <b>-${formatCoin(pajak)} Coin</b>\n💸 Dibawa Pulang : <b>+${formatCoin(hadiahBersih)} Coin</b>\n\n<i>Selamat kepada pemenang! Yang kalah jangan nangis, ayo buka room baru! 😂</i>`;

    return ctx.editMessageText(text, { parse_mode: "HTML" }).catch(()=>{});
}
// ===== MESIN HALAMAN KATALOG APK MOD =====
async function renderApkPage(ctx, page) {
    const apksList = loadApks();
    if (!apksList.length) {
        // Langsung edit jadi teks kosong jika dipanggil dari tombol
        if (ctx.callbackQuery) {
            return ctx.editMessageText("📭 <i>Belum ada APK Mod yang dijual saat ini.</i>", { parse_mode: "HTML" }).catch(()=>{});
        }
        return ctx.reply("📭 <i>Belum ada APK Mod yang dijual saat ini.</i>", { parse_mode: "HTML" }).catch(()=>{});
    }

    const ITEMS_PER_PAGE = 20;
    const totalItems = apksList.length;
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
    const startIdx = page * ITEMS_PER_PAGE;
    const endIdx = startIdx + ITEMS_PER_PAGE;
    const currentItems = apksList.slice(startIdx, endIdx);

    const buttons = currentItems.map((s, index) => {
        const absoluteIdx = startIdx + index;
        return [{
            text: `📱 ${escapeHTML(s.name)} - ${Number(s.price).toLocaleString("id-ID")} Coin`,
            callback_data: `apk|${absoluteIdx}` // Aman dari error emoji
        }];
    });
    
    const kaell = {
         apk: '<tg-emoji emoji-id="5382357040008021292">🆕</tg-emoji>'
    };

    const navRow = [];
    if (page > 0) navRow.push({ text: "PREV", callback_data: `apk_page|${page - 1}`, icon_custom_emoji_id: "5470126556422628081", style: "primary" });
    navRow.push({ text: `Hal ${page + 1}/${totalPages}`, callback_data: "ignore", icon_custom_emoji_id: "5434144690511290129", style: "success" });
    if (page < totalPages - 1) navRow.push({ text: "NEXT", callback_data: `apk_page|${page + 1}`, icon_custom_emoji_id: "5346105514575025401", style: "primary" });

    buttons.push(navRow);
    buttons.push([{ text: "Kembali", callback_data: "back_to_main_menu", icon_custom_emoji_id: "5258236805890710909", style: "danger" }]);

    const text = `
 <blockquote>${kaell.apk} <b>KATALOG APK MOD & APLIKASI</b></blockquote>`;

    try {
        // Langsung edit teksnya biar seamless tanpa kedap-kedip
        await ctx.editMessageText(text, { parse_mode: "HTML", reply_markup: { inline_keyboard: buttons } });
    } catch (err) {
        if (err.description && err.description.includes("message is not modified")) return;
        // Kalau gagal diedit (misal user manggil dari command manual), langsung kirim pesan baru tanpa hapus
        await ctx.reply(text, { parse_mode: "HTML", reply_markup: { inline_keyboard: buttons } }).catch(() => {});
    }
}

// ===== MESIN HALAMAN SCRIPT (OWNER ONLY) =====
async function sendGetScriptPage(ctx, page = 0) {
    if (!isOwner(ctx)) return;
    const allScripts = loadScripts();
    if (!allScripts.length) {
        const txt = "📭 Belum ada script.";
        return ctx.callbackQuery ? ctx.editMessageText(txt).catch(()=>{}) : ctx.reply(txt);
    }

    const ITEMS_PER_PAGE = 20;
    const totalPages = Math.ceil(allScripts.length / ITEMS_PER_PAGE);
    const start = page * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    const currentItems = allScripts.slice(start, end);
    
    const kaell = {
        box: '<tg-emoji emoji-id="5854908544712707500">📦</tg-emoji>',
        file: '<tg-emoji emoji-id="5818955300463447293">🗂</tg-emoji>'
    };

    const buttons = currentItems.map((s, index) => {
        const absoluteIdx = start + index;
        return [{ text: `${kaell.file} ${escapeHTML(s.name)} - ${formatCoin(s.price)} Coin`, callback_data: `getscript_detail|${absoluteIdx}` }];
    });

    const navRow = [];
    if (page > 0) navRow.push({ text: " ", callback_data: `getscript_page|${page - 1}`, icon_custom_emoji_id: "5470126556422628081", style: "primary" });
    if (page < totalPages - 1) navRow.push({ text: " ", callback_data: `getscript_page|${page + 1}`, icon_custom_emoji_id: "5346105514575025401", style: "primary" });
    
    if (navRow.length > 0) buttons.push(navRow);

    const text = `<b>${kaell.box} DAFTAR SCRIPT (Hal ${page + 1}/${totalPages})</b>\n\nPilih Script untuk melihat detail:`;

    if (ctx.callbackQuery) {
        return ctx.editMessageText(text, { parse_mode: "HTML", reply_markup: { inline_keyboard: buttons } }).catch(()=>{});
    } else {
        return ctx.reply(text, { parse_mode: "HTML", reply_markup: { inline_keyboard: buttons } });
    }
}

// ===== MESIN HALAMAN APK (OWNER ONLY) =====
async function sendGetApkPage(ctx, page = 0) {
    if (!isOwner(ctx)) return;
    const allApks = loadApks();
    if (!allApks.length) {
        const txt = "📭 Belum ada APK.";
        return ctx.callbackQuery ? ctx.editMessageText(txt).catch(()=>{}) : ctx.reply(txt);
    }

    const ITEMS_PER_PAGE = 20;
    const totalPages = Math.ceil(allApks.length / ITEMS_PER_PAGE);
    const start = page * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    const currentItems = allApks.slice(start, end);

    const buttons = currentItems.map((s, index) => {
        const absoluteIdx = start + index;
        return [{ text: `📱 ${escapeHTML(s.name)} - ${formatCoin(s.price)} Coin`, callback_data: `getapk_detail|${absoluteIdx}` }];
    });

    const navRow = [];
    if (page > 0) navRow.push({ text: "⬅️ Prev", callback_data: `getapk_page|${page - 1}` });
    if (page < totalPages - 1) navRow.push({ text: "Next ➡️", callback_data: `getapk_page|${page + 1}` });
    
    if (navRow.length > 0) buttons.push(navRow);

    const text = `<b>📱 DAFTAR APK MOD (Hal ${page + 1}/${totalPages})</b>\n\nPilih APK untuk melihat detail:`;

    if (ctx.callbackQuery) {
        return ctx.editMessageText(text, { parse_mode: "HTML", reply_markup: { inline_keyboard: buttons } }).catch(()=>{});
    } else {
        return ctx.reply(text, { parse_mode: "HTML", reply_markup: { inline_keyboard: buttons } });
    }
}

// ====== LOGIC BARU: KELANGKAAN & LEVEL BERDASARKAN UMUR ID ======
function idGenerationEstimate(userId) {
  const n = Number(String(userId).replace(/\D/g, "")) || 0;
  if (n < 50_000_000) return "Pioneer Era (Estimate)";
  if (n < 500_000_000) return "Early Growth (Estimate)";
  if (n < 2_000_000_000) return "Mass Adoption (Estimate)";
  return "Modern Generation (Estimate)";
}

function analyzeTelegramAccount(userId, hashHex) {
  const n = Number(String(userId).replace(/\D/g, "")) || 0;
  
  let rarity, accent, label, grade, color, baseLevel;

  if (n <= 0) {
    return { label: "UNKNOWN", grade: "?", rarity: "UNKNOWN", color: "#95a5a6", accent: "#95a5a6", level: 0 };
  }

  if (n < 10_000_000) {
    label = "SUPER LEGEND"; grade = "S+"; rarity = "MYTHIC"; color = "#ffcc33"; accent = "#ffcc33"; baseLevel = 95;
  }
  else if (n < 100_000_000) {
    label = "SANGAT LANGKA"; grade = "S"; rarity = "LEGENDARY"; color = "#ff6bd6"; accent = "#ff6bd6"; baseLevel = 85;
  }
  else if (n < 500_000_000) {
    label = "LANGKA"; grade = "A"; rarity = "EPIC"; color = "#8e7dff"; accent = "#8e7dff"; baseLevel = 70;
  }
  else if (n < 1_500_000_000) {
    label = "SEPUH (RARE)"; grade = "B"; rarity = "RARE"; color = "#3bd1ff"; accent = "#3bd1ff"; baseLevel = 55;
  }
  else if (n < 3_000_000_000) {
    label = "NORMAL (OLD)"; grade = "C"; rarity = "UNCOMMON"; color = "#58ff9a"; accent = "#58ff9a"; baseLevel = 35;
  }
  else if (n < 7_000_000_000) {
    label = "UMUM"; grade = "D"; rarity = "COMMON"; color = "#b8c6d8"; accent = "#b8c6d8"; baseLevel = 15;
  }
  else {
    label = "NEW GEN"; grade = "E"; rarity = "NEWBIE"; color = "#ffffff"; accent = "#ffffff"; baseLevel = 1;
  }

  const level = baseLevel + (parseInt(hashHex.slice(0, 4), 16) % 15);
  return { label, grade, rarity, color, accent, level };
}

const AGE_ANCHORS = {
  2768409: 1383264000000, 7679610: 1388448000000, 11538514: 1391212000000,
  15835244: 1392940000000, 23646077: 1393459000000, 38015510: 1393632000000,
  44634663: 1399334000000, 46145305: 1400198000000, 54845238: 1411257000000,
  63263518: 1414454000000, 101260938: 1425600000000, 101323197: 1426204000000,
  111220210: 1429574000000, 103258382: 1432771000000, 103151531: 1433376000000,
  116812045: 1437696000000, 122600695: 1437782000000, 109393468: 1439078000000,
  112594714: 1439683000000, 124872445: 1439856000000, 130029930: 1441324000000,
  125828524: 1444003000000, 133909606: 1444176000000, 157242073: 1446768000000,
  143445125: 1448928000000, 148670295: 1452211000000, 152079341: 1453420000000,
  171295414: 1457481000000, 181783990: 1460246000000, 222021233: 1465344000000,
  225034354: 1466208000000, 278941742: 1473465000000, 285253072: 1476835000000,
  294851037: 1479600000000, 297621225: 1481846000000, 328594461: 1482969000000,
  337808429: 1487707000000, 341546272: 1487782000000, 352940995: 1487894000000,
  369669043: 1490918000000, 400169472: 1501459000000, 805158066: 1563208000000,
  1974255900: 1634000000000,
};

const _anchorIds = Object.keys(AGE_ANCHORS).map(Number).sort((a, b) => a - b);
const _minAnchor = _anchorIds[0];
const _maxAnchor = _anchorIds[_anchorIds.length - 1];

function estimateCreationDate(userIdNum) {
  const id = Number(userIdNum);
  if (!Number.isFinite(id) || id <= 0) return { status: "unknown", date: null };
  if (id < _minAnchor) return { status: "older_than", date: new Date(AGE_ANCHORS[_minAnchor]) };
  if (id > _maxAnchor) return { status: "newer_than", date: new Date(AGE_ANCHORS[_maxAnchor]) };

  let lower = _anchorIds[0];
  for (let i = 0; i < _anchorIds.length; i++) {
    const upper = _anchorIds[i];
    if (id <= upper) {
      const lt = AGE_ANCHORS[lower];
      const ut = AGE_ANCHORS[upper];
      const ratio = (id - lower) / (upper - lower || 1);
      const mid = Math.floor(ratio * (ut - lt) + lt);
      return { status: "approx", date: new Date(mid) };
    }
    lower = upper;
  }
  return { status: "unknown", date: null };
}

function formatDateID(d) {
  if (!d) return "-";
  return d.toLocaleDateString("id-ID", { year: "numeric", month: "long" });
}

async function getAvatarImage(ctx, userId) {
  try {
    const p = await ctx.telegram.getUserProfilePhotos(userId, 0, 1);
    if (!p || p.total_count === 0 || !p.photos?.length) return null;
    const bestPhoto = p.photos[0][p.photos[0].length - 1];
    const fileLink = await ctx.telegram.getFileLink(bestPhoto.file_id);
    const url = typeof fileLink === 'string' ? fileLink : fileLink.href;

    const response = await axios.get(url, {
      responseType: "arraybuffer",
      timeout: 15000,
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    return await loadImage(Buffer.from(response.data));
  } catch (err) {
    console.log("⚠️ Gagal mengambil foto profil:", err.message);
    return null;
  }
}

// ===== HELPER BACA WAKTU (HARI/BULAN/TAHUN) =====
function parseTimeToMs(angka, satuan) {
    const time = parseInt(angka);
    if (isNaN(time)) return 0;
    
    satuan = satuan.toLowerCase();
    if (satuan.includes('hari')) return time * 24 * 60 * 60 * 1000;
    if (satuan.includes('bulan')) return time * 30 * 24 * 60 * 60 * 1000;
    if (satuan.includes('tahun')) return time * 365 * 24 * 60 * 60 * 1000;
    return 0; 
}

// ===== HELPER CEK DISKON & NAMA KASTA =====
function getUserRole(user) {
    if (!user || !user.role || user.role === "unverified") {
        return { name: "Member 🐇", diskon: 0 };
    }
    if (user.role_expired && Date.now() > user.role_expired) {
        return { name: "Belum Diverifikasi ❌ (Expired)", diskon: 0 };
    }
    if (user.role === "regular") return { name: "Regular ✅", diskon: 5 };
    if (user.role === "vip") return { name: "VIP ✅", diskon: 15 };
    if (user.role === "distributor") return { name: "Distributor", diskon: 30 };

    return { name: "Belum Diverifikasi ❌", diskon: 0 };
}

// ===== MESIN KALKULATOR DISKON =====
function getDiscountPrice(userId, basePrice) {
    const users = loadUsers();
    const user = users.find(u => u.id === userId);
    const roleData = getUserRole(user);
    
    const diskonPersen = roleData.diskon;
    const potongan = Math.floor(basePrice * (diskonPersen / 100));
    const finalPrice = basePrice - potongan;
    
    return {
        roleName: roleData.name,
        diskonPersen: diskonPersen,
        potongan: potongan,
        finalPrice: finalPrice
    };
}

const getBotStats = (db) => {
  const totalUser = db.length
  let totalTransaksi = 0
  let totalPemasukan = 0

  for (const user of db) {
    totalPemasukan += user.total_spent || 0
    totalTransaksi += user.history?.length || 0
  }

  return { totalUser, totalTransaksi, totalPemasukan }
}

// ===== FUNGSI LIHAT SEMUA COIN (OWNER) =====
async function sendCoinPage(ctx, page = 0) {
    const users = loadUsers();
    if (!users || users.length === 0) {
        return ctx.reply("📭 Belum ada user terdaftar.");
    }

    const sortedUsers = [...users].sort((a, b) => (b.balance || 0) - (a.balance || 0));
    const totalPages = Math.ceil(sortedUsers.length / USERS_PER_PAGE);
    const start = page * USERS_PER_PAGE;
    const end = start + USERS_PER_PAGE;
    const totalCoinSystem = users.reduce((sum, u) => sum + (u.balance || 0), 0);

    let text = `<blockquote><b>🪙 DAFTAR COIN SEMUA USER</b></blockquote>\n`;
    text += `━━━━━━━━━━━━━━━━━\n`;
    text += `📊 <b>Total Coin Sistem:</b> ${totalCoinSystem.toLocaleString('id-ID')} Coin\n`;
    text += `👥 <b>Total User:</b> ${users.length}\n`;
    text += `📄 <b>Halaman:</b> ${page + 1} / ${totalPages}\n`;
    text += `━━━━━━━━━━━━━━━━━\n\n`;

    sortedUsers.slice(start, end).forEach((u, i) => {
        const fullName = (u.first_name || "") + (u.last_name ? " " + u.last_name : "");
        const username = u.username ? "@" + u.username : "-";
        
        text += `<b>${start + i + 1}. ${escapeHTML(fullName || "No Name")}</b>\n`;
        text += `🆔 <code>${u.id}</code> | 👤 ${escapeHTML(username)}\n`;
        text += `🪙 <b>Coin:</b> ${(u.balance || 0).toLocaleString('id-ID')} Coin\n\n`;
    });

    const buttons = [];
    if (page > 0) buttons.push({ text: "⬅️ Prev", callback_data: `coinpage_${page - 1}` });
    if (page < totalPages - 1) buttons.push({ text: "Next ➡️", callback_data: `coinpage_${page + 1}` });

    const keyboard = { inline_keyboard: buttons.length > 0 ? [buttons] : [] };

    if (ctx.callbackQuery) {
        await ctx.editMessageText(text, { parse_mode: "HTML", reply_markup: keyboard });
    } else {
        await ctx.reply(text, { parse_mode: "HTML", reply_markup: keyboard });
    }
}

// ===== MESIN AUTO BACKUP DATABASE =====
async function autoBackupDB(ctx, jenisAktivitas, fileDbPath) {
    try {
        const user = ctx.from;
        const name = escapeHTML(user.first_name + (user.last_name ? " " + user.last_name : ""));
        const username = user.username ? `@${user.username}` : "Tidak ada";
        const waktu = new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });

        const caption = `♻️ <b>AUTO BACKUP DATABASE</b> ♻️\n\n` +
                        `🔔 <b>Aktivitas:</b> ${jenisAktivitas}\n` +
                        `👤 <b>Nama:</b> ${name}\n` +
                        `🆔 <b>ID:</b> <code>${user.id}</code>\n` +
                        `🌐 <b>Username:</b> ${username}\n` +
                        `🕒 <b>Waktu:</b> ${waktu} WIB\n\n` +
                        `<i>File database terbaru otomatis terlampir.</i>`;

        // Kirim dokumen langsung ke Owner
        await ctx.telegram.sendDocument(config.ownerId, { source: fileDbPath }, { caption: caption, parse_mode: "HTML" });
    } catch (err) {
        console.error("Gagal mengirim auto backup:", err.message);
    }
}

// ===== MESIN HALAMAN KATALOG SCRIPT =====
async function renderScriptPage(ctx, page) {
    const scriptsList = loadScripts();
    if (!scriptsList.length) {

        const emptyText = `
<blockquote><b>📦 KATALOG SCRIPT</b>
Saat ini belum ada Script yang tersedia di etalase.</blockquote>
<blockquote><i>Silakan kembali lagi nanti atau hubungi Admin untuk informasi produk terbaru.</i></blockquote>
`.trim();

        if (ctx.callbackQuery) {
            return ctx.editMessageText(emptyText, { parse_mode: "HTML" }).catch(()=>{});
        }
        return ctx.reply(emptyText, { parse_mode: "HTML" }).catch(()=>{});
    }

    const ITEMS_PER_PAGE = 20;
    const totalItems = scriptsList.length;
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

    const startIdx = page * ITEMS_PER_PAGE;
    const endIdx = startIdx + ITEMS_PER_PAGE;
    const currentItems = scriptsList.slice(startIdx, endIdx);

    const buttons = currentItems.map(s => [
        {
            text: `🗂 ${escapeHTML(s.name)} • ${Number(s.price).toLocaleString("id-ID")} Coin`,
            callback_data: `script|${s.name}`
        }
    ]);

    const navRow = [];
    if (page > 0) navRow.push({ text: "⬅️ PREV", callback_data: `script_page|${page - 1}` });
    navRow.push({ text: `📄 ${page + 1}/${totalPages}`, callback_data: "ignore" });
    if (page < totalPages - 1) navRow.push({ text: "NEXT ➡️", callback_data: `script_page|${page + 1}` });

    buttons.push(navRow);
    buttons.push([{ text: "Kembali", callback_data: "back_to_main_menu", icon_custom_emoji_id: "5210952531676504517" }]);

    const text = `
<blockquote><b><tg-emoji emoji-id="5854908544712707500">📦</tg-emoji> KATALOG SCRIPT</b>
Temukan berbagai <b>Script & Source Code</b> yang bisa kamu tukarkan menggunakan Coin.</blockquote>
<blockquote><b><tg-emoji emoji-id="5231200819986047254">📊</tg-emoji> INFORMASI ETALASE</b>
Total Script : <b>${totalItems}</b>
Halaman : <b>${page + 1}/${totalPages}</b></blockquote>
<blockquote><i>Pilih produk yang ingin kamu beli melalui tombol di bawah.</i></blockquote>
`.trim();

    try {
        await ctx.editMessageText(text, {
            parse_mode: "HTML",
            reply_markup: { inline_keyboard: buttons }
        });
    } catch (err) {
        if (err.description && err.description.includes("message is not modified")) return;

        await ctx.reply(text, {
            parse_mode: "HTML",
            reply_markup: { inline_keyboard: buttons }
        }).catch(() => {});
    }
}

// ===== MESIN HALAMAN RATING (TESTIMONI) =====
async function renderRatingPage(ctx, page) {
    const ratings = loadRatings();
    
    if (!ratings || ratings.length === 0) {
        const emptyText = `<blockquote><b><tg-emoji emoji-id="5226928895189598791">⭐️</tg-emoji> ULASAN PENGGUNA</b></blockquote>\n\n📭 <i>Belum ada rating/ulasan dari pengguna. Jadilah yang pertama dengan mengetik:</i>\n<code>${config.prefix}rating 5 Mantap botnya!</code>`;
        try {
            await ctx.editMessageText(emptyText, { 
                parse_mode: "HTML", 
                reply_markup: { inline_keyboard: [[{ text: "Kembali", callback_data: "back_to_main_menu", icon_custom_emoji_id: "5210952531676504517" }]] } 
            });
        } catch (err) {
            if (err.description && err.description.includes("message is not modified")) return;
            await ctx.deleteMessage().catch(()=>{});
            await ctx.reply(emptyText, { 
                parse_mode: "HTML", 
                reply_markup: { inline_keyboard: [[{ text: "Kembali", callback_data: "back_to_main_menu", icon_custom_emoji_id: "5210952531676504517" }]] } 
            }).catch(()=>{});
        }
        return;
    }

    const sortedRatings = [...ratings].sort((a, b) => new Date(b.date) - new Date(a.date));
    const ITEMS_PER_PAGE = 3; 
    const totalPages = Math.ceil(sortedRatings.length / ITEMS_PER_PAGE);
    const startIdx = page * ITEMS_PER_PAGE;
    const endIdx = startIdx + ITEMS_PER_PAGE;
    const currentItems = sortedRatings.slice(startIdx, endIdx);

    const totalStar = ratings.reduce((sum, r) => sum + r.star, 0);
    const avgStar = (totalStar / ratings.length).toFixed(1);

    let text = `<blockquote><b><tg-emoji emoji-id="5226928895189598791">⭐️</tg-emoji> ULASAN PENGGUNA (RATING)</b></blockquote>\n`;
    text += `📊 <b>Rata-rata:</b> ${avgStar} / 5.0 <tg-emoji emoji-id="5226928895189598791">⭐️</tg-emoji>\n`;
    text += `<tg-emoji emoji-id="5990171882500920057">👤</tg-emoji> <b>Total Ulasan:</b> ${ratings.length} Pengguna\n`;
    text += `▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰\n`;
    text += `💡 <b>Cara Memberi Ulasan:</b>\n`;
    text += `Ketik: <code>${config.prefix}rating [angka_bintang] [pesan_ulasan]</code>\n`;
    text += `Contoh: <code>${config.prefix}rating 5 Prosesnya cepet banget!</code>\n`;
    text += `▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰\n\n`;

    currentItems.forEach((r, i) => {
        const starDraw = `<tg-emoji emoji-id="5226928895189598791">⭐️</tg-emoji>`.repeat(r.star);
        const dateStr = new Date(r.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
        text += `<tg-emoji emoji-id="5990171882500920057">👤</tg-emoji> <b>${escapeHTML(r.name)}</b> ${r.username !== "-" ? `(@${r.username})` : ""}\n`;
        text += `<tg-emoji emoji-id="5472026645659401564">🗓</tg-emoji> ${dateStr} | ${starDraw}\n`;
        text += `<tg-emoji emoji-id="5443038326535759644">💬</tg-emoji> <i>"${escapeHTML(r.text)}"</i>\n`;
        text += `▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰\n`;
    });

    const navRow = [];
    if (page > 0) navRow.push({ text: "⬅️ PREV", callback_data: `rating_page|${page - 1}` });
    navRow.push({ text: `Hal ${page + 1}/${totalPages}`, callback_data: "ignore" });
    if (page < totalPages - 1) navRow.push({ text: "NEXT ➡️", callback_data: `rating_page|${page + 1}` });

    const keyboard = { inline_keyboard: [navRow, [{ text: "Kembali", callback_data: "back_to_main_menu", icon_custom_emoji_id: "5210952531676504517" }]] };

    try {
        await ctx.editMessageText(text, { parse_mode: "HTML", reply_markup: keyboard });
    } catch (err) {
        if (err.description && err.description.includes("message is not modified")) return;
        await ctx.deleteMessage().catch(()=>{});
        await ctx.reply(text, { parse_mode: "HTML", reply_markup: keyboard }).catch(()=>{});
    }
}

async function broadcastNewProduct(ctx, type, name, description, price, cmds) {
  const users = loadUsers();
  const now = new Date();
  const waktu = now.toLocaleString("id-ID", {
    weekday: "long", day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit"
  }).replace(".", ":");

  const text = `
🎉 <b>Produk Baru Telah Ditambahkan!</b>

📦 <b>Type:</b> ${escapeHTML(type)}
📛 <b>Nama:</b> ${escapeHTML(name)}${description ? " (" + escapeHTML(description) + ")" : ""}
💰 <b>Harga:</b> ${Number(price).toLocaleString("id-ID")} Coin

👤 <b>Ditambahkan Oleh:</b> @${escapeHTML(config.ownerUsername)}
🕒 <b>Waktu:</b> ${waktu}

Ketik <code>${escapeHTML(cmds)}</code> untuk membeli produknya!
`.trim();

  for (const u of users) {
    try {
      await ctx.telegram.sendMessage(u.id, text, { parse_mode: "HTML" });
      await new Promise(r => setTimeout(r, 1000));
    } catch (e) { }
  }
}

const menuTextBot = (ctx) => {
    let db = loadUsers();
    const firstName = ctx.from?.first_name || "-";
    const lastName = ctx.from?.last_name || "";
    const userId = ctx.from?.id;
    const { totalUser, totalTransaksi, totalPemasukan } = getBotStats(db);

    const myUser = db.find(u => u.id === userId);
    const myRefs = myUser ? (myUser.referrals || 0) : 0;
    const saldo = myUser ? (myUser.balance || 0) : 0;

    const fullName = firstName + (lastName ? " " + lastName : "");
    const userUsername = ctx.from?.username ? "@" + ctx.from.username : "Tidak ada";
    const roleData = getUserRole(myUser);

    // ==========================================
    // 🎨 KAMUS EMOJI PREMIUM BIAR KODINGAN RAPI
    // ==========================================
    const e = {
        loveHitam: '<tg-emoji emoji-id="5363838691510873846">🖤</tg-emoji>',
        lovePutih: '<tg-emoji emoji-id="5411329291659013967">🤍</tg-emoji>',
        centang: '<tg-emoji emoji-id="5206607081334906820">✔️</tg-emoji>',
        user: '<tg-emoji emoji-id="5990171882500920057">👤</tg-emoji>',
        id: '<tg-emoji emoji-id="5334815750655849990">🆔</tg-emoji>',
        surat: '<tg-emoji emoji-id="5253742260054409879">✉️</tg-emoji>',
        stop: '<tg-emoji emoji-id="5017122105011995219">⛔</tg-emoji>',
        uangMuka: '<tg-emoji emoji-id="5361939671720926182">🤑</tg-emoji>',
        uangKertas: '<tg-emoji emoji-id="5215725958329282459">💵</tg-emoji>',
        peluk: '<tg-emoji emoji-id="5258417246056754328">🤗</tg-emoji>',
        lampu: '<tg-emoji emoji-id="5262844652964303985">💡</tg-emoji>'
    };

    return `
<blockquote><b>${e.loveHitam} Selamat Datang ${escapeHTML(firstName)}!</b>
Di <b>Coin Script Bot</b> kamu bisa mendapatkan berbagai <b>Script Premium</b> hanya dengan menukarkan <b>Coin</b> yang kamu kumpulkan dari fitur bot.</blockquote>
<blockquote><b>${e.lovePutih} INFORMASI AKUN</b>
• Status : <b>${roleData.name}${e.centang}</b>
• Version : <b>2.0</b></blockquote>
<blockquote><b>${e.user} PROFILE KAMU</b>
${e.id} ID : <code>${userId}</code>
${e.surat} Username : ${escapeHTML(userUsername)}
${e.stop} Nama : <code>${escapeHTML(fullName)}</code></blockquote>
<blockquote><b>${e.uangMuka} STATISTIK</b>
${e.uangKertas} Coin : <b>${saldo.toLocaleString("id-ID")}</b>
${e.peluk} Referral : <b>${myRefs}</b> Orang</blockquote>
<blockquote>${e.lampu} <i>Kumpulkan Coin sebanyak mungkin lalu tukarkan dengan Script yang tersedia di bot.</i></blockquote>
`.trim();
};

function createConfirmationText(productType, productName, price, fee, details = {}) {
  let detailText = "";
  const now = new Date();
  const waktu = now.toLocaleString("id-ID", {
    weekday: "long", day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit"
  }).replace(".", ":");

  if (productType === "script") {
    detailText = `📦 Nama Script: ${escapeHTML(productName)}\n📝 Deskripsi: ${escapeHTML(details.description || "-")}`;
  }

  return `📝 <b>Konfirmasi Pemesanan</b>\n\n📦 Produk: ${escapeHTML(productName)}\n💰 Harga: ${formatCoin(price)} Coin\n🕒 Waktu: ${waktu}\n\n${detailText}\n\n⚠️ Apakah Anda yakin ingin melanjutkan pembayaran?`;
}

async function sendUserPage(ctx, page = 0) {
    const users = loadUsers();
    if (!users || users.length === 0) {
        return ctx.reply("📭 Belum ada user terdaftar.");
    }

    const totalPages = Math.ceil(users.length / USERS_PER_PAGE);
    const start = page * USERS_PER_PAGE;
    const end = start + USERS_PER_PAGE;

    let userText = `<b>📊 TOTAL USERS: ${users.length}</b>\n<b>📄 PAGE ${page + 1} / ${totalPages}</b>\n\n`;

    users.slice(start, end).forEach((u, i) => {
        const fullName = (u.first_name || "") + (u.last_name ? " " + u.last_name : "");
        const username = u.username ? "@" + u.username : "-";

        userText += `<b>${start + i + 1}. ${escapeHTML(fullName || "No Name")}</b>\n`;
        userText += `🆔 <code>${u.id}</code>\n👤 ${escapeHTML(username)}\n💰 ${formatCoin(u.total_spent || 0)} Coin\n📅 ${u.join_date ? new Date(u.join_date).toLocaleDateString("id-ID") : "-"}\n\n`;
    });

    const buttons = [];
    if (page > 0) buttons.push({ text: "⬅️ Prev", callback_data: `userpage_${page - 1}` });
    if (page < totalPages - 1) buttons.push({ text: "➡️ Next", callback_data: `userpage_${page + 1}` });

    const keyboard = { inline_keyboard: buttons.length > 0 ? [buttons] : [] };

    if (ctx.callbackQuery) {
        await ctx.editMessageText(userText, { parse_mode: "HTML", reply_markup: keyboard });
    } else {
        await ctx.reply(userText, { parse_mode: "HTML", reply_markup: keyboard });
    }
}

// ==========================================
// 👑 SISTEM MULTI-OWNER (FULL AKSES)
// ==========================================
const ownerDB = path.join(__dirname, "/db/owners.json");
if (!fs.existsSync(ownerDB)) fs.writeFileSync(ownerDB, "[]");
global.ownersCache = JSON.parse(fs.readFileSync(ownerDB, "utf-8") || "[]");

function loadOwners() { return global.ownersCache; }
function saveOwners(data) {
    global.ownersCache = data;
    fs.writeFileSync(ownerDB, JSON.stringify(data, null, 2));
}

const isOwner = (ctx) => {
    const fromId = ctx.from?.id || ctx.callbackQuery?.from?.id || ctx.inlineQuery?.from?.id;
    if (!fromId) return false;
    
    // 1. Cek apakah dia Supreme Owner (Dari config)
    if (fromId.toString() === String(config.ownerId)) return true;
    
    // 2. Cek apakah dia Co-Owner dari Database
    return global.ownersCache.some(o => String(o.id) === String(fromId));
}

// Fungsi untuk update user history
function updateUserHistory(userId, orderData, details = {}) {
    const users = loadUsers();
    const userIndex = users.findIndex(u => u.id === userId);
    
    if (userIndex !== -1) {
        if (!users[userIndex].history) users[userIndex].history = [];
        
        const transaction = {
            product: orderData.name,
            amount: orderData.amount,
            type: orderData.type,
            timestamp: new Date().toISOString()
        };
        
        if (orderData.type === "script") {
             transaction.details = `Script: ${orderData.name}`;
        } else {
             transaction.details = details.description || "-";
        }
        
        users[userIndex].history.push(transaction);
        saveUsers(users);
    }
}

async function getMissingChannels(ctx) {
    let channels = [];
    if (Array.isArray(config.wajibJoinChannels)) {
        channels = config.wajibJoinChannels;
    } else if (config.wajibJoinChannel) {
        channels = [config.wajibJoinChannel];
    }

    if (channels.length === 0) return [];

    const missing = [];
    for (const ch of channels) {
        try {
            const member = await ctx.telegram.getChatMember(ch, ctx.from.id);
            if (!['member', 'administrator', 'creator'].includes(member.status)) {
                missing.push(ch);
            }
        } catch (e) {
            missing.push(ch);
        }
    }
    return missing;
}


async function notifyOwner(ctx, orderData, buyerInfo) {
  try {
    const now = new Date();
    const waktu = now.toLocaleString("id-ID", {
      weekday: "long", day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit"
    }).replace(".", ":");

    let productDetails = "";
    if (orderData.type === "script") {
        productDetails = `📦 Script: ${escapeHTML(orderData.name)}`;
    } else if (orderData.type === "apk") {
        productDetails = `📱 APK Mod: ${escapeHTML(orderData.name)}`; // TAMBAHAN UNTUK APK
    }

    const buyerUsername = buyerInfo.username ? escapeHTML(buyerInfo.username) : "Tidak ada";
    const buyerName = escapeHTML(buyerInfo.name);

    const notificationText = `
<blockquote>💰 <b>PENUKARAN BERHASIL DIPROSES!</b></blockquote>
<blockquote>━━━━━━━━━━━━━━━━━
🕒 Waktu: ${waktu}
📦 Produk: ${escapeHTML(orderData.name)}
💰 Total: ${formatCoin(orderData.amount)} Coin
👤 Buyer: ${buyerName}
🆔 User ID: <code>${buyerInfo.id}</code>
📱 Username: ${buyerInfo.username ? "@" + buyerUsername : "Tidak ada"}
━━━━━━━━━━━━━━━━━</blockquote>
<blockquote>📋 Detail Produk:
${productDetails}
━━━━━━━━━━━━━━━</blockquote>
<blockquote>📊 Total Pembelian User: ${formatCoin(buyerInfo.totalSpent)} Coin</blockquote>`.trim();

    const contactButton = {
      text: "📞 TUKAR COIN",
      url: `https://t.me/${config.botUsername}`
    };

    await ctx.telegram.sendMessage(config.channelId, notificationText, {
      parse_mode: "HTML",
      reply_markup: { inline_keyboard: [[contactButton]] }
    });

  } catch (error) {
    console.error("Error notifying owner:", error);
  }
}

module.exports = (bot) => {
  bot.catch((err, ctx) => {
    console.error('Telegraf error:', err);
  });
  process.on('unhandledRejection', (reason) => {
    console.error('UnhandledRejection:', reason);
  });
  process.on('uncaughtException', (err) => {
    console.error('UncaughtException:', err);
  });

global.channelTitleCache = global.channelTitleCache || {}; 
// 🚀 MEMORI MICRO-CACHE (Ingat status join selama 3 detik anti-lag)
global.subCache = global.subCache || {};

bot.use(async (ctx, next) => {
    // 1. OWNER BEBAS LEWAT PALING UTAMA (Anti blokir buat bosku)
    if (ctx.from && String(ctx.from.id) === String(config.ownerId)) return next();

    // ==========================================
    // 🛑 2. SISTEM MAINTENANCE MODE (BERLAKU DI PM & GRUP) 🛑
    // ==========================================
    const settings = loadSettings();
    if (settings.maintenance) {
        if (ctx.callbackQuery) return ctx.answerCbQuery("🛠️ BOT UNDER MAINTENANCE!", { show_alert: true }).catch(() => {});
        else if (ctx.message) return ctx.reply("🛠️ <b>BOT UNDER MAINTENANCE</b>\n\nMohon maaf, bot sedang dalam perbaikan.", { parse_mode: "HTML" }).catch(() => {});
        return; // Setop di sini! Di grup pun ga bakal bisa lewat kalau lagi maintenance
    }

    // ==========================================
    // 3. ABAIKAN FORCE SUB JIKA DI GRUP
    // ==========================================
    // Taruh di sini agar maintenance tetap nahan grup, tapi Wajib Join Channel gak ganggu grup
    if (ctx.chat && ctx.chat.type !== 'private') return next();

    const userId = ctx.from?.id;
    const rawChannels = config.wajibJoinChannels || (config.wajibJoinChannel ? [config.wajibJoinChannel] : []);
    const channels = rawChannels.filter(c => c && c.length > 1); 
    
    // ==========================================
    // 🛑 4. PENGECEKAN REAL-TIME (AUTO KICK UNFOLLOW PM) 🛑
    // ==========================================
    if (channels.length > 0 && userId) {
        // Biarkan tombol cek_join lewat
        if (ctx.callbackQuery && ctx.callbackQuery.data === 'cek_join') return next();

        // 🛡️ ANTI LAG API: Jika user baru dicek kurang dari 3 detik lalu, loloskan
        const now = Date.now();
        if (global.subCache[userId] && (now - global.subCache[userId] < 3000)) {
            return next(); 
        }

        // Tembak API Telegram buat ngecek Real-time
        const missingChannels = await getMissingChannels(ctx);
        
        if (missingChannels.length > 0) {
            delete global.subCache[userId]; // Hapus memori, langsung blokir!
            
            if (ctx.message && ctx.message.text && ctx.message.text.startsWith('/start ')) {
                const args = ctx.message.text.split(' ');
                if (args.length > 1) pendingStartArgs[userId] = args[1];
            }

            const textPeringatan = `🛑 <b>AKSES DITOLAK!</b>\n▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰━\nKamu belum bergabung ke channel kami atau baru saja keluar (unfollow).\n\nSilakan join kembali ke channel di bawah ini agar bisa menggunakan bot.\n\n👇 <i>Klik tombol di bawah, lalu tekan <b>SAYA SUDAH JOIN</b>.</i>`;
            
            const buttons = [];
            for (const ch of channels) {
                let displayName = global.channelTitleCache[ch] || ch; 
                let chNameLink = ch.replace('@', '').trim();
                buttons.push([{ text: `📢 ${displayName}`, url: `https://t.me/${chNameLink}` }]);
            }
            
            buttons.push([{ text: '✅ SAYA SUDAH JOIN SEMUA', callback_data: 'cek_join' }]);
            const keyboard = { inline_keyboard: buttons };

            try {
                if (ctx.callbackQuery) {
                    await ctx.answerCbQuery('❌ Akses ditolak! Join dulu bos!', { show_alert: true }).catch(() => {});
                    try { await ctx.deleteMessage(); } catch(e){}
                    return ctx.reply(textPeringatan, { parse_mode: 'HTML', reply_markup: keyboard });
                } 
                if (ctx.message) {
                    return ctx.reply(textPeringatan, { parse_mode: 'HTML', reply_markup: keyboard });
                }
            } catch (err) {}
            return; // 🛑 BLOKIR TOTAL DI SINI JIKA UNFOLLOW!
        } else {
            // Jika dia masih bergabung, perbarui waktu cachenya ke detik ini
            global.subCache[userId] = now;
        }
    }
    
    return next(); 
});

// ===== MENU PENGATURAN FITUR (OWNER ONLY) =====
bot.action("admin_features", async (ctx) => {
    await ctx.answerCbQuery().catch(()=>{});
    if (!isOwner(ctx)) return ctx.answerCbQuery("❌ Akses Ditolak! Khusus Owner.", { show_alert: true });

    const settings = loadSettings();
    const btn = (key, name) => ({
        text: settings[key] ? `🟢 ${name}` : `🔴 ${name}`,
        callback_data: `toggle_feature|${key}`
    });

    const buttons = [
        [btn('script', 'Jual Script')],
        [{ text: "↩️ Kembali ke Katalog", callback_data: "katalog" }]
    ];

    let text = `<blockquote>⚙️ <b>CONTROL PANEL FITUR</b></blockquote>\n\nSilakan klik tombol di bawah untuk Menyalakan (🟢) atau Mematikan (🔴) fitur di bot.\n\n<i>*Jika dimatikan, user yang mengklik menu tersebut akan otomatis tertolak oleh sistem.</i>`;

    try {
        await ctx.editMessageMedia(
            { type: "photo", media: config.menuImage, caption: text, parse_mode: "HTML" },
            { reply_markup: { inline_keyboard: buttons } }
        );
    } catch (err) {
        if (err.description && err.description.includes("message is not modified")) return;
        await ctx.deleteMessage().catch(()=>{});
        await ctx.replyWithPhoto(config.menuImage, { caption: text, parse_mode: "HTML", reply_markup: { inline_keyboard: buttons } }).catch(()=>{});
    }
});

// ===== MESIN PENGUBAH ON / OFF =====
bot.action(/toggle_feature\|(.+)/, async (ctx) => {
    if (!isOwner(ctx)) return ctx.answerCbQuery("❌ Khusus Owner!", { show_alert: true });
    
    const key = ctx.match[1];
    const settings = loadSettings();
    settings[key] = !settings[key]; 
    saveSettings(settings);

    await ctx.answerCbQuery(`✅ Fitur ${key.toUpperCase()} berhasil diubah menjadi ${settings[key] ? "ON" : "OFF"}!`);
    
    const btn = (k, name) => ({ text: settings[k] ? `🟢 ${name}` : `🔴 ${name}`, callback_data: `toggle_feature|${k}` });
    const buttons = [
        [btn('script', 'Jual Script')],
        [{ text: "↩️ Kembali ke Katalog", callback_data: "katalog" }]
    ];
    await ctx.editMessageReplyMarkup({ inline_keyboard: buttons }).catch(()=>{});
});


    // #### HANDLE STORE BOT MENU ##### //
// #### HANDLE STORE BOT MENU ##### //
    bot.on("message", async (ctx) => {
        const msg = ctx.message;

        // Tangkap teks biasa ATAU teks di bawah foto/video (caption)
        const body = (msg.text || msg.caption || "").trim();

        // ==========================================
        // 🚀 SISTEM MULTI-PREFIX (BISA / BISA . BISA !)
        // ==========================================
        // Lu bisa bebas nambahin simbol apa aja di dalam kurung siku ini bos!
        const allowedPrefixes = ['/', '.', '!', '#', '?']; 
        
        // Bot bakal nyari, apakah chat diawali sama salah satu simbol di atas?
        const usedPrefix = allowedPrefixes.find(p => body.startsWith(p));

        const isCmd = !!usedPrefix; // Jadi True kalau diawali prefix
        const args = body.split(/ +/).slice(1);
        const text = args.join(" ");
        
        // Memotong prefix dari command biar murni nama perintahnya aja (misal: /start jadi start)
        const command = isCmd
            ? body.slice(usedPrefix.length).trim().split(" ")[0].toLowerCase()
            : body.toLowerCase();
            
        const fromId = ctx.from.id;
        // ==========================================
        // ==========================================
        // 🛡️ SHIELD ANTI-LAG UNTUK GRUP
        // ==========================================
        // Abaikan semua chat di grup yang BUKAN command dan BUKAN balasan sistem
        if (ctx.chat && ctx.chat.type !== 'private') {
            if (!isCmd && !pendingDeposit[fromId] && !global.pendingSchedule[fromId] && !pendingTransfer[fromId] && !pendingDeleteAllCoin[fromId]) {
                return; // Langsung buang pesannya, jangan diproses! (Bot jadi super ringan)
            }
        }
        // ==========================================
        const userName = ctx.from.username || `${ctx.from.first_name}${ctx.from.last_name ? ' ' + ctx.from.last_name : ''}`;
        
        // ===== TANGKAP INPUT CUSTOM BET SLOT =====
        global.pendingSlotBet = global.pendingSlotBet || {};
        if (global.pendingSlotBet[fromId]) {
            const gameId = global.pendingSlotBet[fromId];
            const jawaban = body.toLowerCase().trim();
            
            if (jawaban === "batal") {
                delete global.pendingSlotBet[fromId]; 
                return ctx.reply("✅ <b>Custom Bet Dibatalkan.</b>", { parse_mode: "HTML" });
            }

            const amount = parseInt(jawaban.replace(/[^0-9]/g, ''));
            if (isNaN(amount) || amount < 10000) {
                return ctx.reply("❌ Nominal tidak valid! Minimal bet adalah 10.000 Coin.\n\n<i>Ketik <b>batal</b> untuk membatalkan.</i>", { parse_mode: "HTML" });
            }

            const users = loadUsers();
            const user = users.find(u => u.id === fromId);
            if (!user || (user.balance || 0) < amount) {
                return ctx.reply(`❌ <b>Saldo tidak cukup!</b>\nSaldo kamu saat ini: <b>${formatCoin(user?.balance || 0)} Coin</b>\n\n<i>Silakan masukkan nominal lain atau ketik <b>batal</b>.</i>`, { parse_mode: "HTML" });
            }

            // Simpan bet sesuai input bebas (Bisa 44 juta, 15 juta, dll)
            global.userBets[fromId] = amount;
            delete global.pendingSlotBet[fromId];

            return ctx.reply(`✅ <b>CUSTOM BET BERHASIL!</b>\nTaruhan kamu diatur menjadi: <b>${formatCoin(amount)} Coin</b>\n\n<i>Silakan kembali ke menu slot dan mulai Spin!</i>`, { parse_mode: "HTML" });
        }

        // ===== TANGKAP INPUT CUSTOM DEPOSIT =====
        if (pendingDeposit[fromId]) {
            delete pendingDeposit[fromId]; 
            const amount = parseInt(body.replace(/[^0-9]/g, '')); 
            
            if (isNaN(amount) || amount < 1000) {
                return ctx.reply("❌ Nominal tidak valid. Minimal Topup adalah 1.000 Coin.\nSilakan klik tombol kembali dari menu.");
            }
            return processDeposit(ctx, amount, fromId);
        }
        
// ===== TANGKAP INPUT JADWAL KIRIM CHANNEL =====
        global.pendingSchedule = global.pendingSchedule || {};
        if (global.pendingSchedule[fromId]) {
            const data = global.pendingSchedule[fromId];
            const jawaban = body.toLowerCase().trim();
            
            if (jawaban === "batal") {
                delete global.pendingSchedule[fromId];
                return ctx.reply("✅ <b>Jadwal dibatalkan.</b>", { parse_mode: "HTML" });
            }

            let delayMs = 0;
            let timeText = "";

            // 1. CEK FORMAT JAM SPESIFIK (Contoh: 22:00 atau 13.23)
            const timeMatch = jawaban.match(/^(\d{1,2})[:.](\d{2})$/);
            if (timeMatch) {
                const targetHour = parseInt(timeMatch[1]);
                const targetMinute = parseInt(timeMatch[2]);
                
                if (targetHour > 23 || targetMinute > 59) {
                    return ctx.reply("❌ <b>Format jam salah!</b>\nJam maksimal 23, Menit maksimal 59.", { parse_mode: "HTML" });
                }

                const now = new Date();
                const targetTime = new Date(now);
                targetTime.setHours(targetHour, targetMinute, 0, 0);

                // Hitung selisih waktu (milisec)
                delayMs = targetTime.getTime() - now.getTime();
                
                if (delayMs <= 0) {
                    delayMs += 24 * 60 * 60 * 1000; // Kalau jamnya udah kelewat, jadwalkan buat besok!
                    timeText = `besok pada pukul ${targetHour.toString().padStart(2, '0')}:${targetMinute.toString().padStart(2, '0')}`;
                } else {
                    timeText = `hari ini pada pukul ${targetHour.toString().padStart(2, '0')}:${targetMinute.toString().padStart(2, '0')}`;
                }
            } 
            // 2. CEK FORMAT DURASI (Contoh: 30 menit, 20 detik, 1 jam)
            else {
                const val = parseInt(jawaban.replace(/[^0-9]/g, ''));
                if (isNaN(val) || val <= 0) {
                    return ctx.reply("❌ <b>Format salah!</b>\nContoh yang benar:\n• <code>30 menit</code>\n• <code>20 detik</code>\n• <code>1 jam</code>\n• <code>22:00</code>\n\n<i>Ketik <b>batal</b> untuk membatalkan.</i>", { parse_mode: "HTML" });
                }

                if (jawaban.includes("detik")) {
                    delayMs = val * 1000;
                    timeText = `dalam waktu ${val} Detik ke depan`;
                } else if (jawaban.includes("jam")) {
                    delayMs = val * 60 * 60 * 1000;
                    timeText = `dalam waktu ${val} Jam ke depan`;
                } else {
                    delayMs = val * 60 * 1000; // Default menit
                    timeText = `dalam waktu ${val} Menit ke depan`;
                }
            }

            delete global.pendingSchedule[fromId]; // Hapus antrean supaya gak nyangkut
            
            ctx.reply(`✅ <b>BERHASIL DIJADWALKAN!</b>\n\nSistem akan mengirimkan hadiah dengan kode <code>${data.kode}</code> ke channel secara otomatis <b>${timeText}</b>.\n\n<i>Kamu bisa meninggalkan chat ini, bot akan bekerja secara otomatis di belakang layar.</i>`, { parse_mode: "HTML" });

            // Set Timeout pakai delayMs yang sudah dihitung bot
            setTimeout(async () => {
                try {
                    const vouchers = loadVouchers();
                    if (!vouchers[data.kode]) return; // Batal kirim kalau vouchernya udah kehapus
                    
                    const v = vouchers[data.kode];
                    if (!v.reactions) {
                        v.reactions = { "0": 0, "1": 0, "2": 0, "3": 0 };
                        v.reacted_users = {}; 
                        saveVouchers(vouchers);
                    }

                    const botUsername = ctx.botInfo.username;
                    const redeemLink = `https://t.me/${botUsername}?start=redeem_${data.kode}`;
                    const targetChannel = config.channelIdDaget || config.channelId;
                    
                    const kaell = {
                    coin: '<tg-emoji emoji-id="5208801655004350721">💰</tg-emoji>',
                    kotak: '<tg-emoji emoji-id="5203996991054432397">🎁</tg-emoji>',
                    kunci: '<tg-emoji emoji-id="5330115548900501467">🔑</tg-emoji>',
                    bunga: '<tg-emoji emoji-id="5192959294470895031">🪅</tg-emoji>',
                    teman: '<tg-emoji emoji-id="5458789419014182183">👥</tg-emoji>',
                    bawah: '<tg-emoji emoji-id="6147439566107186310">👇</tg-emoji>',
                    garis: '<tg-emoji emoji-id="5413382711228259707">▰</tg-emoji>'
                    };

                    let textChannel = "";
                    let claimText = "";

if (data.type === "voucher") {
    textChannel =
`<blockquote>${kaell.bunga} <b>VOUCHER COIN GRATIS!</b></blockquote>
${kaell.garis.repeat(10)}

Siapa cepat dia dapat!  
Segera klaim coin gratis untuk membeli Script, Source Code, atau APK Mod di dalam bot kami.

${kaell.coin} <b>Nominal :</b> ${v.nominal.toLocaleString('id-ID')} Coin
${kaell.kotax} <b>Kuota   :</b> ${v.kuota} Orang Pemenang
${kaell.kunci} <b>Kode    :</b> <code>${data.kode}</code>

${kaell.garis.repeat(10)}
${kaell.bawah} <i>Klik tombol di bawah ini untuk mengklaim!</i>`;

    claimText = `${kaell.kotax} KLAIM VOUCHER SEKARANG`;

} else {
    textChannel =
`<blockquote>${kaell.bunga} <b>DANA KAGET COIN (GIVEAWAY)</b></blockquote>
${kaell.garis.repeat(10)}

Ayo adu hoki! Nominal coin yang didapatkan akan diacak otomatis menggunakan sistem <b>Dana Kaget</b>.

${kaell.coin} <b>Total Hadiah :</b> ${v.total_pool.toLocaleString('id-ID')} Coin
${kaell.teman} <b>Pemenang     :</b> ${v.kuota} Orang
${kaell.kunci} <b>Kode         :</b> <code>${data.kode}</code>

${kaell.garis.repeat(10)}
${kaell.bawah} <i>Klik tombol di bawah ini untuk berebut!</i>`;

    claimText = "🚀 KLAIM DANA KAGET";
}

                    const emojis = ["😞", "😎", "🔥", "❤"];
                    const reactionButtons = emojis.map((em, idx) => {
                        const count = v.reactions[idx] || 0;
                        return { text: count > 0 ? `${em} ${count}` : em, callback_data: `react|${data.kode}|${idx}` };
                    });

                    const keyboard = { inline_keyboard: [ reactionButtons, [{ text: claimText, url: redeemLink }] ] };

                    await ctx.telegram.sendPhoto(targetChannel, config.menuImage, { caption: textChannel, parse_mode: "HTML", reply_markup: keyboard });
                    
                    await ctx.telegram.sendMessage(fromId, `✅ <b>JADWAL SELESAI!</b>\n\nHadiah <code>${data.kode}</code> yang dijadwalkan telah berhasil dikirim ke channel!`, { parse_mode: "HTML" });

                } catch (err) {
                    ctx.telegram.sendMessage(fromId, `❌ <b>Jadwal Error:</b>\nGagal mengirim hadiah otomatis ke channel. Pastikan bot adalah Admin.`, { parse_mode: "HTML" });
                }
            }, delayMs); 

            return; 
        }
        
        // ===== TANGKAP INPUT TRANSFER COIN =====
        if (pendingTransfer[fromId]) {
            const jawaban = body.toLowerCase();
            
            if (jawaban === "batal") {
                delete pendingTransfer[fromId]; 
                return ctx.reply("✅ <b>Transfer dibatalkan.</b>", { parse_mode: "HTML" });
            }

            const parts = body.split(" ");
            if (parts.length < 2) {
                return ctx.reply("❌ <b>Format salah!</b>\nGunakan format: <code>[ID/Username] [Nominal]</code>\nContoh: <code>@zyntherion 50000</code>\n\n<i>Ketik <b>batal</b> untuk membatalkan.</i>", { parse_mode: "HTML" });
            }

            const targetStr = parts[0];
            const amount = parseInt(parts[1].replace(/[^0-9]/g, ''));

            if (isNaN(amount) || amount <= 0) {
                return ctx.reply("❌ Nominal tidak valid! Harus berupa angka.", { parse_mode: "HTML" });
            }

            const users = loadUsers();
            let receiverIndex = -1;

            // Cek apakah pakai Username (@) atau pakai ID (angka)
            if (targetStr.startsWith('@')) {
                const targetUsername = targetStr.replace('@', '').toLowerCase();
                receiverIndex = users.findIndex(u => u.username && u.username.toLowerCase() === targetUsername);
            } else {
                receiverIndex = users.findIndex(u => String(u.id) === targetStr);
            }

            if (receiverIndex === -1) {
                return ctx.reply("❌ <b>TRANSFER GAGAL!</b>\nUser penerima tidak ditemukan di database bot. Pastikan ID atau Username sudah benar dan mereka sudah pernah start bot ini.", { parse_mode: "HTML" });
            }

            const receiver = users[receiverIndex];
            if (receiver.id === fromId) {
                return ctx.reply("❌ Kamu tidak bisa mengirim coin ke akunmu sendiri!", { parse_mode: "HTML" });
            }

            const senderIndex = users.findIndex(u => u.id === fromId);
            
            // Cek apakah saldo cukup
            if ((users[senderIndex].balance || 0) < amount) {
                delete pendingTransfer[fromId]; // Langsung batalkan sesi kalau saldo kurang
                return ctx.reply(`❌ <b>SALDO TIDAK CUKUP!</b>\nSaldo kamu saat ini: <b>${(users[senderIndex].balance || 0).toLocaleString('id-ID')} Coin</b>.\nTransfer dibatalkan.`, { parse_mode: "HTML" });
            }

            // PROSES TRANSFER COIN (POTONG & TAMBAH)
            users[senderIndex].balance -= amount;
            users[receiverIndex].balance = (users[receiverIndex].balance || 0) + amount;
            
            saveUsers(users); // Simpan perubahan ke database
            delete pendingTransfer[fromId]; // Selesaikan sesi transfer

            // Notifikasi ke Penerima (Opsional, tapi bagus)
            ctx.telegram.sendMessage(receiver.id, `💸 <b>COIN MASUK!</b>\nKamu menerima transfer sebesar <b>${amount.toLocaleString('id-ID')} Coin</b> dari <b>${ctx.from.first_name}</b>.`, { parse_mode: "HTML" }).catch(()=>{});

            // Laporan Berhasil ke Pengirim
            return ctx.reply(`✅ <b>TRANSFER BERHASIL!</b>\nKamu telah mengirim <b>${amount.toLocaleString('id-ID')} Coin</b> ke <b>${receiver.first_name || targetStr}</b>.\n\n🪙 Sisa saldo kamu: <b>${users[senderIndex].balance.toLocaleString('id-ID')} Coin</b>`, { parse_mode: "HTML" });
        }

        // ===== ADD USER & REFERRAL LOGIC =====
        if (fromId) {
            const users = loadUsers();
            const existingUser = users.find(u => u.id === fromId);
            
            if (!existingUser) {
                let inviterId = null;
                
                if (command === "start" && args[0] && args[0].startsWith("ref_")) {
                    inviterId = parseInt(args[0].split("_")[1]);
                }
                
                const userToAdd = {
                    id: fromId,
                    username: userName,
                    first_name: ctx.from.first_name,
                    last_name: ctx.from.last_name || "",
                    join_date: new Date().toISOString(),
                    total_spent: 0,
                    history: [],
                    balance: 0,
                    referrals: 0, 
                    ref_earnings: 0 
                };
                
                users.push(userToAdd);
                
                if (inviterId && inviterId !== fromId) {
                    const inviterIndex = users.findIndex(u => u.id === inviterId);
                    if (inviterIndex !== -1) {
                        const bonus = 100000000; 
                        users[inviterIndex].balance = (users[inviterIndex].balance || 0) + bonus;
                        users[inviterIndex].referrals = (users[inviterIndex].referrals || 0) + 1;
                        users[inviterIndex].ref_earnings = (users[inviterIndex].ref_earnings || 0) + bonus;
                        
                        ctx.telegram.sendMessage(inviterId, `🎉 <b>HORE!</b>\nSeseorang telah bergabung menggunakan link referral kamu!\n💰 Coin kamu bertambah ${bonus.toLocaleString('id-ID')} Coin`, { parse_mode: "HTML" }).catch(() => {});
                    }
                }
                saveUsers(users);
            }
        }
        
        // ===== TANGKAP KONFIRMASI DELETE ALL COIN =====
        if (pendingDeleteAllCoin[fromId]) {
            const jawaban = body.toLowerCase();
            
            if (jawaban === "batal") {
                delete pendingDeleteAllCoin[fromId]; 
                return ctx.reply("✅ <b>Tindakan Dibatalkan.</b>\nCoin semua user aman dan tidak dihapus.", { parse_mode: "HTML" });
            } 
            
            if (jawaban === "oke") {
                delete pendingDeleteAllCoin[fromId]; 
                
                const users = loadUsers();
                let totalCoinDihapus = 0;
                let totalUserDireset = 0;

                for (let i = 0; i < users.length; i++) {
                    if (users[i].balance > 0) {
                        totalCoinDihapus += users[i].balance;
                        users[i].balance = 0;
                        totalUserDireset++;
                    }
                }
                saveUsers(users);

                const resetText = `
<blockquote><b>✅ SEMUA COIN USER BERHASIL DIHAPUS!</b></blockquote>
━━━━━━━━━━━━━━━━━
Proses <i>reset</i> coin (Sapu Jagat) telah selesai dilakukan.

📊 <b>Statistik Reset:</b>
👥 Total User Direset: <b>${totalUserDireset} Orang</b>
💰 Total Coin Dihanguskan: <b>${totalCoinDihapus.toLocaleString('id-ID')} Coin</b>
━━━━━━━━━━━━━━━━━
`.trim();
                return ctx.reply(resetText, { parse_mode: "HTML" });
            }
            return ctx.reply("❌ <b>Input tidak valid.</b>\n👇 Balas dengan mengetik <code>oke</code> untuk lanjut, atau <code>batal</code> untuk membatalkan.", { parse_mode: "HTML" });
        }
        
// ===== TANGKAP BALASAN OWNER KE USER (SUPPORT MEDIA) =====
        if (isOwner(ctx) && ctx.message.reply_to_message) {
            const repMsg = ctx.message.reply_to_message;
            let targetId = null;

            if (global.csHistory && global.csHistory[repMsg.message_id]) {
                targetId = global.csHistory[repMsg.message_id];
            } 
            else if (repMsg.text || repMsg.caption) {
                const matchText = repMsg.text || repMsg.caption || "";
                const match = matchText.match(/ID:\s*(\d+)/);
                if (match) targetId = match[1];
            }

            if (targetId) {
                try {
                    // Kasih teks intro dulu
                    await ctx.telegram.sendMessage(targetId, `👨‍💻 <b>Balasan dari Admin:</b>`, { parse_mode: "HTML" });
                    
                    // Gunakan copyMessage: Bisa copy file, foto, video, VN, stiker persis seperti aslinya tanpa limit MB!
                    await ctx.telegram.copyMessage(targetId, ctx.chat.id, ctx.message.message_id);
                    ctx.reply("✅ Balasan berhasil dikirim ke user.");
                } catch (e) {
                    ctx.reply("❌ Gagal mengirim balasan. User mungkin telah memblokir bot.");
                }
                return; 
            }
        }

        // ===== TANGKAP CHAT DARI USER KE CS (SUPPORT MEDIA) =====
        if (pendingCsChat[fromId]) {
            global.csHistory = global.csHistory || {}; 
            
            try {
                // Gunakan forwardMessage: Bisa terusin file GB-an langsung ke admin
                const fwdMsg = await ctx.telegram.forwardMessage(config.ownerId, ctx.chat.id, ctx.message.message_id);
                global.csHistory[fwdMsg.message_id] = fromId; 

                const infoMsg = await ctx.telegram.sendMessage(config.ownerId, `☝️ <b>Tiket Bantuan (CS)</b>\n👤 Dari: ${escapeHTML(ctx.from.first_name)}\n🆔 ID: <code>${fromId}</code>\n\n<i>*Silakan Reply (Balas) foto/video/pesan yang diteruskan di atas untuk menjawab user.</i>`, { parse_mode: "HTML" });
                global.csHistory[infoMsg.message_id] = fromId;

                ctx.reply("✅ <i>Pesan/File berhasil dikirim ke Admin. Mohon tunggu balasannya...</i>", { parse_mode: "HTML" });
            } catch (err) {
                ctx.reply("❌ <i>Gagal mengirim pesan ke Admin.</i>", { parse_mode: "HTML" });
            }
            return; 
        }
        
        switch (command) {
case "menu":
case "start": {
    if (args[0] && args[0].startsWith("redeem_")) {
        const kode = args[0].replace("redeem_", "").toUpperCase();

        global.redeemLock = global.redeemLock || new Set();
        if (global.redeemLock.has(fromId)) return; 
        global.redeemLock.add(fromId);

        try {
            const vouchers = loadVouchers();

            if (!vouchers[kode]) return ctx.reply("❌ Kode voucher/GA tidak ditemukan atau salah.");
            if (vouchers[kode].kuota <= 0) return ctx.reply("❌ Maaf, kuota sudah habis (Siapa cepat dia dapat!).");

            // CEK APAKAH SUDAH KLAIM (Sistem Baru anti duplikat)
            const hasClaimed = vouchers[kode].claimedBy.some(c => c === fromId || (typeof c === 'object' && c.id === fromId));
            if (hasClaimed) return ctx.reply("❌ Kamu sudah pernah klaim hadiah ini!");

            const users = loadUsers();
            const userIndex = users.findIndex(u => u.id === fromId);
            


            if (userIndex === -1) return ctx.reply("❌ Error: Akun belum terdaftar. Silakan ketik /start kembali.");

            // LOGIC PEMBAGIAN DANA KAGET / VOUCHER BIASA
            let dapatCoin = 0;
            let textTipe = "Voucher";
            
            if (vouchers[kode].type === "ga") {
                textTipe = "Giveaway";
                if (vouchers[kode].kuota === 1) {
                    dapatCoin = vouchers[kode].remaining_pool; 
                } else {
                    const rata2 = Math.floor(vouchers[kode].remaining_pool / vouchers[kode].kuota);
                    const min = Math.floor(rata2 * 0.4) || 1; 
                    const max = Math.floor(rata2 * 1.6);
                    dapatCoin = Math.floor(Math.random() * (max - min + 1)) + min;
                }
                vouchers[kode].remaining_pool -= dapatCoin;
            } else {
                dapatCoin = vouchers[kode].nominal;
            }

            users[userIndex].balance = (users[userIndex].balance || 0) + dapatCoin;
            vouchers[kode].kuota -= 1; 
            
            // SIMPAN DATA PEMENANG SECARA LENGKAP
            vouchers[kode].claimedBy.push({
                id: fromId,
                name: ctx.from.first_name + (ctx.from.last_name ? ' ' + ctx.from.last_name : ''),
                username: ctx.from.username || null,
                amount: dapatCoin
            });

            saveUsers(users);
            saveVouchers(vouchers);

// AUTO KIRIM LIST KE CHANNEL KALAU DANA KAGET HABIS
            if (vouchers[kode].type === "ga" && vouchers[kode].kuota === 0) {
          const kaell = {
            bunga: '<tg-emoji emoji-id="5192959294470895031">🎉</tg-emoji>',
            kunci: '<tg-emoji emoji-id="5330115548900501467">🔑</tg-emoji>',
            coin: '<tg-emoji emoji-id="5208801655004350721">💰</tg-emoji>',
            teman: '<tg-emoji emoji-id="5458789419014182183">👥</tg-emoji>',
            piala: '<tg-emoji emoji-id="5848075728486143781">🏆</tg-emoji>',
            kotax: '<tg-emoji emoji-id="5203996991054432397">🎁</tg-emoji>',
            profil: '<tg-emoji emoji-id="5258011929993026890">👤</tg-emoji>',
            id: '<tg-emoji emoji-id="5334890573281114250">🆔</tg-emoji>'
            };
                const sortedWinners = [...vouchers[kode].claimedBy].sort((a, b) => b.amount - a.amount);
                let listText = `<blockquote>${kaell.bunga} <b>DANA KAGET TELAH HABIS!</b></blockquote>\n▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰\n`;
                listText += `${kaell.kunci} <b>Kode:</b> <code>${kode}</code>\n`;
                listText += `${kaell.coinq} <b>Total Dibagikan:</b> ${vouchers[kode].total_pool.toLocaleString('id-ID')} Coin\n`;
                listText += `${kaell.teman} <b>Total Pemenang:</b> ${sortedWinners.length} Orang\n▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰\n\n`;
                listText += `${kaell.piala} <b>DAFTAR PEMENANG:</b>\n`;
                
                sortedWinners.forEach((w, i) => {
                    const uname = w.username ? `@${w.username}` : "Tidak ada";
                    
                    // Logic Medali Premium
                    let medali = "🏅";
                    if (i === 0) medali = '<tg-emoji emoji-id="5440539497383087970">🥇</tg-emoji>';
                    else if (i === 1) medali = '<tg-emoji emoji-id="5447203607294265305">🥈</tg-emoji>';
                    else if (i === 2) medali = '<tg-emoji emoji-id="5453902265922376865">🥉</tg-emoji>';

                    listText += `<b>${medali} ${escapeHTML(w.name)}</b>\n`;
                    listText += `└ ${kaell.id} <code>${w.id}</code> | ${kaell.profil} ${uname}\n`;
                    listText += `└ ${kaell.kotak} <b>Mendapat: ${w.amount.toLocaleString('id-ID')} Coin</b>\n\n`;
                });
                
                listText += `<i>Nantikan Dana Kaget selanjutnya hanya di channel ini!</i>`;
                ctx.telegram.sendMessage(config.channelIdDaget, listText, { parse_mode: "HTML" }).catch(()=>{});
            }

            return ctx.reply(`🎉 <b>SELAMAT!</b>\n\nKamu berhasil menukarkan kode ${textTipe} <code>${kode}</code>!\n💰 Coin bertambah ${dapatCoin.toLocaleString('id-ID')} Coin\n🪙 Coin sekarang: ${users[userIndex].balance.toLocaleString('id-ID')} Coin`, { parse_mode: "HTML" });
        } finally {
            setTimeout(() => global.redeemLock.delete(fromId), 2000);
        }
    }

    // 🔥 GANTI DARI replyWithPhoto MENJADI reply SAJA
    return ctx.reply(menuTextBot(ctx), {
        parse_mode: "HTML",
        reply_markup: {
            inline_keyboard: [
            [
                { 
                  text: "List APK Mod", 
                  callback_data: "buyapk",
                  icon_custom_emoji_id: "5913264639025615311"
                },
               {
                  text: "List Script", 
                  callback_data: "buyscript",
                  icon_custom_emoji_id: "5818955300463447293"
               }
            ],
            [
                { 
                  text: "Claim Harian", 
                  callback_data: "claim_harian",
                  icon_custom_emoji_id: "5449800250032143374"
                },
                { 
                  text: "Spin Gacha", 
                  callback_data: "menu_gacha",
                  icon_custom_emoji_id: "5328247482939890897"
                }
            ],
            [
                { 
                  text: "Referral",
                  callback_data: "menu_referral",
                  icon_custom_emoji_id: "5258362837411045098"
                 },
                { 
                  text: "Kirim Coin", 
                  callback_data: "transfer_coin",
                  icon_custom_emoji_id: "5213170203680060059"
                }
            ],
            [
              { 
                text: "Mystery Box", 
                callback_data: "menu_mystery",
                icon_custom_emoji_id: "5854908544712707500"
              }
            ],
            [
               { 
                 text: "Misi Coin",
                 callback_data: "misi_coin",
                 icon_custom_emoji_id: "5269254848703902904"
               },
               { 
                 text: "Cek Profil", 
                 callback_data: "profile",
                 icon_custom_emoji_id: "5316727448644103237"
               }
            ],
            [
                {
                  text: "Cek Rating", 
                  callback_data: "cek_rating",
                  icon_custom_emoji_id: "5469744063815102906"
                },
                {
                  text: "Top Pengguna", 
                  callback_data: "top_users",
                  icon_custom_emoji_id: "5368617177635107810"
                }
            ],
            [
               { 
                 text: "Cs / Tiket Bantuan", 
                 callback_data: "cs_ai_start",
                 icon_custom_emoji_id: "5238025132177369293"
               }
           ]
            ]
        }
    });
}

case "buyscript": {
    const settings = loadSettings();
    if (!settings.script) return ctx.reply("💻 Stok Script Kosong\n\n😕 Untuk saat ini belum ada script yang bisa diproses.");
    return renderScriptPage(ctx, 0);
}

// ===== FITUR VOUCHER & REFFERAL =====
case "addvoucher": {
    if (!isOwner(ctx)) return ctx.reply("❌ Owner Only!");

    if (args.length < 3) {
        return ctx.reply(`Format: ${config.prefix}addvoucher [kode] [nominal] [kuota]\nContoh:\n${config.prefix}addvoucher PROMO10K 10000 50\nAtau bisa juga:\n${config.prefix}addvoucher PROMO10K 10.000 50`);
    }

    const kode = args[0].toUpperCase();
    const nominal = parseInt(args[1].replace(/[^0-9]/g, ''));
    const kuota = parseInt(args[2]);

    if (isNaN(nominal) || isNaN(kuota)) return ctx.reply("❌ Nominal dan kuota harus berupa angka!");

    const vouchers = loadVouchers();
    if (vouchers[kode]) return ctx.reply("❌ Kode voucher sudah terdaftar!");

    vouchers[kode] = {
        nominal,
        kuota,
        claimedBy: [],
        created_at: new Date().toISOString()
    };
    saveVouchers(vouchers);

    const botUsername = ctx.botInfo.username; 
    const redeemLink = `https://t.me/${botUsername}?start=redeem_${kode}`;

    return ctx.reply(
`🎉 <b>FREE COIN UNTUK MEMBELI PRODUK (SCRIPT / APK)</b>
▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰
💰 Coin: <b>${nominal.toLocaleString('id-ID')} Coin</b>
🎁 Hadiah Untuk: <b>${kuota}</b> orang
▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰

🔑 Kode Voucher:
<code>${kode}</code>

🚀 Klaim Manual:
${redeemLink}`,
        { 
            parse_mode: "HTML",
            reply_markup: {
                inline_keyboard: [
                    [{ text: "📢 Kirim Sekarang", callback_data: `send_ch_voucher|${kode}` }],
                    [{ text: "⏳ Jadwalkan (Timer)", callback_data: `schedule_ch_voucher|${kode}` }]
                ]
            }
        }
    );
}

case "redeem": {
    if (args.length < 1) return ctx.reply(`Ketik kode vouchernya bos!\nContoh: ${config.prefix}redeem KODE`);
    const kode = args[0].toUpperCase();
    
    global.redeemLock = global.redeemLock || new Set();
    if (global.redeemLock.has(fromId)) return;
    global.redeemLock.add(fromId);

    try {
        const vouchers = loadVouchers();
        if (!vouchers[kode]) return ctx.reply("❌ Kode voucher/GA tidak ditemukan atau salah.");
        if (vouchers[kode].kuota <= 0) return ctx.reply("❌ Maaf, kuota hadiah ini sudah habis.");
        
        const hasClaimed = vouchers[kode].claimedBy.some(c => c === fromId || (typeof c === 'object' && c.id === fromId));
        if (hasClaimed) return ctx.reply("❌ Kamu sudah pernah klaim hadiah ini!");
        
        const users = loadUsers();
        const userIndex = users.findIndex(u => u.id === fromId);
        if (userIndex === -1) return ctx.reply("❌ Error: User tidak ditemukan."); 
        
        // LOGIC PEMBAGIAN DANA KAGET / VOUCHER BIASA
        let dapatCoin = 0;
        let textTipe = "Voucher";
        
        if (vouchers[kode].type === "ga") {
            textTipe = "Giveaway";
            if (vouchers[kode].kuota === 1) {
                dapatCoin = vouchers[kode].remaining_pool; 
            } else {
                const rata2 = Math.floor(vouchers[kode].remaining_pool / vouchers[kode].kuota);
                const min = Math.floor(rata2 * 0.4) || 1; 
                const max = Math.floor(rata2 * 1.6);
                dapatCoin = Math.floor(Math.random() * (max - min + 1)) + min;
            }
            vouchers[kode].remaining_pool -= dapatCoin;
        } else {
            dapatCoin = vouchers[kode].nominal;
        }

        users[userIndex].balance = (users[userIndex].balance || 0) + dapatCoin;
        vouchers[kode].kuota -= 1;
        
        vouchers[kode].claimedBy.push({
            id: fromId,
            name: ctx.from.first_name + (ctx.from.last_name ? ' ' + ctx.from.last_name : ''),
            username: ctx.from.username || null,
            amount: dapatCoin
        });
        
        saveUsers(users);
        saveVouchers(vouchers);
        
        // AUTO KIRIM LIST KE CHANNEL KALAU DANA KAGET HABIS
        if (vouchers[kode].type === "ga" && vouchers[kode].kuota === 0) {
            const sortedWinners = [...vouchers[kode].claimedBy].sort((a, b) => b.amount - a.amount);
            let listText = `<blockquote>🎉 <b>DANA KAGET TELAH HABIS!</b></blockquote>\n▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰\n`;
            listText += `🔑 <b>Kode:</b> <code>${kode}</code>\n`;
            listText += `💰 <b>Total Dibagikan:</b> ${vouchers[kode].total_pool.toLocaleString('id-ID')} Coin\n`;
            listText += `👥 <b>Total Pemenang:</b> ${sortedWinners.length} Orang\n▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰\n\n`;
            listText += `🏆 <b>DAFTAR PEMENANG:</b>\n`;
            
            sortedWinners.forEach((w, i) => {
                const uname = w.username ? `@${w.username}` : "Tidak ada";
                const medali = i === 0 ? "🥇" : (i === 1 ? "🥈" : (i === 2 ? "🥉" : "🏅"));
                listText += `<b>${medali} ${escapeHTML(w.name)}</b>\n`;
                listText += `└ 🆔 <code>${w.id}</code> | 👤 ${uname}\n`;
                listText += `└ 🎁 <b>Mendapat: ${w.amount.toLocaleString('id-ID')} Coin</b>\n\n`;
            });
            listText += `<i>Nantikan Dana Kaget selanjutnya hanya di channel ini!</i>`;
            ctx.telegram.sendMessage(config.channelIdDaget, listText, { parse_mode: "HTML" }).catch(()=>{});
        }

        return ctx.reply(`🎉 <b>SELAMAT!</b>\n\nKamu berhasil menukarkan kode ${textTipe} <code>${kode}</code>.\n💰 Coin bertambah ${dapatCoin.toLocaleString('id-ID')} Coin\n🪙 Coin sekarang: ${users[userIndex].balance.toLocaleString('id-ID')} Coin`, { parse_mode: "HTML" });
    } finally {
        setTimeout(() => global.redeemLock.delete(fromId), 2000);
    }
}

// ===== FITUR UPGRADE KASTA USER =====
case "addregular":
case "addvip":
case "adddistro":
case "adddistributor": {
    if (!isOwner(ctx)) return ctx.reply("❌ Owner Only!");
    
    const targetId = args[0];
    const angka = args[1];
    const satuan = args[2];
    
    if (!targetId || !angka || !satuan) {
        return ctx.reply(`❌ Format salah!\nContoh: ${config.prefix}${command} 1402991119 30 hari\nSatuan yang didukung: hari, bulan, tahun`);
    }

    const durationMs = parseTimeToMs(angka, satuan);
    if (durationMs === 0) return ctx.reply("❌ Format waktu tidak valid! Gunakan: hari / bulan / tahun");

    const users = loadUsers();
    const userIndex = users.findIndex(u => u.id == targetId);
    if (userIndex === -1) return ctx.reply("❌ User tidak ditemukan di database!");

    let roleName = "Regular";
    let roleKey = "regular";
    if (command.includes("vip")) { roleName = "VIP"; roleKey = "vip"; }
    if (command.includes("distro") || command.includes("distributor")) { roleName = "Distributor"; roleKey = "distributor"; }

    users[userIndex].role = roleKey;
    users[userIndex].role_expired = Date.now() + durationMs;
    saveUsers(users);

    const expDate = new Date(users[userIndex].role_expired).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });

    ctx.reply(`✅ <b>Berhasil Upgrade Akun!</b>\n\n🆔 ID: <code>${targetId}</code>\n🔰 Pangkat: <b>${roleName} ✅</b>\n⏳ Expired: ${expDate}`, { parse_mode: "HTML" });
    ctx.telegram.sendMessage(targetId, `🎉 <b>SELAMAT! AKUN KAMU TELAH DI-UPGRADE!</b>\n\n🔰 Pangkat Baru: <b>${roleName} ✅</b>\n⏳ Berlaku Sampai: ${expDate}\n\n<i>Nikmati diskon eksklusif untuk setiap transaksi layanan di bot kami!</i>`, { parse_mode: "HTML" }).catch(()=>{});
    break;
}

// ===== COMMAND GANTI FILE (REMOTE UPDATE) =====
case "ganti": {
    if (!isOwner(ctx)) return ctx.reply("❌ Owner Only!");

    const targetPath = args[0];
    if (!targetPath) {
        return ctx.reply(`❌ <b>Format salah!</b>\n\nCara pakai: Reply/balas file yang ingin diupload, lalu ketik:\n<code>${config.prefix}ganti [lokasi_file]</code>\n\nContoh:\n<code>${config.prefix}ganti db/users.json</code>\n<code>${config.prefix}ganti config.js</code>`, { parse_mode: "HTML" });
    }

    if (targetPath.includes("..")) return ctx.reply("❌ Jalur tidak valid! Dilarang menggunakan '..'");

    const forbiddenFiles = ["index.js", "package.json", "package-lock.json", ".env"];
    if (forbiddenFiles.includes(targetPath.toLowerCase())) {
        return ctx.reply(`❌ <b>DITOLAK!</b>\nFile <code>${targetPath}</code> adalah file inti sistem dan tidak boleh diganti dari Telegram demi keamanan.`, { parse_mode: "HTML" });
    }

    const replyMsg = ctx.message.reply_to_message;
    if (!replyMsg || !replyMsg.document) {
        return ctx.reply("❌ Kamu harus me-reply (membalas) sebuah file Document yang akan diupload!");
    }

    const doc = replyMsg.document;
    const waitMsg = await ctx.reply(`⏳ <i>Sedang mengunduh dan menimpa file <b>${targetPath}</b>...</i>`, { parse_mode: "HTML" });

    try {
        const link = await ctx.telegram.getFileLink(doc.file_id);
        const res = await axios.get(link.href, { responseType: "arraybuffer" });
        const savePath = path.resolve(__dirname, targetPath);
        const dirName = path.dirname(savePath);
        if (!fs.existsSync(dirName)) fs.mkdirSync(dirName, { recursive: true });

        fs.writeFileSync(savePath, res.data);

        await ctx.telegram.editMessageText(ctx.chat.id, waitMsg.message_id, undefined, `✅ <b>FILE BERHASIL DITIMPA!</b>\n\nFile <code>${targetPath}</code> telah diperbarui.\n\n🔄 <i>Bot akan melakukan Restart Otomatis dalam 3 detik untuk menerapkan perubahan...</i>`, { parse_mode: "HTML" });
        setTimeout(() => process.exit(1), 3000);
    } catch (err) {
        await ctx.telegram.editMessageText(ctx.chat.id, waitMsg.message_id, undefined, `❌ <b>Gagal mengganti file:</b>\n<code>${err.message}</code>`, { parse_mode: "HTML" });
    }
    break;
}

// ===== FITUR CABUT PANGKAT USER =====
case "delrole":
case "delvip":
case "delregular":
case "deldistro": {
    if (!isOwner(ctx)) return ctx.reply("❌ Owner Only!");
    
    const targetId = args[0];
    if (!targetId) return ctx.reply(`❌ Format salah!\nContoh: ${config.prefix}delrole 1402991119`);

    const users = loadUsers();
    const userIndex = users.findIndex(u => u.id == targetId);
    if (userIndex === -1) return ctx.reply("❌ User tidak ditemukan di database!");

    users[userIndex].role = "unverified";
    users[userIndex].role_expired = null;
    saveUsers(users);

    ctx.reply(`✅ <b>Pangkat Berhasil Dicabut!</b>\nAkun <code>${targetId}</code> telah kembali menjadi Belum Diverifikasi ❌.`, { parse_mode: "HTML" });
    ctx.telegram.sendMessage(targetId, `⚠️ <b>INFORMASI AKUN</b>\n\nMasa aktif pangkat kamu telah berakhir atau dicabut oleh Admin. Akun kamu kembali menjadi <b>Belum Diverifikasi ❌</b>. Harga produk kembali normal.`, { parse_mode: "HTML" }).catch(()=>{});
    break;
}

case "ref":
case "referral": {
    const botUser = await ctx.telegram.getMe();
    const refLink = `https://t.me/${botUser.username}?start=ref_${fromId}`;
    
    const users = loadUsers();
    const myUser = users.find(u => u.id === fromId);
    const myRefs = myUser.referrals || 0;
    const myEarnings = myUser.ref_earnings || 0;
    
    const text = `🤝 <b>SISTEM REFERRAL</b>\n\nAjak temanmu menggunakan bot ini dan dapatkan coin gratis <b>1.000 Coin</b> untuk setiap teman yang mendaftar dan menekan /start melalui link kamu!\n\n🔗 <b>Link Referral Kamu:</b>\n<code>${refLink}</code>\n\n📊 <b>Statistik Kamu:</b>\n👥 Teman diundang: ${myRefs} orang\n💰 Total bonus didapat: ${myEarnings.toLocaleString('id-ID')} Coin`;
    
    return ctx.reply(text, { parse_mode: "HTML", disable_web_page_preview: true });
}

// ===== DOWNLOAD DATABASE DARI SERVER =====
case "getdb": {
    if (!isOwner(ctx)) return ctx.reply("❌ Owner only!");
    
    await ctx.reply("⏳ <i>Sedang mengambil file database dari server...</i>", { parse_mode: "HTML" });
    
    try {
        const filesToSent = [
            { path: "./db/users.json", name: "users.json" },
            { path: "./db/scripts.json", name: "scripts.json" },
            { path: "./db/vouchers.json", name: "vouchers.json" },
            { path: "./db/ratings.json", name: "ratings.json" }
        ];

        for (let file of filesToSent) {
            if (fs.existsSync(file.path)) {
                await ctx.telegram.sendDocument(ctx.chat.id, 
                    { source: file.path, filename: file.name }, 
                    { caption: `📂 Database: ${file.name}` }
                );
            }
        }
        return ctx.reply("✅ <b>Semua database berhasil di-backup!</b>\n\n<i>Silakan timpa file ini ke folder lokal/GitHub kamu sebelum melakukan update (push).</i>", { parse_mode: "HTML" });
    } catch (err) {
        return ctx.reply(`❌ Gagal mengambil database: ${err.message}`);
    }
}

case "cekcoin": {
    if (!isOwner(ctx)) return ctx.reply("❌ Owner Only!");
    const targetId = args[0];
    if (!targetId) return ctx.reply("Masukkan ID User!");
    
    const users = loadUsers();
    const user = users.find(u => u.id == targetId);
    if (!user) return ctx.reply("❌ User tidak ditemukan di database.");
    
    return ctx.reply(`💰 Coin User ID <code>${targetId}</code>:\n${(user.balance || 0).toLocaleString('id-ID')} Coin`, { parse_mode: "HTML" });
}

case "addcoin": {
    if (!isOwner(ctx)) return ctx.reply("❌ Owner Only!");
    const targetId = args[0];
    const amountStr = args[1];
    
    if (!targetId || !amountStr) return ctx.reply(`Format salah!\nContoh: ${config.prefix}addcoin 1402991119 2000`);
    
    const amount = parseInt(amountStr.replace(/[^0-9]/g, ''));
    if (isNaN(amount)) return ctx.reply("Nominal harus berupa angka!");

    const users = loadUsers();
    const userIndex = users.findIndex(u => u.id == targetId);
    if (userIndex === -1) return ctx.reply("❌ User tidak ditemukan.");

    users[userIndex].balance = (users[userIndex].balance || 0) + amount;
    saveUsers(users);

    ctx.telegram.sendMessage(targetId, `🎉 <b>SELAMAT!</b>\nCoin Anda telah ditambahkan sebesar ${amount.toLocaleString('id-ID')} Coin oleh Admin.`, { parse_mode: "HTML" });
    return ctx.reply(`✅ Berhasil menambahkan ${amount.toLocaleString('id-ID')} Coin ke user ${targetId}. Coin sekarang: ${users[userIndex].balance.toLocaleString('id-ID')} Coin`);
}

case "delcoin": {
    if (!isOwner(ctx)) return ctx.reply("❌ Owner Only!");
    const targetId = args[0];
    const amountStr = args[1];
    
    if (!targetId || !amountStr) return ctx.reply(`Format salah!\nContoh: ${config.prefix}delcoin 1402991119 2000`);
    
    const amount = parseInt(amountStr.replace(/[^0-9]/g, ''));
    if (isNaN(amount)) return ctx.reply("Nominal harus berupa angka!");

    const users = loadUsers();
    const userIndex = users.findIndex(u => u.id == targetId);
    if (userIndex === -1) return ctx.reply("❌ User tidak ditemukan.");

    users[userIndex].balance = Math.max(0, (users[userIndex].balance || 0) - amount);
    saveUsers(users);

    return ctx.reply(`✅ Berhasil mengurangi ${amount.toLocaleString('id-ID')} Coin dari user ${targetId}. Coin sekarang: ${users[userIndex].balance.toLocaleString('id-ID')} Coin`);
}

// ===== PROFILE USER =====
case "profile": {
    const users = loadUsers();
    const user = users.find(u => u.id === fromId);
    if (!user) return ctx.reply("❌ User tidak ditemukan.");

    const firstName = user.first_name || '';
    const lastName = user.last_name || '';
    const fullName = firstName + (lastName ? ' ' + lastName : '');
    const userUsername = user.username ? '@' + user.username : 'Tidak ada';

    let lastTransactions = '<i>Belum ada transaksi</i>';
    if (user.history && user.history.length > 0) {
        lastTransactions = user.history.slice(-3).reverse().map((t, i) => {
            const product = escapeHTML(t.product);
            const amount = formatCoin(t.amount);
            const date = new Date(t.timestamp).toLocaleDateString('id-ID');
            return `${i + 1}. ${product} - ${amount} Coin (${date})`;
        }).join('\n');
    }
    
    const e = {
    batal: '<tg-emoji emoji-id="5370675038200541160">⛔️</tg-emoji>'
    };

    const profileText = `
<blockquote><b>🪪 Profile Kamu</b>
━━━━━━━━━━━━━━━━━
<b>${e.batal} Nama:</b> <code>${escapeHTML(fullName)}</code>
<b>👤 Nama Depan:</b> <code>${escapeHTML(firstName)}</code>
<b>👥 Nama Belakang:</b> <code>${escapeHTML(lastName)}</code>
<b>🆔 User ID:</b> <code>${user.id}</code>
<b>📧 Username:</b> ${escapeHTML(userUsername)}
<b>📅 Join Date:</b> ${new Date(user.join_date).toLocaleDateString('id-ID')}
<b>💰 Total Spent:</b> ${formatCoin(user.total_spent || 0)} Coin
<b>📊 Total Transaksi:</b> ${user.history ? user.history.length : 0}
━━━━━━━━━━━━━━━━━
<b>📋 Last 3 Transactions:</b>\n
${lastTransactions}</blockquote>
    `.trim();

    return ctx.reply(profileText, { parse_mode: "HTML", disable_web_page_preview: true });
}

// ===== HISTORY USER =====
case "history": {
    const users = loadUsers();
    const user = users.find(u => u.id === fromId);
    if (!user || !user.history || user.history.length === 0) {
        return ctx.reply("📭 Belum ada riwayat transaksi.");
    }

    let historyText = `<b>📋 Riwayat Transaksi</b>\n\n`;
    user.history.slice().reverse().forEach((t, i) => {
        historyText += `<b>${i + 1}. ${escapeHTML(t.product)}</b>\n`;
        historyText += `💰 Harga: ${formatCoin(t.amount)} Coin\n`;
        historyText += `📅 Tanggal: ${new Date(t.timestamp).toLocaleDateString('id-ID')} ${new Date(t.timestamp).toLocaleTimeString('id-ID')}\n`;
        historyText += `📦 Tipe: ${escapeHTML(t.type)}\n`;
        if (t.details) historyText += `📝 Detail: ${escapeHTML(t.details)}\n`;
        historyText += `\n`;
    });

    return ctx.reply(historyText, { parse_mode: "HTML" });
}

// ===== USERLIST (OWNER ONLY) =====
case "userlist": {
    if (!isOwner(ctx)) return ctx.reply("❌ Owner Only!");
    return sendUserPage(ctx, 0);
}

// ===== FITUR CEK INFO USER ALA ROSE BOT =====
case "info":
case "userinfo":
case "me": {
    let targetUser = ctx.from;

    // Jika me-reply pesan orang lain di grup
    if (ctx.message.reply_to_message) {
        targetUser = ctx.message.reply_to_message.from;
    } 
    // Jika menggunakan format /info [ID/Username] (Opsional)
    else if (args.length > 0) {
        const targetStr = args[0].replace('@', '').toLowerCase();
        const users = loadUsers();
        const foundUser = users.find(u => String(u.id) === targetStr || (u.username && u.username.toLowerCase() === targetStr));
        if (foundUser) {
            targetUser = {
                id: foundUser.id,
                first_name: foundUser.first_name || "Unknown",
                last_name: foundUser.last_name || "",
                username: foundUser.username || ""
            };
        }
    }

    const e = {
        silang: '<tg-emoji emoji-id="5215204871422093648">❌</tg-emoji>',
        centang: '<tg-emoji emoji-id="5206607081334906820">✔️</tg-emoji>',
        vip: '<tg-emoji emoji-id="5949775417274536507">⭕️</tg-emoji>',
        mahkota: '<tg-emoji emoji-id="6089005604037203306">👑</tg-emoji>',
        struk: '<tg-emoji emoji-id="5444856076954520455">🧾</tg-emoji>',
        id: '<tg-emoji emoji-id="5334815750655849990">🆔</tg-emoji>',
        loveP1: '<tg-emoji emoji-id="5364342035908161370">🤍</tg-emoji>',
        loveP2: '<tg-emoji emoji-id="5363952636993236667">🤍</tg-emoji>',
        loveH: '<tg-emoji emoji-id="5411104892502698581">🖤</tg-emoji>',
        link: '<tg-emoji emoji-id="5990332467033150285">🔗</tg-emoji>',
        botStatus: '<tg-emoji emoji-id="5323547156630483403">👍</tg-emoji>',
        role: '<tg-emoji emoji-id="5877200331217047850">🎤</tg-emoji>',
        coin: '<tg-emoji emoji-id="5463046637842608206">🪙</tg-emoji>',
        garis: '<tg-emoji emoji-id="5413382711228259707">➖</tg-emoji>',
        member: '<tg-emoji emoji-id="5363938656874673963">🌹</tg-emoji>',
        mute: '<tg-emoji emoji-id="5462990730253319917">🔇</tg-emoji>',
        admin: '<tg-emoji emoji-id="5373173798633752502">🛡</tg-emoji>',
        leaft: '<tg-emoji emoji-id="5386568779427757100">🚶‍♂️</tg-emoji>',
        banned: '<tg-emoji emoji-id="5429452773747860261">❌</tg-emoji>'
    };

    const targetId = targetUser.id;
    const firstName = escapeHTML(targetUser.first_name || "");
    const lastName = escapeHTML(targetUser.last_name || "");
    const username = targetUser.username ? `@${escapeHTML(targetUser.username)}` : "Tidak ada";
    const userLink = `tg://user?id=${targetId}`;

    // Cek status kepangkatan di Grup
    let groupStatus = "";
    if (ctx.chat.type !== "private") {
        try {
            const memberInfo = await ctx.telegram.getChatMember(ctx.chat.id, targetId);
            const statusMap = {
                'creator': `Creator ${e.mahkota}`,
                'administrator': `Admin ${e.admin}`,
                'member': `Member ${e.member}`,
                'restricted': `Restricted ${e.mute}`,
                'left': `Left ${e.leaft}`,
                'kicked': `Banned ${e.banned}`
            };
            groupStatus = statusMap[memberInfo.status] || memberInfo.status;
        } catch (err) {
            groupStatus = "Tidak diketahui";
        }
    }

    // Ambil data tambahan dari Database Bot lu
    const usersDb = loadUsers();
    const dbUser = usersDb.find(u => u.id === targetId);
    
    let botRole = `Unverified ${e.silang}`;
    let botCoin = 0;
    
    if (dbUser) {
        botCoin = dbUser.balance || 0;
        if (dbUser.role === "regular") botRole = `Regular ${e.centang}`;
        else if (dbUser.role === "vip") botRole = `VIP ${e.vip}`;
        else if (dbUser.role === "distributor") botRole = `Distributor ${e.mahkota}`;
    }

    // ==========================================
    // 📝 MERAKIT TEKS BALASAN (RAPAT & PADAT)
    // ==========================================
    let infoText = `<blockquote><b>${e.struk} User info:</b>\n<b>${e.id}:</b> <code>${targetId}</code></blockquote>\n`;
    infoText += `${e.garis.repeat(10)}\n`;
    
    infoText += `<blockquote><b>${e.loveP1} First Name:</b> ${firstName}\n`;
    if (lastName) infoText += `<b>${e.loveP2} Last Name:</b> ${lastName}\n`;
    infoText += `<b>${e.loveH} Username:</b> ${username}\n`;
    infoText += `<b>${e.link} User link:</b> <a href="${userLink}">link</a>`;
    
    if (ctx.chat.type !== "private") {
        infoText += `\n<b>Status:</b> ${groupStatus}`;
    }
    infoText += `</blockquote>\n`;
    infoText += `${e.garis.repeat(10)}\n`;
    
    infoText += `<blockquote><b>${e.botStatus} Bot Stats:</b>\n`;
    infoText += `├ <b>${e.role} Role:</b> ${botRole}\n`;
    infoText += `└ <b>${e.coin} Coin:</b> ${botCoin.toLocaleString('id-ID')}</blockquote>`;

    return ctx.reply(infoText, { parse_mode: "HTML", disable_web_page_preview: true });
}

case "cekid": {
  let loadingMsg;
  try {
    ctx.deleteMessage().catch(() => {});
    const user = ctx.from || {};
    const firstName = user.first_name || "";
    const lastName = user.last_name || "";
    const fullName = `${firstName} ${lastName}`.trim() || "Unknown User";
    const username = user.username ? `@${user.username}` : "-";
    const userId = String(user.id || 0);

    if (userId === "0") return ctx.replyWithHTML("❌ <b>Gagal membaca ID Pengguna.</b>");

    loadingMsg = await ctx.replyWithHTML(
      `🔍 <b>TELEGRAM IDENTITY CHECK</b>\n\n<code>[${makeBar(0)}]</code> <b>0%</b>\n<i>Memverifikasi profil & menyiapkan server...</i>`
    );

    const { id: chatId } = loadingMsg.chat;
    const messageId = loadingMsg.message_id;

    const steps = [18, 37, 55, 76, 92, 100];
    for (const p of steps) {
      await sleep(450);
      try {
        await ctx.telegram.editMessageText(
          chatId, messageId, null,
          `🔍 <b>TELEGRAM IDENTITY CHECK</b>\n\n<code>[${makeBar(p)}]</code> <b>${p}%</b>\n<i>Membangun aset grafis & kalkulasi hash...</i>`,
          { parse_mode: "HTML" }
        );
      } catch (err) {}
    }

    const today = new Date().toLocaleDateString("id-ID", {
      weekday: "long", year: "numeric", month: "long", day: "2-digit",
    });

    const hash = crypto.createHash("sha256").update(userId).digest("hex");
    const soulId = hash.slice(0, 10).toUpperCase();
    const era = idGenerationEstimate(userId);

    const accountStats = analyzeTelegramAccount(userId, hash);
    const rarity = accountStats.rarity;
    const accent = accountStats.accent;
    const scarcity = { label: accountStats.label, grade: accountStats.grade, color: accountStats.color };
    const level = accountStats.level;

    const createdEst = estimateCreationDate(Number(userId));
    const createdText = createdEst.date ? formatDateID(createdEst.date) : "-";

    const avatarImg = await getAvatarImage(ctx, user.id);

    // CANVAS GENERATION
    const W = 1100; const H = 650;
    const canvas = createCanvas(W, H);
    const c = canvas.getContext("2d");
    const baseFont = "'CustomFont', 'EmojiFont', 'Segoe UI Emoji', 'Apple Color Emoji', 'Noto Color Emoji', Arial, sans-serif";

    const bg = c.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, "#060913"); bg.addColorStop(0.5, "#0b1126"); bg.addColorStop(1, "#04060b");
    c.fillStyle = bg; c.fillRect(0, 0, W, H);

    c.save();
    c.shadowColor = "rgba(0, 0, 0, 0.8)"; c.shadowBlur = 35; c.shadowOffsetY = 15;
    const cx = 50, cy = 55, cw = W - 100, ch = H - 110;
    roundRect(c, cx, cy, cw, ch, 28);
    c.fillStyle = "#0c1222"; c.fill();
    c.restore();

    c.save();
    roundRect(c, cx, cy, cw, ch, 28);
    const borderGrad = c.createLinearGradient(cx, cy, cx + cw, cy + ch);
    borderGrad.addColorStop(0, "rgba(255, 255, 255, 0.2)"); borderGrad.addColorStop(1, "rgba(255, 255, 255, 0.02)");
    c.strokeStyle = borderGrad; c.lineWidth = 2.5; c.stroke();
    c.restore();

    c.save();
    const headerH = 95;
    roundRect(c, cx, cy, cw, headerH, 28);
    c.clip();
    const hg = c.createLinearGradient(cx, cy, cx + cw, cy + headerH);
    hg.addColorStop(0, accent); hg.addColorStop(1, "#121d3b");
    c.fillStyle = hg; c.fillRect(cx, cy, cw, headerH);
    c.fillStyle = "rgba(255,255,255,0.08)";
    for (let i = 0; i < 30; i++) c.fillRect(cx + i * 40, cy - 10, 15, headerH + 20);
    c.restore();

    c.fillStyle = "#ffffff"; c.shadowColor = "rgba(0,0,0,0.5)"; c.shadowBlur = 8;
    c.font = `900 36px ${baseFont}`; c.fillText("KARTU IDENTITAS TELEGRAM", cx + 35, cy + 60);
    c.shadowBlur = 0; c.font = `600 16px ${baseFont}`; c.fillStyle = "rgba(255,255,255,0.85)";
    c.fillText("SECURE DIGITAL RENDER • " + rarity, cx + 38, cy + 82);

    c.save();
    const bx = cx + cw - 200, by = cy + 28, bw = 160, bh = 40;
    roundRect(c, bx, by, bw, bh, 20);
    c.fillStyle = "rgba(0, 0, 0, 0.4)"; c.fill();
    c.strokeStyle = accent; c.lineWidth = 2; c.stroke();
    c.fillStyle = accent; c.font = `800 16px ${baseFont}`; c.textAlign = "center";
    c.fillText(rarity, bx + bw / 2, by + 26);
    c.restore();

    const ax = cx + 40, ay = cy + 130, aw = 250, ah = 310;
    c.save();
    roundRect(c, ax, ay, aw, ah, 20);
    c.fillStyle = "#070b14"; c.fill();
    c.strokeStyle = "rgba(255,255,255,0.15)"; c.lineWidth = 2; c.stroke(); c.clip();

    if (avatarImg) {
      const scale = Math.max(aw / avatarImg.width, ah / avatarImg.height);
      const iw = avatarImg.width * scale; const ih = avatarImg.height * scale;
      const ix = ax + (aw - iw) / 2; const iy = ay + (ah - ih) / 2;
      c.drawImage(avatarImg, ix, iy, iw, ih);
    } else {
      c.fillStyle = "#0b1224"; c.fillRect(ax, ay, aw, ah);
      c.fillStyle = "rgba(255,255,255,0.1)";
      c.beginPath(); c.arc(ax + aw / 2, ay + ah / 2 - 30, 50, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.arc(ax + aw / 2, ay + ah / 2 + 70, 85, 0, Math.PI * 2); c.fill();
      c.fillStyle = "rgba(255,255,255,0.4)"; c.font = `700 16px ${baseFont}`; c.textAlign = "center";
      c.fillText("NO PHOTO", ax + aw / 2, ay + ah - 25);
    }
    c.restore();

    c.save();
    c.fillStyle = "rgba(0, 0, 0, 0.6)"; c.fillRect(ax, ay + ah - 50, aw, 50);
    c.fillStyle = "#ffffff"; c.font = `800 15px ${baseFont}`; c.fillText("VERIFIED USER", ax + 20, ay + ah - 20);
    c.shadowColor = scarcity.color; c.shadowBlur = 15; c.fillStyle = scarcity.color;
    c.fillRect(ax + 145, ay + ah - 28, 85, 8);
    c.restore();

    const ix = cx + 330; const iy = cy + 140;
    const labels = ["Nama Lengkap", "User ID", "Username", "Tgl Dibuat", "Kelangkaan", "Generation", "Soul Level", "Soul ID", "Dicetak Pada"];
    const values = [fullName, userId, username, createdText, `${scarcity.label} (${scarcity.grade})`, era, `Lv. ${level}`, soulId, today];

    for (let i = 0; i < labels.length; i++) {
      c.fillStyle = "rgba(255, 255, 255, 0.55)"; c.font = `600 18px ${baseFont}`; c.fillText(labels[i], ix, iy + i * 46);
      c.fillStyle = i === 4 ? scarcity.color : "#ffffff"; c.font = `bold 20px ${baseFont}`; c.fillText(String(values[i]), ix + 170, iy + i * 46);
    }

    c.save();
    c.fillStyle = "rgba(255, 255, 255, 0.15)"; c.font = "500 12px monospace";
    c.fillText(`UID:${userId} | HASH:${hash.slice(0, 24)} | SC:${scarcity.grade}`, cx + 40, cy + ch - 35);
    c.restore(); 

    drawNoise(c, cx, cy, cw, ch, 0.025);
    const buffer = canvas.toBuffer("image/png");
    
    await ctx.telegram.deleteMessage(chatId, messageId).catch(() => {});

    await ctx.replyWithPhoto(
      { source: buffer },
      {
        parse_mode: "HTML",
        caption: `🪪 <b>TELEGRAM IDENTITY CHECK</b>\n\n👤 <b>${escapeHTML(fullName)}</b>\n🆔 <code>${escapeHTML(userId)}</code>\n🏷️ <code>${escapeHTML(username)}</code>\n\n📅 <b>Dibuat</b> : <i>${escapeHTML(createdText)}</i>\n🎯 <b>Kelangkaan</b> : <b>${escapeHTML(scarcity.label)}</b> <code>[${escapeHTML(scarcity.grade)}]</code>\n\n✨ <b>Rarity Level</b> : <b>${escapeHTML(rarity)}</b>\n🧬 <b>Soul ID</b> : <code>${escapeHTML(soulId)}</code>\n⭐ <b>Account Level</b> : <b>${escapeHTML(String(level))}</b>\n📌 <b>Generation</b> : <i>${escapeHTML(era)}</i>\n\n<i>*Note: Tanggal & Generasi adalah estimasi matematis.</i>`,
        reply_markup: {
          inline_keyboard: [
            [
              { text: "CH WA", url: "https://whatsapp.com/channel/0029Vay9cpWC6ZvZIe86sd1D" },
              { text: "CH TELE", url: "https://t.me/MyThe5" },
            ],
            [{ text: "DEVELOPER", url: "https://t.me/Myzxa" }],
          ],
        },
      }
    );
  } catch (e) {
    console.error("Error ID Check:", e);
    try {
      if (loadingMsg) {
        await ctx.telegram.editMessageText(loadingMsg.chat.id, loadingMsg.message_id, null, "❌ <b>Gagal memproses ID Telegram karena kesalahan server.</b>", { parse_mode: "HTML" }).catch(() => {});
      } else {
        await ctx.replyWithHTML("❌ <b>Gagal memproses ID Telegram.</b>");
      }
    } catch {}
  }
  break;
}

// ===== LIHAT SEMUA COIN (OWNER ONLY) =====
case "lihatallcoin":
case "allcoin": {
    if (!isOwner(ctx)) return ctx.reply("❌ Owner Only!");
    return sendCoinPage(ctx, 0);
}

// ===== ADD SCRIPT (CLOUD SYSTEM & AUTO NAME) =====
case "addscript": {
    if (!isOwner(ctx)) return ctx.reply("❌ Owner Only!");
    if (!ctx.message.reply_to_message?.document)
        return ctx.reply(`Reply dokumen ZIP/File dengan:\n${escapeHTML(config.prefix)}addscript [harga]\nAtau\n${escapeHTML(config.prefix)}addscript [nama]|[deskripsi]|[harga]`, { parse_mode: "HTML" });

    const doc = ctx.message.reply_to_message.document;
    let name, desk, priceStr;

    // Cek apakah pakai format lengkap (ada tanda |)
    if (text.includes("|")) {
        const parts = text.split("|").map(v => v.trim());
        name = parts[0];
        desk = parts[1] || "-";
        priceStr = parts[2] || parts[1]; // Jaga-jaga kalau cuma Nama|Harga
        if(parts.length >= 3) {
           [name, desk, priceStr] = parts;
        }
    } else {
        // JALUR CEPAT: Cuma ketik harga
        priceStr = text;
        // Ambil nama dari file aslinya, lalu hilangkan ekstensi (misal: script.zip jadi script)
        name = doc.file_name ? doc.file_name.replace(/\.[^/.]+$/, "") : "Script_Baru"; 
        desk = "-"; // Deskripsi otomatis kosong
    }

    // Bersihkan titik/koma dari harga, jaga-jaga kalau ngetik 11.000.000
    const price = parseInt(priceStr.replace(/[^0-9]/g, ''));
    if (isNaN(price)) return ctx.reply("❌ Data tidak valid. Pastikan harga diisi dengan angka!");

    const scripts = loadScripts();
    if (scripts.find(s => s.name.toLowerCase() === name.toLowerCase()))
        return ctx.reply(`❌ Script dengan nama <b>${escapeHTML(name)}</b> sudah ada di database. Silakan ganti nama file kamu terlebih dahulu.`, { parse_mode: "HTML" });

    // Simpan File ID ke database, TIDAK DOWNLOAD KE PANEL
    scripts.push({ 
        name, 
        desk, 
        price: price, 
        file_id: doc.file_id, 
        file_name: doc.file_name || "script.zip",
        added_date: new Date().toISOString() 
    });
    saveScripts(scripts);

    // Langsung beri notif sukses TANPA Broadcast agar cepat
    return ctx.reply(`✅ <b>Script Berhasil Ditambahkan!</b>\n\n📦 <b>Nama:</b> ${escapeHTML(name)}\n💰 <b>Harga:</b> ${price.toLocaleString('id-ID')} Coin\n📝 <b>Deskripsi:</b> ${escapeHTML(desk)}\n☁️ <b>Status:</b> <i>Tersimpan aman di Cloud Telegram</i>`, { parse_mode: "HTML" });
}

// ===== BROADCAST MESSAGE (OWNER ONLY) =====
case "broadcast": {
    if (!isOwner(ctx)) return ctx.reply("❌ Owner only!");

    const users = loadUsers();
    if (users.length === 0) return ctx.reply("📭 Tidak ada user untuk di-broadcast.");

    const replyMsg = ctx.message.reply_to_message;
    let broadcastMessage = "";
    let photoFileId = null;
    let hasPhoto = false;

    if (replyMsg) {
        if (replyMsg.photo && replyMsg.photo.length > 0) {
            hasPhoto = true;
            const photo = replyMsg.photo[replyMsg.photo.length - 1];
            photoFileId = photo.file_id;
            broadcastMessage = replyMsg.caption || "";
        } else if (replyMsg.text) {
            broadcastMessage = replyMsg.text;
        } else {
            return ctx.reply("❌ Format tidak valid! Reply pesan dengan teks atau foto.");
        }
    } else if (text) {
        broadcastMessage = text;
    } else {
        return ctx.reply(`Contoh penggunaan:\n${config.prefix}broadcast [pesan]\n\nAtau\n\nReply pesan/foto dengan ketik ${config.prefix}broadcast`);
    }

    if (!broadcastMessage.trim() && !hasPhoto) return ctx.reply("❌ Pesan broadcast tidak boleh kosong!");

    const startMsg = await ctx.reply(`🚀 *MEMULAI BROADCAST*\n\n📊 Total User: ${users.length}\n⏳ Estimasi waktu: ${Math.ceil(users.length / 10)} detik\n🔄 Mengirim... 0/${users.length}`, { parse_mode: "html" });
    startBroadcast(ctx, users, broadcastMessage, hasPhoto, photoFileId, startMsg.message_id);
    break;
}

// ===== BACKUP SCRIPT =====
case "backupsc":
case "bck":
case "backup": {
    if (!isOwner(ctx)) return ctx.reply("❌ Owner only!");

    try {
        await ctx.reply("🔄 Backup Processing...");
        const archiver = require('archiver');
        const bulanIndo = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
        const tgl = new Date();
        const tanggal = tgl.getDate().toString().padStart(2, "0");
        const bulan = bulanIndo[tgl.getMonth()];
        const name = `Tele-Autoorder-${tanggal}-${bulan}-${tgl.getFullYear()}`;

        const exclude = ["node_modules", "package-lock.json", "yarn.lock", ".npm", ".cache", ".git"];
        const filesToZip = fs.readdirSync(".").filter((f) => !exclude.includes(f) && !f.startsWith('.') && f !== "");

        if (!filesToZip.length) return ctx.reply("❌ Tidak ada file yang dapat di backup!");

        const output = fs.createWriteStream(`./${name}.zip`);
        const archive = archiver("zip", { zlib: { level: 9 } });

        output.on('close', async () => {
            try {
                await ctx.telegram.sendDocument(config.ownerId, { source: `./${name}.zip` }, { caption: `✅ <b>Backup Script selesai!</b>\n📁 ${escapeHTML(name)}.zip`, parse_mode: "HTML" });
                fs.unlinkSync(`./${name}.zip`);
                if (ctx.chat.id.toString() !== config.ownerId.toString()) {
                    await ctx.reply(`✅ <b>Backup script selesai!</b>\n📁 File telah dikirim ke chat pribadi owner.`, { parse_mode: "HTML" });
                }
            } catch (err) {
                await ctx.reply("❌ Error! Gagal mengirim file backup.");
            }
        });

        archive.on('error', async (err) => { await ctx.reply("❌ Error! Gagal membuat file backup."); });
        archive.pipe(output);

        for (let file of filesToZip) {
            const stat = fs.statSync(file);
            if (stat.isDirectory()) { archive.directory(file, file); } else { archive.file(file, { name: file }); }
        }
        await archive.finalize();

    } catch (err) {
        await ctx.reply("❌ Error! Terjadi kesalahan saat proses backup.");
    }
    break;
}

case "cekipbot": {
    if (!isOwner(ctx)) return ctx.reply("❌ Owner Only!");
    try {
        const { data } = await axios.get("https://api.ipify.org?format=json");
        return ctx.reply(`🌐 <b>IP SERVER BOT KAMU:</b>\n<code>${data.ip}</code>\n\nSilakan copy IP di atas dan masukkan ke menu Whitelist API di web Fayupedia.`, {parse_mode: "HTML"});
    } catch (err) {
        return ctx.reply("❌ Gagal mengecek IP Server.");
    }
}

// ===== GET SCRIPT =====
case "delscript":
case "getscript": {
    if (!isOwner(ctx)) return ctx.reply("❌ Owner only.");
    return sendGetScriptPage(ctx, 0);
}

// ===== CEK PING & STATUS SYSTEM =====
case "ping": {
    const nou = require("node-os-utils");
    const speed = require("performance-now");
    const start = speed();

    const cpu = nou.cpu; const drive = nou.drive; const mem = nou.mem;
    const waitMsg = await ctx.reply("⏳ <i>Mengambil data sistem server...</i>", { parse_mode: "HTML" });

    try {
        const [osName, driveInfo, memInfo, cpuUsage] = await Promise.all([
            nou.os.oos().catch(() => "Unknown"),
            drive.info().catch(() => ({ usedGb: "N/A", totalGb: "N/A" })),
            mem.info().catch(() => ({ totalMemMb: 0, usedMemMb: 0, freeMemMb: 0 })),
            cpu.usage().catch(() => 0)
        ]);

        const totalGB = (memInfo.totalMemMb / 1024 || 0).toFixed(2);
        const usedGB = (memInfo.usedMemMb / 1024 || 0).toFixed(2);
        const freeGB = (memInfo.freeMemMb / 1024 || 0).toFixed(2);
        const cpuList = os.cpus() || [];
        const cpuModel = cpuList[0]?.model || "Unknown CPU";
        const cpuSpeed = cpuList[0]?.speed || "N/A";
        const cpuCores = cpuList.length || 0;
        
        const botUptime = `${(process.uptime() / 3600).toFixed(1)} Jam`;
        const latency = (speed() - start).toFixed(2);
        const loadAvg = os.loadavg().map(n => n.toFixed(2)).join(" | ");
        const nodeVersion = process.version;
        const platform = os.platform();
        const hostname = os.hostname();
        const arch = os.arch();

        const textPing = `
<blockquote><b>⚙️ SYSTEM STATUS</b></blockquote>
<b>• OS :</b> ${nou.os.type()} (${osName})
<b>• Platform :</b> ${platform.toUpperCase()}
<b>• Arch :</b> ${arch}
<b>• Hostname :</b> ${hostname}

<blockquote><b>💾 STORAGE & RAM</b></blockquote>
<b>• Disk :</b> ${driveInfo.usedGb}/${driveInfo.totalGb} GB
<b>• RAM :</b> ${usedGB}/${totalGB} GB (Free: ${freeGB} GB)

<blockquote><b>🧠 CPU INFO</b></blockquote>
<b>• Model :</b> ${cpuModel}
<b>• Core(s) :</b> ${cpuCores}
<b>• Speed :</b> ${cpuSpeed} MHz
<b>• Usage :</b> ${cpuUsage.toFixed(2)}%
<b>• Load Avg :</b> ${loadAvg}

<blockquote><b>🤖 BOT STATUS</b></blockquote>
<b>• Ping :</b> ${latency} ms
<b>• Bot Uptime :</b> ${botUptime}
<b>• Node.js :</b> ${nodeVersion}
`.trim();

        const keyboard = { inline_keyboard: [[{ text: "📞 Support", url: `https://t.me/${config.ownerUsername}` }]] };
        await ctx.telegram.deleteMessage(ctx.chat.id, waitMsg.message_id).catch(() => {});
        
        return ctx.replyWithPhoto(config.pinkInfoImage, { caption: textPing, parse_mode: "HTML", reply_markup: keyboard });
    } catch (err) {
        return ctx.telegram.editMessageText(ctx.chat.id, waitMsg.message_id, null, `❌ Gagal mengambil status sistem:\n<code>${err.message}</code>`, { parse_mode: "HTML" });
    }
}

// ===== DELETE ALL COIN USER (OWNER ONLY) =====
case "deleteallcoin":
case "delallcoin": {
    if (!isOwner(ctx)) return ctx.reply("❌ Owner Only!");
    const users = loadUsers();
    if (!users || users.length === 0) return ctx.reply("📭 Belum ada user terdaftar di database.");
    pendingDeleteAllCoin[fromId] = true;

    const confirmText = `⚠️ <b>PERINGATAN BAHAYA (SAPU JAGAT)</b> ⚠️\n━━━━━━━━━━━━━━━━━\nApakah Anda yakin ingin <b>MENGHAPUS SEMUA COIN USER</b> menjadi 0 Coin?\nTindakan ini tidak dapat dibatalkan dan coin user akan hangus!\n\n👇 <b>Silakan balas pesan ini:</b>\nKetik <code>oke</code> untuk melanjutkan penghapusan.\nKetik <code>batal</code> untuk membatalkan.`;
    return ctx.reply(confirmText, { parse_mode: "HTML" });
}

// ===== COMMAND MEMBERI RATING =====
case "rating":
case "rate": {
    if (args.length < 2) return ctx.reply(`❌ <b>Format Salah!</b>\n\nCara pakai: <code>${config.prefix}rating [bintang 1-5] [ulasan kamu]</code>\nContoh: <code>${config.prefix}rating 5 Botnya keren, prosesnya cepet banget!</code>`, { parse_mode: "HTML" });
    const star = parseInt(args[0]);
    if (isNaN(star) || star < 1 || star > 5) return ctx.reply("❌ Angka bintang harus dari 1 sampai 5!");
    
    const ulasan = args.slice(1).join(" ");
    if (ulasan.length < 5) return ctx.reply("❌ Ulasan terlalu pendek! Ketik minimal 5 huruf.");

    const ratings = loadRatings();
    const existingIdx = ratings.findIndex(r => r.id === fromId);
    const ratingData = { id: fromId, name: ctx.from.first_name + (ctx.from.last_name ? ' ' + ctx.from.last_name : ''), username: ctx.from.username || "-", star: star, text: ulasan, date: new Date().toISOString() };

    if (existingIdx !== -1) {
        ratings[existingIdx] = ratingData; 
        saveRatings(ratings);
        return ctx.reply(`✅ <b>Rating berhasil diperbarui!</b>\n\nTerima kasih atas ulasan ${star} ⭐ nya!\n\n<i>Cek ulasanmu di Menu Utama -> 🌟 Cek Rating.</i>`, { parse_mode: "HTML" });
    } else {
        ratings.push(ratingData); 
        saveRatings(ratings);
        autoBackupDB(ctx, "RATING BARU MASUK", ratingDB);
        return ctx.reply(`✅ <b>Rating berhasil ditambahkan!</b>\n\nTerima kasih atas ulasan ${star} ⭐ nya!\n\n<i>Cek ulasanmu di Menu Utama -> 🌟 Cek Rating.</i>`, { parse_mode: "HTML" });
    }
    break;
}

// ===== COMMAND MISI COIN (OWNER ONLY) =====
case "addchannel": {
    if (!isOwner(ctx)) return ctx.reply("❌ Owner Only!");
    const ch = args[0];
    if (!ch || !ch.startsWith("@")) return ctx.reply(`Format salah!\nContoh: ${config.prefix}addchannel @namachannel`);
    
    const missions = loadMissions();
    if (missions.includes(ch)) return ctx.reply("❌ Channel sudah ada di daftar misi!");
    
    missions.push(ch);
    saveMissions(missions);
    return ctx.reply(`✅ Channel <b>${ch}</b> berhasil ditambahkan ke Misi Coin!\n\n<i>*Pastikan bot sudah dijadikan ADMIN di channel tersebut agar bisa mengecek user.</i>`, { parse_mode: "HTML" });
}

case "delchannel": {
    if (!isOwner(ctx)) return ctx.reply("❌ Owner Only!");
    const ch = args[0];
    if (!ch) return ctx.reply(`Format salah!\nContoh: ${config.prefix}delchannel @namachannel`);
    
    let missions = loadMissions();
    if (!missions.includes(ch)) return ctx.reply("❌ Channel tidak ditemukan di daftar misi!");
    
    missions = missions.filter(m => m !== ch);
    saveMissions(missions);
    return ctx.reply(`✅ Channel <b>${ch}</b> berhasil dihapus dari Misi Coin!`, { parse_mode: "HTML" });
}

// ===== ADD APK MOD (CLOUD SYSTEM) =====
case "addapk": {
    if (!isOwner(ctx)) return ctx.reply("❌ Owner Only!");
    const replyMsg = ctx.message.reply_to_message;
    if (!replyMsg || !replyMsg.document) {
        return ctx.reply(`❌ <b>GAGAL!</b>\nKamu harus me-reply sebuah File APK dengan:\n<code>${escapeHTML(config.prefix)}addapk [harga]</code>\nAtau\n<code>${escapeHTML(config.prefix)}addapk NAMA|DESKRIPSI|HARGA</code>`, { parse_mode: "HTML" });
    }

    const doc = replyMsg.document;
    let name, desk, priceStr;

    if (!text || text.trim() === "") return ctx.reply(`❌ Jangan lupa masukkan harganya bos.`, { parse_mode: "HTML" });

    if (text.includes("|")) {
        const parts = text.split("|").map(v => v.trim());
        name = parts[0]; desk = parts[1] || "-"; priceStr = parts.length >= 3 ? parts[2] : (parts[1] || ""); 
    } else {
        priceStr = text.trim();
        name = doc.file_name ? doc.file_name.replace(/\.[^/.]+$/, "") : "APK_Baru"; desk = "-"; 
    }

    const price = parseInt(String(priceStr || "").replace(/[^0-9]/g, ''));
    if (isNaN(price) || price <= 0) return ctx.reply(`❌ <b>Harga tidak valid.</b>`, { parse_mode: "HTML" });

    const apks = loadApks();
    if (apks.find(s => s.name.toLowerCase() === name.toLowerCase())) {
        return ctx.reply(`❌ APK dengan nama <b>${escapeHTML(name)}</b> sudah ada. Silakan ubah nama file.`, { parse_mode: "HTML" });
    }

    apks.push({ name, desk, price: price, file_id: doc.file_id, file_name: doc.file_name || "app.apk", added_date: new Date().toISOString() });
    saveApks(apks);

    return ctx.reply(`✅ <b>APK Berhasil Ditambahkan!</b>\n\n📱 <b>Nama:</b> ${escapeHTML(name)}\n💰 <b>Harga:</b> ${price.toLocaleString('id-ID')} Coin\n☁️ <b>Status:</b> <i>Tersimpan aman di Cloud Telegram</i>`, { parse_mode: "HTML" });
}

// ===== GET APK =====
case "delapk":
case "getapk": {
    if (!isOwner(ctx)) return ctx.reply("❌ Owner only.");
    return sendGetApkPage(ctx, 0);
}

// ===== FITUR GIVEAWAY COIN (DANA KAGET) =====
case "addga": {
    if (!isOwner(ctx)) return ctx.reply("❌ Owner Only!");

    if (args.length < 3) {
        return ctx.reply(`Format: ${config.prefix}addga [kode] [total_coin] [kuota]\nContoh:\n${config.prefix}addga KAGET 100.000 5`);
    }

    const kode = args[0].toUpperCase();
    const totalCoin = parseInt(args[1].replace(/[^0-9]/g, ''));
    const kuota = parseInt(args[2].replace(/[^0-9]/g, ''));

    if (isNaN(totalCoin) || isNaN(kuota) || totalCoin <= 0 || kuota <= 0) return ctx.reply("❌ Total coin dan kuota harus berupa angka valid!");
    if (totalCoin < kuota) return ctx.reply("❌ Total coin harus lebih besar dari jumlah orang (kuota)!");

    const vouchers = loadVouchers();
    if (vouchers[kode]) return ctx.reply("❌ Kode tersebut sudah terdaftar!");

    vouchers[kode] = {
        type: "ga", 
        total_pool: totalCoin,
        remaining_pool: totalCoin,
        kuota: kuota,
        claimedBy: [],
        created_at: new Date().toISOString()
    };
    saveVouchers(vouchers);

    const botUsername = ctx.botInfo.username; 
    const redeemLink = `https://t.me/${botUsername}?start=redeem_${kode}`;

    return ctx.reply(
`🎉 <b>GIVEAWAY / DANA KAGET COIN!</b>
▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰
💰 Total Pembagian: <b>${totalCoin.toLocaleString('id-ID')} Coin</b>
🎁 Hadiah Acak Untuk: <b>${kuota.toLocaleString('id-ID')}</b> orang
▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰

🔑 Kode GA:
<code>${kode}</code>

🚀 Klaim Manual:
${redeemLink}`,
        { 
            parse_mode: "HTML",
            reply_markup: {
                inline_keyboard: [
                    [{ text: "📢 Kirim Sekarang", callback_data: `send_ch_ga|${kode}` }],
                    [{ text: "⏳ Jadwalkan (Timer)", callback_data: `schedule_ch_ga|${kode}` }]
                ]
            }
        }
    );
}

// ===== COMMAND MAINTENANCE MODE =====
case "mt":
case "maintenance": {
    if (!isOwner(ctx)) return ctx.reply("❌ Owner Only!");
    
    if (args.length < 1) {
        const settings = loadSettings();
        const status = settings.maintenance ? "🟢 AKTIF" : "🔴 MATI";
        return ctx.reply(`🛠️ <b>MAINTENANCE MODE</b>\n\nStatus saat ini: <b>${status}</b>\n\nCara pakai:\n<code>${config.prefix}maintenance on</code> (Untuk menyalakan)\n<code>${config.prefix}maintenance off</code> (Untuk mematikan)\n\n<i>*Bisa juga disingkat pakai ${config.prefix}mt on</i>`, { parse_mode: "HTML" });
    }

    const action = args[0].toLowerCase();
    const settings = loadSettings();

    if (action === "on") {
        settings.maintenance = true;
        saveSettings(settings);
        return ctx.reply("✅ <b>MAINTENANCE MODE DIAKTIFKAN!</b>\n\nSekarang semua user biasa tidak akan bisa menggunakan bot (diblokir sementara). Hanya Owner yang bisa akses dan testing.", { parse_mode: "HTML" });
    } else if (action === "off") {
        settings.maintenance = false;
        saveSettings(settings);
        return ctx.reply("✅ <b>MAINTENANCE MODE DIMATIKAN!</b>\n\nBot kembali normal, semua user sudah bisa mengakses bot lagi.", { parse_mode: "HTML" });
    } else {
        return ctx.reply("❌ Argumen salah! Gunakan 'on' atau 'off'.\nContoh: .mt on");
    }
}

// ============================================
// ⚔️ CASE ADU KOIN (TARUH DI DALAM SWITCH COMMAND LU)
// ============================================
case 'adu':
case 'coinflip':
case 'cf': {
    // Asumsi 'args' udah didefinisikan di base lu (biasanya dari text.split(' '))
    const userId = ctx.from.id; // Sesuaikan kalau di base lu pakenya m.sender
    
    if (!args[0]) {
        return ctx.reply("⚠️ <b>Format Salah!</b>\nKetik: <code>/adu [nominal]</code>\nContoh: <code>/adu 5000000</code>", { parse_mode: "HTML" });
    }

    let nominal = parseInt(args[0].replace(/[^0-9]/g, ''));
    if (isNaN(nominal) || nominal < 100000) {
        return ctx.reply("❌ <b>Minimal taruhan adalah 100.000 Coin!</b>", { parse_mode: "HTML" });
    }

    let users = loadUsers();
    let userIndex = users.findIndex(u => u.id === userId);
    if (userIndex === -1) return ctx.reply("❌ Akun belum terdaftar.");
    if ((users[userIndex].balance || 0) < nominal) {
        return ctx.reply(`❌ <b>Saldo tidak cukup!</b>\nSaldo kamu: ${formatCoin(users[userIndex].balance)} Coin`, { parse_mode: "HTML" });
    }

    // Bikin ID Unik buat Duel ini & Simpan ke memori global
    const duelId = `duel_${Date.now()}_${userId}`;
    const penantangName = ctx.from.first_name ? ctx.from.first_name.replace(/[<>&]/g, "") : "Player";

    global.activeDuels = global.activeDuels || {};
    global.activeDuels[duelId] = {
        p1_id: userId,
        p1_name: penantangName,
        nominal: nominal,
        status: "WAITING"
    };

    const text = `<blockquote><tg-emoji emoji-id="5463350743002011836">🌟</tg-emoji> <b>ARENA ADU KOIN (PvP)</b> <tg-emoji emoji-id="5463427936449223333">🌟</tg-emoji></blockquote>\n▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰\n<tg-emoji emoji-id="5350662397566661136">⚡️</tg-emoji> <b>Penantang :</b> ${penantangName}\n💰 <b>Taruhan    :</b> ${formatCoin(nominal)} Coin\n<tg-emoji emoji-id="5226431245918942763">🏆</tg-emoji> <b>Total Pot  :</b> ${formatCoin(nominal * 2)} Coin\n▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰\n<tg-emoji emoji-id="5424972470023104089">🔥</tg-emoji> <i>Siapa yang berani menerima tantangan ini? Pilih tebakanmu di bawah! (Pajak Kasino 5%)</i>`;

    const keyboard = {
        inline_keyboard: [
            [
                { text: "PILIH GARUDA", callback_data: `terima_adu|${duelId}|garuda`, icon_custom_emoji_id: "5350662397566661136" },
                { text: "PILIH ANGKA", callback_data: `terima_adu|${duelId}|angka`, icon_custom_emoji_id: "5463392464314315076"}
            ],
            [{ text: "BATALKAN TANTANGAN", callback_data: `batal_adu|${duelId}`, icon_custom_emoji_id: "5210952531676504517" }]
        ]
    };

    await ctx.reply(text, { parse_mode: "HTML", reply_markup: keyboard });
    break;
}

// ===== FITUR KENDALI WINRATE SLOT (OWNER ONLY) =====
case "addwinrate": {
    if (!isOwner(ctx)) return ctx.reply("❌ Owner Only!");
    
    // Format: .addwinrate 1% 123456789 atau .addwinrate 1 123456789
    if (args.length < 2) return ctx.reply(`❌ <b>Format Salah!</b>\nContoh:\n<code>${config.prefix}addwinrate 1% 123456789</code>\n<code>${config.prefix}addwinrate 50 123456789</code>`, { parse_mode: "HTML" });
    
    let percentStr = args[0].replace('%', '');
    let winRate = parseFloat(percentStr); // Bisa desimal atau angka bebas
    let targetId = args[1];

    if (isNaN(winRate) || winRate < 0 || winRate > 100) {
        return ctx.reply("❌ Persentase harus angka bebas antara 0 sampai 100!");
    }

    const users = loadUsers();
    const userIndex = users.findIndex(u => String(u.id) === String(targetId));
    if (userIndex === -1) return ctx.reply("❌ User tidak ditemukan di database!");

    users[userIndex].custom_winrate = winRate;
    saveUsers(users);

    return ctx.reply(`😈 <b>KENDALI BANDAR AKTIF!</b>\n\nUser <code>${targetId}</code> sekarang memiliki <b>Win Rate Slot: ${winRate}%</b>.\n(Sisa ${100 - winRate}% dipastikan RUNGKAD 💀).`, { parse_mode: "HTML" });
}

case "delwinrate": {
    if (!isOwner(ctx)) return ctx.reply("❌ Owner Only!");
    
    if (args.length < 1) return ctx.reply(`❌ <b>Format Salah!</b>\nContoh: <code>${config.prefix}delwinrate 123456789</code>`, { parse_mode: "HTML" });
    
    let targetId = args[0];
    const users = loadUsers();
    const userIndex = users.findIndex(u => String(u.id) === String(targetId));
    if (userIndex === -1) return ctx.reply("❌ User tidak ditemukan di database!");

    delete users[userIndex].custom_winrate;
    saveUsers(users);

    return ctx.reply(`✅ <b>KENDALI BANDAR DICABUT!</b>\n\nUser <code>${targetId}</code> kembali menggunakan Win Rate RNG Standar mesin.`, { parse_mode: "HTML" });
}

case "listwinrate": {
    if (!isOwner(ctx)) return ctx.reply("❌ Owner Only!");
    const users = loadUsers();
    
    const targetUsers = users.filter(u => u.custom_winrate !== undefined);
    
    if (targetUsers.length === 0) {
        return ctx.reply("📭 Saat ini tidak ada user yang sedang dikendalikan Win Rate-nya.");
    }

    let text = `<blockquote>😈 <b>DAFTAR KORBAN BANDAR (CUSTOM WINRATE)</b></blockquote>\n▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰\n`;
    targetUsers.forEach((u, i) => {
        const name = u.first_name || "Unknown";
        const uid = u.id;
        const uname = u.username ? `@${u.username}` : "Tidak diset";
        const wr = u.custom_winrate;
        text += `<b>${i+1}. ${escapeHTML(name)}</b>\n`;
        text += `└ 🆔 <code>${uid}</code> | 👤 ${uname}\n`;
        text += `└ 🎯 Win Rate: <b>${wr}%</b> (Rungkad ${100-wr}%)\n\n`;
    });

    return ctx.reply(text, { parse_mode: "HTML" });
}

// ============================================
// ⚔️ CASE ARISAN / BATTLE ROYALE KOIN (MASS PvP)
// ============================================
case 'arisan':
case 'tawuran':
case 'royale': {
    // Biar gak dimainin di PM Bot
    if (ctx.chat.type === 'private') return ctx.reply("❌ Fitur taruhan massal ini cuma bisa dimainkan di Grup!");
    
    // Format: /arisan 1000000 5 (Artinya tiket 1 Juta, cari 5 orang)
    if (args.length < 2) return ctx.reply("⚠️ <b>Format Salah!</b>\nKetik: <code>/arisan [nominal_tiket] [jumlah_orang]</code>\nContoh: <code>/arisan 1000000 5</code>", { parse_mode: "HTML" });

    let nominal = parseInt(args[0].replace(/[^0-9]/g, ''));
    let maxPemain = parseInt(args[1]);

    if (isNaN(nominal) || nominal < 100000) return ctx.reply("❌ Minimal taruhan tiket adalah 100.000 Coin!");
    if (isNaN(maxPemain) || maxPemain < 2 || maxPemain > 20) return ctx.reply("❌ Jumlah pemain minimal 2 orang, maksimal 20 orang!");

    let users = global.dbCache.users;
    let fIndex = users.findIndex(u => u.id === fromId);
    
    if (fIndex === -1) return ctx.reply("❌ Akun kamu belum terdaftar.");
    if ((users[fIndex].balance || 0) < nominal) {
        return ctx.reply(`❌ <b>Saldo tidak cukup untuk buka Room!</b>\nSaldo kamu: ${formatCoin(users[fIndex].balance)} Coin`, { parse_mode: "HTML" });
    }

    // Potong saldo Bandar (Pembuat Room) ke memori RAM
    users[fIndex].balance -= nominal;
    needSave.users = true;

    // Bikin ID Unik buat Room Arisan ini
    const arisanId = `arisan_${Date.now()}_${fromId}`;
    const hostName = ctx.from.first_name ? ctx.from.first_name.replace(/[<>&]/g, "") : "Bandar";

    global.activeArisan = global.activeArisan || {};
    global.activeArisan[arisanId] = {
        hostId: fromId,
        nominal: nominal,
        max: maxPemain,
        players: [{ id: fromId, name: hostName }],
        status: "WAITING"
    };

    const text = `<blockquote>⚔️ <b>ARISAN KOIN (BATTLE ROYALE)</b> ⚔️</blockquote>\n▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰\n👑 <b>Bandar :</b> ${hostName}\n💸 <b>Tiket Masuk:</b> ${formatCoin(nominal)} Coin\n👥 <b>Peserta  :</b> 1 / ${maxPemain}\n🏆 <b>Total Pot:</b> ${formatCoin(nominal)} Coin\n▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰\n\n<b>Daftar Peserta:</b>\n1. ${hostName} (Bandar)\n\n<i>Siapa yang mau ikut taruhan massal ini? Klik JOIN di bawah! (Pajak Bot 5%)</i>`;

    const keyboard = {
        inline_keyboard: [
            [{ text: "🔥 JOIN ARISAN", callback_data: `join_arisan|${arisanId}` }],
            [
                { text: "🚀 GAS SEKARANG", callback_data: `gas_arisan|${arisanId}` },
                { text: "❌ BATAL", callback_data: `batal_arisan|${arisanId}` }
            ]
        ]
    };

    return ctx.reply(text, { parse_mode: "HTML", reply_markup: keyboard });
}

// ============================================
// 🔥 FITUR POLA GACOR DINAMIS (OWNER ONLY)
// ============================================
case "addpola": {
    if (!isOwner(ctx)) return ctx.reply("❌ Owner Only!");
    
    const input = args.join(" ").toLowerCase();
    
    // Cari persentase (Contoh: 99%)
    const wrMatch = input.match(/(\d+(?:\.\d+)?)%/);
    if (!wrMatch) return ctx.reply("❌ Masukkan winrate! Contoh: 99%");
    const winrate = parseFloat(wrMatch[1]);
    
    // Cari waktu (Contoh: 30 menit, 1 jam, 60 detik, atau 22:00)
    let expiresAt = 0;
    let timeStr = "";
    const relMatch = input.match(/(\d+)\s*(detik|menit|jam)/);
    const absMatch = input.match(/(\d{1,2}):(\d{2})/);
    
    if (relMatch) {
        const amount = parseInt(relMatch[1]);
        const unit = relMatch[2];
        timeStr = `${amount} ${unit}`;
        if (unit === 'detik') expiresAt = Date.now() + (amount * 1000);
        if (unit === 'menit') expiresAt = Date.now() + (amount * 60 * 1000);
        if (unit === 'jam') expiresAt = Date.now() + (amount * 60 * 60 * 1000);
    } else if (absMatch) {
        const hours = parseInt(absMatch[1]);
        const mins = parseInt(absMatch[2]);
        timeStr = `Jam ${hours}:${mins}`;
        let now = new Date();
        now.setHours(hours, mins, 0, 0);
        if (now.getTime() < Date.now()) now.setDate(now.getDate() + 1); // Besok kalo udah lewat
        expiresAt = now.getTime();
    } else {
        return ctx.reply("❌ Masukkan waktu! Contoh: 30 menit, 1 jam, atau 22:00");
    }
    
    // Cari kata pola (naik/turun/tetap)
    let patternStr = input.replace(wrMatch[0], '');
    if (relMatch) patternStr = patternStr.replace(relMatch[0], '');
    else if (absMatch) patternStr = patternStr.replace(absMatch[0], '');
    
    let words = patternStr.trim().split(/\s+/);
    let parsedPattern = [];
    for (let w of words) {
        if (w === 'naik') parsedPattern.push('UP');
        else if (w === 'turun') parsedPattern.push('DOWN');
        else if (w === 'tetap' || w === 'tetep') parsedPattern.push('SAME');
    }
    
    if (parsedPattern.length === 0) return ctx.reply("❌ Format pola salah! Gunakan kombinasi: naik, turun, tetap\n\nContoh: <code>/addpola turun naik naik 30 menit 99%</code>", { parse_mode: "HTML" });
    
    global.activePola = global.activePola || [];
    global.activePola.push({
        patternRaw: words.join(' '),
        pattern: parsedPattern.join(','), // Misal: DOWN,UP,UP
        expiresAt: expiresAt,
        timeStr: timeStr,
        winrate: winrate
    });
    
    return ctx.reply(`✅ <b>POLA GACOR DITAMBAHKAN!</b>\n\n🎯 <b>Pola:</b> ${words.join(' ').toUpperCase()}\n⏱ <b>Aktif Selama:</b> ${timeStr}\n📈 <b>Win Rate:</b> ${winrate}%\n\n<i>Ketik ${config.prefix}listpola untuk melihat semua pola aktif.</i>`, { parse_mode: "HTML" });
}

case "listpola": {
    if (!isOwner(ctx)) return ctx.reply("❌ Owner Only!");
    global.activePola = global.activePola || [];
    
    // Bersihkan pola yang udah basi/expired
    global.activePola = global.activePola.filter(p => p.expiresAt > Date.now());
    
    if (global.activePola.length === 0) return ctx.reply("📭 Saat ini tidak ada pola gacor yang sedang aktif.");
    
    let txt = `<blockquote>🔥 <b>DAFTAR POLA GACOR AKTIF</b></blockquote>\n▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰\n`;
    global.activePola.forEach((p, i) => {
        let sisaMs = p.expiresAt - Date.now();
        let sisaMnt = Math.ceil(sisaMs / 60000);
        txt += `<b>${i + 1}. Pola: ${p.patternRaw.toUpperCase()}</b>\n`;
        txt += `└ 🎯 Winrate: <b>${p.winrate}%</b>\n`;
        txt += `└ ⏳ Sisa Waktu: <b>${sisaMnt} Menit Lagi</b>\n\n`;
    });
    txt += `<i>Ketik: ${config.prefix}delpola [nomor] untuk menghapus.</i>`;
    return ctx.reply(txt, { parse_mode: "HTML" });
}

case "delpola": {
    if (!isOwner(ctx)) return ctx.reply("❌ Owner Only!");
    global.activePola = global.activePola || [];
    
    let idx = parseInt(args[0]) - 1;
    if (isNaN(idx) || idx < 0 || idx >= global.activePola.length) {
        return ctx.reply(`❌ Nomor pola tidak valid! Cek daftar pola di ${config.prefix}listpola`);
    }
    
    let hapus = global.activePola.splice(idx, 1);
    return ctx.reply(`✅ <b>Pola "${hapus[0].patternRaw.toUpperCase()}" berhasil dihapus!</b>`, { parse_mode: "HTML" });
}

// ============================================
// 👑 MANAJEMEN CO-OWNER (FULL AKSES - OTOMATIS)
// ============================================

case "addowner": {
    if (!isOwner(ctx)) return ctx.reply("❌ Owner Only!");

    if (args.length < 1) return ctx.reply(`❌ <b>Format Salah!</b>\nCara pakai: <code>${config.prefix}addowner [ID_TELEGRAM]</code>\nContoh: <code>${config.prefix}addowner 123456789</code>`, { parse_mode: "HTML" });

    const targetId = args[0].replace(/[^0-9]/g, ''); // Cuma ambil angka ID
    if (!targetId) return ctx.reply("❌ ID harus berupa angka!");

    let owners = loadOwners();
    if (owners.some(o => String(o.id) === String(targetId)) || String(targetId) === String(config.ownerId)) {
        return ctx.reply("❌ ID tersebut sudah terdaftar sebagai Owner!");
    }

    // CARI DATA USER OTOMATIS DI DATABASE
    const users = loadUsers();
    const foundUser = users.find(u => String(u.id) === String(targetId));
    
    if (!foundUser) {
        return ctx.reply("❌ <b>GAGAL MENAMBAHKAN!</b>\nUser tersebut tidak ditemukan di database bot. Suruh dia ketik <code>/start</code> ke bot ini dulu!", { parse_mode: "HTML" });
    }

    const displayName = foundUser.first_name + (foundUser.last_name ? ` ${foundUser.last_name}` : "");
    const displayUsername = foundUser.username ? `@${foundUser.username}` : "Tidak ada";

    owners.push({ id: targetId, name: displayName, username: displayUsername });
    saveOwners(owners);

    return ctx.reply(`✅ <b>BERHASIL MENAMBAH CO-OWNER!</b>\n\n🆔 <b>ID:</b> <code>${targetId}</code>\n👤 <b>Nama:</b> ${escapeHTML(displayName)}\n🔗 <b>Username:</b> ${displayUsername}\n\n<i>🚨 PERINGATAN: Dia sekarang memiliki <b>FULL AKSES</b> layaknya Owner Utama!</i>`, { parse_mode: "HTML" });
}

case "listowner": {
    if (!isOwner(ctx)) return ctx.reply("❌ Owner Only!");
    let owners = loadOwners();
    const users = loadUsers(); // Load data terbaru buat ngecek kalau username mereka berubah
    
    let text = `<blockquote>👑 <b>DAFTAR OWNER (FULL AKSES)</b></blockquote>\n━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    text += `<b>👑 SUPREME OWNER (Utama):</b>\n🆔 <code>${config.ownerId}</code>\n\n`;

    if (owners.length === 0) {
        text += `<i>Belum ada tambahan Co-Owner.</i>`;
    } else {
        text += `<b>👮‍♂️ CO-OWNER (Wakil):</b>\n`;
        owners.forEach((o, i) => {
            // Sinkronkan data biar update kalau dia ganti nama/username
            const liveUser = users.find(u => String(u.id) === String(o.id));
            let uname = liveUser && liveUser.username ? `@${liveUser.username}` : (o.username || "Tidak ada");
            let name = liveUser ? (liveUser.first_name + (liveUser.last_name ? ` ${liveUser.last_name}` : "")) : (o.name || "Unknown");
            
            text += `<b>${i + 1}. ${escapeHTML(name)}</b>\n`;
            text += `└ 🆔 <code>${o.id}</code> | 👤 ${uname}\n\n`;
        });
        text += `<i>Ketik <code>${config.prefix}delowner [ID]</code> untuk memecat.</i>`;
    }

    return ctx.reply(text, { parse_mode: "HTML" });
}

case "delowner": {
    if (!isOwner(ctx)) return ctx.reply("❌ Owner Only!");

    if (args.length < 1) return ctx.reply(`❌ <b>Format Salah!</b>\nCara pakai: <code>${config.prefix}delowner [ID_TELEGRAM]</code>\nContoh: <code>${config.prefix}delowner 123456789</code>`, { parse_mode: "HTML" });

    const targetId = args[0].replace(/[^0-9]/g, '');
    
    // PROTEKSI ANTI KUDETA: Gak ada yang bisa hapus ID Owner Utama
    if (String(targetId) === String(config.ownerId)) {
        return ctx.reply("❌ <b>AKSES DITOLAK!</b>\nKamu tidak bisa menghapus Supreme Owner dari sistem!");
    }

    let owners = loadOwners();
    const sisaOwners = owners.filter(o => String(o.id) !== String(targetId));

    if (owners.length === sisaOwners.length) {
        return ctx.reply("❌ ID tersebut tidak ditemukan di daftar Co-Owner!");
    }

    saveOwners(sisaOwners);
    return ctx.reply(`✅ <b>Berhasil memecat dan mencabut akses Full Owner dari ID:</b> <code>${targetId}</code>`, { parse_mode: "HTML" });
}

// ============================================
// ✨ ALAT DETEKSI CUSTOM EMOJI PREMIUM (OWNER)
// ============================================
case "cekemoji": {
    if (!isOwner(ctx)) return ctx.reply("❌ Owner Only!");

    let targetMessage = ctx.message;
    // Kalau me-reply pesan yang ada emojinya
    if (ctx.message.reply_to_message) {
        targetMessage = ctx.message.reply_to_message;
    }

    // Ambil semua entitas dari teks atau caption
    const entities = targetMessage.entities || targetMessage.caption_entities || [];
    const customEmojis = entities.filter(e => e.type === 'custom_emoji');

    if (customEmojis.length === 0) {
        return ctx.reply("❌ <b>Custom Emoji tidak ditemukan!</b>\n\nCara pakai: Reply pesan yang berisi Emoji Premium, atau ketik langsung:\n<code>.cekemoji [emoji premium]</code>", { parse_mode: "HTML" });
    }

    let result = `<blockquote>✨ <b>HASIL DETEKSI EMOJI PREMIUM</b></blockquote>\n\n`;
    
    // Looping buat ngambil semua ID emoji yang ada di pesan tersebut
    customEmojis.forEach((e, i) => {
        // Ekstrak karakter emoji biasa (fallback) dari pesan aslinya
        const fullText = targetMessage.text || targetMessage.caption;
        const fallbackChar = fullText.substring(e.offset, e.offset + e.length);
        const emojiId = e.custom_emoji_id;
        
        result += `<b>${i + 1}. Emoji:</b> ${fallbackChar}\n`;
        result += `🆔 <b>ID:</b> <code>${emojiId}</code>\n`;
        result += `📝 <b>Kode HTML:</b>\n<code>&lt;tg-emoji emoji-id="${emojiId}"&gt;${fallbackChar}&lt;/tg-emoji&gt;</code>\n\n`;
    });

    result += `<i>💡 Copy Kode HTML di atas dan tempel di script bot kamu (Pastikan parse_mode: "HTML" menyala).</i>`;

    return ctx.reply(result, { parse_mode: "HTML" });
}




}
}); // End of bot.on("text")


// ============================================
// ⚔️ ACTION TOMBOL ARISAN BATTLE ROYALE
// ============================================

bot.action(/^join_arisan\|(.+)$/, async (ctx) => {
const arisanId = ctx.match[1];
    const userId = ctx.from.id;
    
    global.activeArisan = global.activeArisan || {}; // <--- SLIPIN DI SINI
    
    const arisan = global.activeArisan[arisanId];

    if (!arisan) return ctx.answerCbQuery("❌ Arisan sudah selesai atau dibatalkan!", { show_alert: true }).catch(()=>{});
    if (arisan.status !== "WAITING") return ctx.answerCbQuery("⏳ Telat bos, arisan sedang diundi!", { show_alert: true }).catch(()=>{});

    // Cek apakah sudah join
    if (arisan.players.some(p => p.id === userId)) {
        return ctx.answerCbQuery("❌ Kamu sudah join di arisan ini!", { show_alert: true }).catch(()=>{});
    }

    let users = global.dbCache.users;
    let pIndex = users.findIndex(u => u.id === userId);
    
    if (pIndex === -1) return ctx.answerCbQuery("❌ Akun kamu belum terdaftar.", { show_alert: true }).catch(()=>{});
    if ((users[pIndex].balance || 0) < arisan.nominal) {
        return ctx.answerCbQuery(`❌ Saldo kurang! Butuh ${formatCoin(arisan.nominal)} Coin`, { show_alert: true }).catch(()=>{});
    }

    // Potong saldo & masukkan peserta
    users[pIndex].balance -= arisan.nominal;
    needSave.users = true;

    const pName = ctx.from.first_name ? ctx.from.first_name.replace(/[<>&]/g, "") : "Player";
    arisan.players.push({ id: userId, name: pName });

    let totalPot = arisan.nominal * arisan.players.length;
    
    let text = `<blockquote>⚔️ <b>ARISAN KOIN (BATTLE ROYALE)</b> ⚔️</blockquote>\n▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰\n👑 <b>Bandar :</b> ${arisan.players[0].name}\n💸 <b>Tiket Masuk:</b> ${formatCoin(arisan.nominal)} Coin\n👥 <b>Peserta  :</b> ${arisan.players.length} / ${arisan.max}\n🏆 <b>Total Pot:</b> ${formatCoin(totalPot)} Coin\n▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰\n\n<b>Daftar Peserta:</b>\n`;
    
    arisan.players.forEach((p, i) => {
        text += `${i+1}. ${p.name} ${i === 0 ? "(Bandar)" : ""}\n`;
    });

    // JIKA KUOTA PENUH, LANGSUNG UNDI!
    if (arisan.players.length >= arisan.max) {
        arisan.status = "PLAYING";
        text += `\n💥 <b>KUOTA PENUH! Mengundi pemenang...</b> 🔄`;
        
        await ctx.editMessageText(text, { parse_mode: "HTML" }).catch(()=>{});
        await sleep(2000); // Suspense ngundi 2 detik
        return selesaikanArisan(ctx, arisanId, arisan);
    } else {
        // JIKA BELUM PENUH, UPDATE LIST PESERTA
        text += `\n<i>Siapa yang mau ikut taruhan massal ini? Klik JOIN di bawah! (Pajak 5%)</i>`;
        const keyboard = {
            inline_keyboard: [
                [{ text: "🔥 JOIN ARISAN", callback_data: `join_arisan|${arisanId}` }],
                [
                    { text: "🚀 GAS SEKARANG", callback_data: `gas_arisan|${arisanId}` },
                    { text: "❌ BATAL", callback_data: `batal_arisan|${arisanId}` }
                ]
            ]
        };
        return ctx.editMessageText(text, { parse_mode: "HTML", reply_markup: keyboard }).catch(()=>{});
    }
});

bot.action(/^gas_arisan\|(.+)$/, async (ctx) => {
    const arisanId = ctx.match[1];
    const userId = ctx.from.id;
    const arisan = global.activeArisan[arisanId];

    if (!arisan) return ctx.answerCbQuery("❌ Arisan tidak ditemukan atau sudah selesai!", { show_alert: true }).catch(()=>{});
    if (userId !== arisan.hostId) return ctx.answerCbQuery("❌ Cuma Bandar (Pembuat Room) yang bisa nge-GAS!", { show_alert: true }).catch(()=>{});
    if (arisan.players.length < 2) return ctx.answerCbQuery("❌ Minimal butuh 2 orang buat mulai!", { show_alert: true }).catch(()=>{});

    arisan.status = "PLAYING";
    let totalPot = arisan.nominal * arisan.players.length;
    
    let text = `<blockquote>⚔️ <b>ARISAN KOIN (BATTLE ROYALE)</b> ⚔️</blockquote>\n▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰\n👑 <b>Bandar :</b> ${arisan.players[0].name}\n💸 <b>Tiket Masuk:</b> ${formatCoin(arisan.nominal)} Coin\n👥 <b>Peserta  :</b> ${arisan.players.length}\n🏆 <b>Total Pot:</b> ${formatCoin(totalPot)} Coin\n▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰\n\n💥 <b>DIPAKSA MULAI OLEH BANDAR! Mengundi...</b> 🔄`;
    
    await ctx.editMessageText(text, { parse_mode: "HTML" }).catch(()=>{});
    await sleep(2000); 
    return selesaikanArisan(ctx, arisanId, arisan);
});

bot.action(/^batal_arisan\|(.+)$/, async (ctx) => {
const arisanId = ctx.match[1];
    const userId = ctx.from.id;
    
    global.activeArisan = global.activeArisan || {}; // <--- SLIPIN DI SINI
    
    const arisan = global.activeArisan[arisanId];

    if (!arisan) return ctx.answerCbQuery("❌ Sudah selesai atau dibatalkan!", { show_alert: true }).catch(()=>{});
    
    // Cuma Bandar atau Owner yang bisa batalin
    let isOwner = String(userId) === String(config.ownerId);
    if (userId !== arisan.hostId && !isOwner) {
        return ctx.answerCbQuery("❌ Cuma Bandar yang bisa membatalkan Arisan!", { show_alert: true }).catch(()=>{});
    }
    
    // REFUND KOIN KE SEMUA PESERTA (No Delay Logic)
    let users = global.dbCache.users;
    arisan.players.forEach(p => {
        let pIdx = users.findIndex(u => u.id === p.id);
        if (pIdx !== -1) users[pIdx].balance += arisan.nominal;
    });
    needSave.users = true;
    delete global.activeArisan[arisanId];

    return ctx.editMessageText(`🏳️ <i>Arisan dibatalkan oleh Bandar. Semua Coin peserta telah dikembalikan utuh ke saldo masing-masing.</i>`, { parse_mode: "HTML" }).catch(()=>{});
});

// ============================================
// ⚔️ AKSI TOMBOL PvP (TARUH DI LUAR SWITCH/CASE)
// ============================================

// Aksi Membatalkan Duel
bot.action(/^batal_adu\|(.+)$/, async (ctx) => {
const duelId = ctx.match[1];
    
    global.activeDuels = global.activeDuels || {}; // <--- SLIPIN DI SINI
    
    const duel = global.activeDuels[duelId];

    if (!duel) return ctx.answerCbQuery("❌ Tantangan sudah tidak berlaku/sudah selesai!", { show_alert: true }).catch(()=>{});
    if (ctx.from.id !== duel.p1_id) return ctx.answerCbQuery("❌ Hanya pembuat tantangan yang bisa membatalkan!", { show_alert: true }).catch(()=>{});

    delete global.activeDuels[duelId]; // Hapus dari memori
    
    try { await ctx.editMessageText(`<i>Tantangan ${formatCoin(duel.nominal)} Coin dari <b>${duel.p1_name}</b> telah dibatalkan.</i> 🏳️`, { parse_mode: "HTML" }); } catch(e){}
});

// ============================================
// ⚔️ AKSI MENERIMA DUEL (GACHA DIMULAI)
// ============================================
bot.action(/^terima_adu\|(.+)\|(.+)$/, async (ctx) => {
const userId = ctx.from.id;
    const duelId = ctx.match[1];
    const tebakanLawan = ctx.match[2]; // 'garuda' atau 'angka'
    
    global.activeDuels = global.activeDuels || {}; // <--- SLIPIN DI SINI
    
    const duel = global.activeDuels[duelId];

    if (!duel) return ctx.answerCbQuery("❌ Telat bro! Tantangan sudah diambil orang lain atau dibatalkan.", { show_alert: true }).catch(()=>{});
    if (userId === duel.p1_id) return ctx.answerCbQuery("❌ Lu gak bisa duel lawan diri sendiri kocak!", { show_alert: true }).catch(()=>{});

    let users = loadUsers();
    
    // Cek saldo penantang (P1)
    let p1Index = users.findIndex(u => u.id === duel.p1_id);
    if (p1Index === -1 || (users[p1Index].balance || 0) < duel.nominal) {
        delete global.activeDuels[duelId];
        return ctx.answerCbQuery("❌ Penantang saldonya ga cukup / udah habis duluan dipake slot!", { show_alert: true }).catch(()=>{});
    }

    // Cek saldo lawan (P2)
    let p2Index = users.findIndex(u => u.id === userId);
    if (p2Index === -1) return ctx.answerCbQuery("❌ Akun kamu belum terdaftar.", { show_alert: true }).catch(()=>{});
    if ((users[p2Index].balance || 0) < duel.nominal) {
        return ctx.answerCbQuery(`❌ Saldo kamu ga cukup buat nerima duel ${formatCoin(duel.nominal)} Coin!`, { show_alert: true }).catch(()=>{});
    }

    // Kunci duel biar gak dipencet dobel
    delete global.activeDuels[duelId]; 

    const p2Name = ctx.from.first_name ? ctx.from.first_name.replace(/[<>&]/g, "") : "Player";
    const tebakanP1 = tebakanLawan === "garuda" ? "angka" : "garuda";

    // POTONG SALDO KEDUANYA (Uang taruhan di-lock di tengah)
    users[p1Index].balance -= duel.nominal;
    users[p2Index].balance -= duel.nominal;
    saveUsers(users);

    // ==========================================
    // 🎨 KAMUS EMOJI PREMIUM (Gampang Diedit)
    // ==========================================
    const e = {
        pedang: '<tg-emoji emoji-id="5454014806950429357">⚔️</tg-emoji>',
        tinju: '<tg-emoji emoji-id="5231406626228948265">🥊</tg-emoji>',
        vs: '<tg-emoji emoji-id="5354932922203782306">🆚</tg-emoji>',
        bintang: '<tg-emoji emoji-id="5208801655004350721">🌟</tg-emoji>',
        jam: '<tg-emoji emoji-id="5213452215527677338">⏳</tg-emoji>',
        ledak: '<tg-emoji emoji-id="5888974760720732797">💥</tg-emoji>',
        api: '<tg-emoji emoji-id="5424972470023104089">🔥</tg-emoji>',
        permen: '<tg-emoji emoji-id="5404573776253825754">🍬</tg-emoji>',
        tengkorak: '<tg-emoji emoji-id="5463250708918711044">💀</tg-emoji>',
        kalender: '<tg-emoji emoji-id="5274055917766202507">🗓</tg-emoji>',
        uang: '<tg-emoji emoji-id="6246771168842356164">💰</tg-emoji>',
        bank: '<tg-emoji emoji-id="5332455502917949981">🏦</tg-emoji>',
        keranjang: '<tg-emoji emoji-id="5352718875152639926">🛒</tg-emoji>', // Tag ganda lu udah gua benerin di sini
        
        // 👇 Ganti ID ini kalau lu punya ID Emoji Garuda & Angka (Dadu) yang lebih bagus
        garuda: '<tg-emoji emoji-id="5443135830883313930">🦅</tg-emoji>', 
        angka: '<tg-emoji emoji-id="5443135830883313930">🔢</tg-emoji>'
    };

    // ==========================================
    // 🎬 RAKIT TEKS ANIMASI BIAR BERSIH
    // ==========================================
    const animasiHeader = `<blockquote>${e.pedang} <b>ARENA ADU KOIN (PvP)</b> ${e.pedang}</blockquote>\n▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰\n${e.tinju} <b>${duel.p1_name}</b> (Pilih ${tebakanP1.toUpperCase()})\n${e.vs}\n${e.tinju} <b>${p2Name}</b> (Pilih ${tebakanLawan.toUpperCase()})\n▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰\n`;
    
    try { await ctx.editMessageText(animasiHeader + `\n      [ ${e.bintang} Mengambil Koin... ]`, { parse_mode: "HTML" }); } catch(err){}
    await sleep(1000);
    try { await ctx.editMessageText(animasiHeader + `\n      [ ${e.jam} Koin dilempar ke udara... ]`, { parse_mode: "HTML" }); } catch(err){}
    await sleep(1000);
    try { await ctx.editMessageText(animasiHeader + `\n      [ ${e.ledak} Koin jatuh dan berputar... ]`, { parse_mode: "HTML" }); } catch(err){}
    await sleep(1500);

    // 🎲 HASIL RNG & PEMBAGIAN UANG (PAJAK 5%)
    const hasilAcak = Math.random() < 0.5 ? "garuda" : "angka";
    const emojiHasil = hasilAcak === "garuda" ? `${e.garuda} GARUDA` : `${e.angka} ANGKA`;
    
    let totalPot = duel.nominal * 2;
    let pajakBandar = totalPot * 0.05; // Bandar ambil 5% coy!
    let hadiahBersih = totalPot - pajakBandar;

    let pemenang = "";
    let pecundang = "";
    
    users = loadUsers(); // Reload data anti bentrok
    p1Index = users.findIndex(u => u.id === duel.p1_id);
    p2Index = users.findIndex(u => u.id === userId);

    if (tebakanP1 === hasilAcak) {
        pemenang = duel.p1_name; pecundang = p2Name;
        users[p1Index].balance += hadiahBersih; 
    } else {
        pemenang = p2Name; pecundang = duel.p1_name;
        users[p2Index].balance += hadiahBersih; 
    }

    saveUsers(users);

    const hasilTeks = `${animasiHeader}\n${e.api} <b>HASIL LEMPARAN : ${emojiHasil}</b> ${e.api}\n\n${e.permen} <b>PEMENANG : ${pemenang}</b>\n${e.tengkorak} <b>RUNGKAD : ${pecundang}</b>\n\n${e.kalender} <b>Struk Hadiah:</b>\n${e.uang} Total Pot : <b>${formatCoin(totalPot)} Coin</b>\n${e.bank} Pajak (5%) : <b>-${formatCoin(pajakBandar)} Coin</b>\n${e.keranjang} Diterima   : <b>+${formatCoin(hadiahBersih)} Coin</b>`;

    try { await ctx.editMessageText(hasilTeks, { parse_mode: "HTML" }); } catch(err){}
});

// ============================================
// ===== ACTION SCHEDULER (TIMER CHANNEL)
// ============================================

bot.action(/schedule_ch_voucher\|(.+)/, async (ctx) => {
    await ctx.answerCbQuery().catch(()=>{});
    const kode = ctx.match[1];
    
    global.pendingSchedule = global.pendingSchedule || {};
    global.pendingSchedule[ctx.from.id] = { type: "voucher", kode: kode };
    
    ctx.reply(`⏳ <b>JADWALKAN VOUCHER KE CHANNEL</b>\n\nKapan voucher <code>${kode}</code> ingin dikirim otomatis?\n\n<i>Contoh format durasi:\n• <b>30 menit</b>\n• <b>20 detik</b>\n• <b>1 jam</b>\n\nContoh format jam:\n• <b>15:30</b> (Jam 3.30 sore WIB)\n• <b>22:00</b> (Jam 10 malam WIB)\n\nKetik <b>batal</b> untuk membatalkan.</i>`, { parse_mode: "HTML" });
});

bot.action(/schedule_ch_ga\|(.+)/, async (ctx) => {
    await ctx.answerCbQuery().catch(()=>{});
    const kode = ctx.match[1];
    
    global.pendingSchedule = global.pendingSchedule || {};
    global.pendingSchedule[ctx.from.id] = { type: "ga", kode: kode };
    
    ctx.reply(`⏳ <b>JADWALKAN DANA KAGET KE CHANNEL</b>\n\nKapan GA <code>${kode}</code> ingin dikirim otomatis?\n\n<i>Contoh format durasi:\n• <b>30 menit</b>\n• <b>20 detik</b>\n• <b>1 jam</b>\n\nContoh format jam:\n• <b>15:30</b> (Jam 3.30 sore WIB)\n• <b>22:00</b> (Jam 10 malam WIB)\n\nKetik <b>batal</b> untuk membatalkan.</i>`, { parse_mode: "HTML" });
});

bot.action(/send_ch_voucher\|(.+)/, async (ctx) => {
    await ctx.answerCbQuery("Mengirim ke channel...").catch(() => {});
    const kode = ctx.match[1];
    const vouchers = loadVouchers();
    if (!vouchers[kode]) return ctx.answerCbQuery("❌ Voucher sudah tidak ada di database!", { show_alert: true });

    const v = vouchers[kode];
    
    // Siapkan memori untuk nyimpen jumlah klik reaksi
    if (!v.reactions) {
        v.reactions = { "0": 0, "1": 0, "2": 0, "3": 0 };
        v.reacted_users = {}; 
        saveVouchers(vouchers);
    }

    const botUsername = ctx.botInfo.username;
    const redeemLink = `https://t.me/${botUsername}?start=redeem_${kode}`;

    // Desain caption
    const textChannel = `<blockquote>🎉 <b>VOUCHER COIN GRATIS!</b></blockquote>\n▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰\nSiapa cepat dia dapat! Segera klaim coin gratis untuk membeli Script, Source Code, atau APK Mod di dalam bot kami.\n\n💰 <b>Nominal:</b> ${v.nominal.toLocaleString('id-ID')} Coin\n🎁 <b>Kuota:</b> ${v.kuota} Orang Pemenang\n🔑 <b>Kode:</b> <code>${kode}</code>\n▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰\n👇 <i>Klik tombol di bawah ini untuk mengklaim!</i>`;

    const emojis = ["😞", "😎", "🔥", "❤"];
    const reactionButtons = emojis.map((em, idx) => {
        const count = v.reactions[idx] || 0;
        return { text: count > 0 ? `${em} ${count}` : em, callback_data: `react|${kode}|${idx}` };
    });

    const keyboard = {
        inline_keyboard: [
            reactionButtons,
            [{ text: "🎁 KLAIM VOUCHER SEKARANG", url: redeemLink }]
        ]
    };

    try {
        const targetChannel = config.channelIdDaget;
        // MENGIRIM DENGAN FOTO (sendPhoto)
        await ctx.telegram.sendPhoto(targetChannel, config.menuImage, { caption: textChannel, parse_mode: "HTML", reply_markup: keyboard });
        
        await ctx.editMessageReplyMarkup({ inline_keyboard: [[{ text: "✅ Berhasil Terkirim ke Channel", callback_data: "ignore" }]] });
    } catch (err) {
        ctx.reply("❌ Gagal mengirim ke channel. Pastikan bot sudah menjadi admin di channel.");
    }
});

bot.action(/send_ch_ga\|(.+)/, async (ctx) => {
    await ctx.answerCbQuery("Mengirim ke channel...").catch(() => {});
    const kode = ctx.match[1];
    const vouchers = loadVouchers();
    if (!vouchers[kode]) return ctx.answerCbQuery("❌ Dana Kaget sudah tidak ada di database!", { show_alert: true });

    const v = vouchers[kode];

    // Siapkan memori untuk nyimpen jumlah klik reaksi
    if (!v.reactions) {
        v.reactions = { "0": 0, "1": 0, "2": 0, "3": 0 };
        v.reacted_users = {}; 
        saveVouchers(vouchers);
    }

    const botUsername = ctx.botInfo.username;
    const redeemLink = `https://t.me/${botUsername}?start=redeem_${kode}`;

    // Desain caption
    const textChannel = `<blockquote>🎉 <b>DANA KAGET (GIVEAWAY) COIN!</b></blockquote>\n▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰\nAyo adu hoki! Nominal yang didapatkan akan diacak secara otomatis (Sistem Dana Kaget).\n\n💰 <b>Total Hadiah:</b> ${v.total_pool.toLocaleString('id-ID')} Coin\n👥 <b>Untuk:</b> ${v.kuota} Orang Pemenang\n🔑 <b>Kode:</b> <code>${kode}</code>\n▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰\n👇 <i>Klik tombol di bawah ini untuk berebut!</i>`;

    const emojis = ["😞", "😎", "🔥", "❤"];
    const reactionButtons = emojis.map((em, idx) => {
        const count = v.reactions[idx] || 0;
        return { text: count > 0 ? `${em} ${count}` : em, callback_data: `react|${kode}|${idx}` };
    });

    const keyboard = {
        inline_keyboard: [
            reactionButtons,
            [{ text: "🚀 KLAIM DANA KAGET", url: redeemLink }]
        ]
    };

    try {
        const targetChannel = config.channelIdDaget;
        // MENGIRIM DENGAN FOTO (sendPhoto)
        await ctx.telegram.sendPhoto(targetChannel, config.menuImage, { caption: textChannel, parse_mode: "HTML", reply_markup: keyboard });
        
        await ctx.editMessageReplyMarkup({ inline_keyboard: [[{ text: "✅ Berhasil Terkirim ke Channel", callback_data: "ignore" }]] });
    } catch (err) {
        ctx.reply("❌ Gagal mengirim ke channel. Pastikan bot sudah menjadi admin di channel.");
    }
});

// ============================================
// ===== ACTION KLIK REAKSI EMOJI DI CHANNEL
// ============================================

bot.action(/^react\|(.+)\|(\d+)$/, async (ctx) => {
    const kode = ctx.match[1];
    const emoIdx = ctx.match[2]; // Index emoji yang diklik (0, 1, 2, atau 3)
    const userId = ctx.from.id;

    const vouchers = loadVouchers();
    if (!vouchers[kode]) return ctx.answerCbQuery("❌ Yahh, voucher ini sudah dihapus / kedaluwarsa.", { show_alert: true });

    const v = vouchers[kode];
    
    // Jaga-jaga kalau data reaksinya corrupt
    if (!v.reactions) {
        v.reactions = { "0": 0, "1": 0, "2": 0, "3": 0 };
        v.reacted_users = {};
    }

    let alertMsg = "";

    // LOGIC ANTI-SPAM & GANTI REAKSI
    if (v.reacted_users[userId] === emoIdx) {
        // Kalau dia klik emoji yang sama, berarti dia nge-BATALIN reaksinya (kayak di IG/Tele)
        v.reactions[emoIdx]--;
        delete v.reacted_users[userId];
        alertMsg = "Tanggapan dihapus.";
    } else {
        // Kalau dia klik emoji lain, hapus yang lama, tambah yang baru
        if (v.reacted_users[userId] !== undefined) {
            v.reactions[v.reacted_users[userId]]--;
        }
        v.reactions[emoIdx]++;
        v.reacted_users[userId] = emoIdx;
        alertMsg = "Berhasil memberikan tanggapan!";
    }

    saveVouchers(vouchers); // Simpan perubahan angkanya

    // Jawab klikannya biar loading di tombolnya hilang
    await ctx.answerCbQuery(alertMsg).catch(() => {});

    // RAKIT ULANG TOMBOLNYA
    const emojis = ["😞", "😎", "🔥", "❤"];
    const reactionButtons = emojis.map((em, idx) => {
        const count = v.reactions[idx] || 0;
        const text = count > 0 ? `${em} ${count}` : em;
        return { text: text, callback_data: `react|${kode}|${idx}` };
    });

    // Cek apakah ini Voucher Biasa atau Giveaway, lalu samakan teks tombol utamanya
    const botUsername = ctx.botInfo.username;
    const redeemLink = `https://t.me/${botUsername}?start=redeem_${kode}`;
    const claimText = v.type === "ga" ? "🚀 KLAIM DANA KAGET" : "🎁 KLAIM VOUCHER SEKARANG";

    const newKeyboard = {
        inline_keyboard: [
            reactionButtons,
            [{ text: claimText, url: redeemLink }]
        ]
    };

    // Update pesan di channel secara LIVE!
    try {
        await ctx.editMessageReplyMarkup(newKeyboard);
    } catch (err) {
        // Abaikan error kalau angkanya nggak berubah
    }
});

// ============================================
// ======== FITUR MYSTERY BOX (GACHA VIP) =====
// ============================================
bot.action("menu_mystery", async (ctx) => {
    await ctx.answerCbQuery().catch(() => {});
    const users = loadUsers();
    const user = users.find(u => u.id === ctx.from.id);
    const saldo = user ? (user.balance || 0) : 0;
    
    // Hitung sisa limit harian
    const todayStr = new Date().toDateString();
    let limitStr = 3;
    if (user && user.last_mystery_date === todayStr) {
        limitStr = 3 - (user.mystery_count || 0);
    }

    const text = `<blockquote>📦 <b>MYSTERY BOX VIP</b></blockquote>\n▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰\nBuka kotak misteri ini dan dapatkan kesempatan memenangkan <b>Script / APK Premium</b> secara acak dari database!\n\n💵 <b>Harga 1 Box:</b> 5.000.000 Coin\n⏳ <b>Jatah Harian:</b> Sisa ${limitStr}x buka hari ini.\n\n<b>🎁 Peluang Hadiah:</b>\n📦 <b>Jackpot:</b> Random Script / APK Mod\n💰 <b>Koin:</b> Koin Acak (1Jt - 8Jt)\n💀 <b>Zonk:</b> Kotak Kosong (Hangus)\n▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰\n🪙 <b>Sisa Coin Kamu:</b> ${saldo.toLocaleString('id-ID')} Coin`;

    const keyboard = {
        inline_keyboard: [
            [{ text: `🎁 BUKA MYSTERY BOX (5 Juta)`, callback_data: "open_mystery" }],
            [{ text: "Kembali", callback_data: "back_to_main_menu",icon_custom_emoji_id: "5258236805890710909" }]
        ]
    };

    try {
        // Edit langsung jadi teks biasa tanpa media
        await ctx.editMessageText(text, { parse_mode: "HTML", reply_markup: keyboard });
    } catch (err) {
        // Kalau menu sebelumnya ada fotonya, hapus foto lama dan kirim teks baru
        await ctx.deleteMessage().catch(() => {});
        await ctx.reply(text, { parse_mode: "HTML", reply_markup: keyboard }).catch(() => {});
    }
});

bot.action("open_mystery", async (ctx) => {
    const userId = ctx.from.id;
    const cost = 5000000;
    
    // Anti Spam Lock
    global.boxLock = global.boxLock || new Set();
    if (global.boxLock.has(userId)) return ctx.answerCbQuery("⏳ Sedang membuka box...", { show_alert: true }).catch(()=>{});
    
    let users = loadUsers();
    let userIndex = users.findIndex(u => u.id === userId);
    
    if (userIndex === -1) return ctx.answerCbQuery("❌ Akun belum terdaftar.", { show_alert: true });
    
    // Cek Saldo
    if ((users[userIndex].balance || 0) < cost) {
        return ctx.answerCbQuery("❌ Coin tidak cukup!\nKamu butuh 5.000.000 Coin untuk membuka Box.", { show_alert: true });
    }

    // Cek Limit 3x Sehari
    const todayStr = new Date().toDateString();
    if (users[userIndex].last_mystery_date !== todayStr) {
        users[userIndex].mystery_count = 0;
        users[userIndex].last_mystery_date = todayStr;
    }

    if (users[userIndex].mystery_count >= 3) {
        return ctx.answerCbQuery("🛑 Jatah Habis!\n\nKamu sudah membuka Box 3x hari ini. Kasih kesempatan yang lain, coba lagi besok!", { show_alert: true });
    }

    global.boxLock.add(userId);

    try {
        await ctx.answerCbQuery().catch(() => {});
        
        // Potong coin & catat limit
        users[userIndex].balance -= cost;
        users[userIndex].mystery_count += 1;
        saveUsers(users);

// =====================================
        // 🌀 ANIMASI BUKA BOX (FAST MODE - ANTI LAG)
        // =====================================
        const animText = `<blockquote>📦 <b>MEMBUKA MYSTERY BOX...</b></blockquote>\n▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰\n\n        🔄 📦 🔄\n\n<i>Mencari hadiah di dalam database...</i>\n▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰`;
        try { 
            await ctx.editMessageCaption(animText, { parse_mode: "HTML" }); 
        } catch(e) {
            await ctx.editMessageText(animText, { parse_mode: "HTML" }).catch(()=>{});
        }
        
        await sleep(1500); // Jeda 1.5 detik

        // =====================================
        // 🎯 LOGIC GACHA RNG
        // =====================================
        const rng = Math.random() * 100;
        let resultText = "";
        let fileToSend = null;
        let fileCaption = "";

        if (rng < 25) {
            // 25% ZONK
            resultText = `💀 <b>ZONK!</b>\n\nYahh sayang sekali, box kamu ternyata KOSONG! Coba lagi besok atau beli lagi.`;
        } else if (rng < 50) {
            // 25% COIN (1 Juta - 8 Juta)
            const winCoin = Math.floor(Math.random() * 7000000) + 1000000;
            users[userIndex].balance += winCoin;
            saveUsers(users);
            resultText = `💰 <b>DAPAT KOIN!</b>\n\nLumayan! Kamu menemukan <b>${winCoin.toLocaleString('id-ID')} Coin</b> di dalam box.`;
        } else {
            // 50% DAPAT PRODUK ACAK (SCRIPT / APK)
            const scripts = loadScripts();
            const apks = loadApks();
            
            // Gabungkan semua file jualan lu jadi satu list
            const allProducts = [...scripts.map(s => ({...s, type: 'Script'})), ...apks.map(a => ({...a, type: 'APK Mod'}))];
            
            if (allProducts.length === 0) {
                // Jaga-jaga kalau database jualan lu masih kosong
                const winCoin = 10000000; 
                users[userIndex].balance += winCoin;
                saveUsers(users);
                resultText = `⚠️ <b>BOX KOSONG (Kompensasi)</b>\n\nKarena belum ada produk di database, bot memberikan kompensasi <b>${winCoin.toLocaleString('id-ID')} Coin</b> untukmu!`;
            } else {
                // Milih 1 produk random
                const randomProduct = allProducts[Math.floor(Math.random() * allProducts.length)];
                fileToSend = randomProduct.file_id || randomProduct.file;
                fileCaption = `🎊 <b>SELAMAT! (HADIAH MYSTERY BOX)</b>\n\n📦 <b>Tipe:</b> ${randomProduct.type}\n📛 <b>Nama:</b> ${escapeHTML(randomProduct.name)}\n💰 <b>Harga Asli:</b> ${randomProduct.price.toLocaleString('id-ID')} Coin\n\n<i>Kamu sangat beruntung mendapatkan ini dengan modal 5 Juta Coin!</i>`;
                
                resultText = `🎉 <b>JACKPOT PRODUK VIP!</b>\n\nWow! Kamu mendapatkan <b>${randomProduct.type}: ${escapeHTML(randomProduct.name)}</b> senilai ${randomProduct.price.toLocaleString('id-ID')} Coin!\n\n<i>File otomatis dikirim ke chat ini...</i>`;
                
                // Masukkan ke history profile user
                users[userIndex].history = users[userIndex].history || [];
                users[userIndex].history.push({ product: `Mystery Box: ${randomProduct.name}`, amount: cost, type: "gacha", timestamp: new Date().toISOString() });
                saveUsers(users);
            }
        }

        // Reload data user (Anti-bug coin)
        let freshUsers = loadUsers();
        let fIndex = freshUsers.findIndex(u => u.id === userId);
        let sisaLimit = 3 - freshUsers[fIndex].mystery_count;

        const finalMsg = `<blockquote>📦 <b>HASIL MYSTERY BOX</b></blockquote>\n▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰\n\n${resultText}\n\n▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰\n⏳ <b>Jatah Harian:</b> Sisa ${sisaLimit} kali\n🪙 <b>Sisa Coin Kamu:</b> ${freshUsers[fIndex].balance.toLocaleString('id-ID')} Coin`;

        const keyboard = {
            inline_keyboard: [
                [{ text: "🎁 BUKA LAGI (5 Juta)", callback_data: "open_mystery" }],
                [{ text: "↩️ Kembali ke Menu", callback_data: "menu_mystery" }]
            ]
        };

        try {
            await ctx.editMessageCaption(finalMsg, { parse_mode: "HTML", reply_markup: keyboard });
        } catch (e) {
            await ctx.editMessageText(finalMsg, { parse_mode: "HTML", reply_markup: keyboard }).catch(()=>{});
        }

// Kalau menang file, kirim dokumennya ke chat PM (Bukan grup)
        if (fileToSend) {
            try {
                // Kirim filenya langsung ke target userId
                await ctx.telegram.sendDocument(userId, fileToSend, { caption: fileCaption, parse_mode: "HTML" });
                
                // Kasih tau di grup/tempat dia klik kalau file udah dikirim ke PM
                if (ctx.chat.type !== 'private') {
                    ctx.reply(`✅ <b>${ctx.from.first_name}</b>, File hadiah Mystery Box telah dikirim ke Pesan Pribadi (PM) kamu!`, { parse_mode: "HTML" }).catch(()=>{});
                }
            } catch(e) {
                ctx.reply(`⚠️ <b>Gagal mengirim file ke PM ${ctx.from.first_name}.</b>\nPastikan kamu sudah pernah chat /start ke bot di Pesan Pribadi (PM), lalu hubungi Admin untuk klaim manual.`, { parse_mode: "HTML" }).catch(()=>{});
            }
        }

    } finally {
        global.boxLock.delete(userId);
    }
});

// ============================================
// ======== 🎰 FITUR KASINO VIP (FULL MATRIX 3x3) ====
// ============================================

const BET_LEVELS = [100000, 500000, 1000000, 5000000, 10000000, 25000000, 50000000, 100000000, 250000000, 500000000, 1000000000];
global.userBets = global.userBets || {}; 
global.slotHistory = global.slotHistory || {}; 
global.activeAutoSpins = global.activeAutoSpins || {}; // Fitur Rem Darurat

// 🎰 DATABASE MESIN SLOT (NILAI MULTIPLIER TIAP EMOJI) - VERSI NERFED (ANTI BANGKRUT)
const SLOT_GAMES = {
    fafafa: {
        name: "FaFaFa Classic", emoji: "🏮", tier: "low",
        desc: "Mesin Rakyat. Sering ngasih Balik Modal biar koin awet.",
        symbols: [
            { sym: "🏮", mult: 10, name: "JACKPOT FAFAFA 🎊" }, // Tadinya x20, sekarang x10
            { sym: "🧧", mult: 5, name: "MEGA WIN 💸" },
            { sym: "🧨", mult: 3, name: "TRIPLE COIN 🪙🪙🪙" },
            { sym: "🪙", mult: 1.5, name: "DOUBLE COIN 🪙🪙" }, // Tadinya x2
            { sym: "🪭", mult: 1, name: "BALIK MODAL 🤝" },
            { sym: "💨", mult: 0, name: "ZONK KOSONG 💀" }
        ]
    },
    mahjong: {
        name: "Mahjong Ways", emoji: "🀄", tier: "low",
        desc: "Ramah Pemula. Gampang dapet Scatter Naga!",
        symbols: [
            { sym: "🐉", mult: 15, name: "SCATTER NAGA 🐲" }, // Tadinya x25
            { sym: "🀄", mult: 8, name: "MEGA MAHJONG 🀄" }, // Tadinya x10
            { sym: "🎋", mult: 4, name: "BIG WIN 🎋" },
            { sym: "🀅", mult: 2, name: "DOUBLE COIN 🪙" },
            { sym: "🀣", mult: 1.2, name: "UNTUNG DIKIT 🤝" },
            { sym: "🗑️", mult: 0, name: "RUNGKAD 💀" }
        ]
    },
    bonanza: {
        name: "Sweet Bonanza", emoji: "🍭", tier: "medium",
        desc: "Manis tapi beresiko. Bom perkalian lumayan gede!",
        symbols: [
            { sym: "🍭", mult: 25, name: "SENSASIONAL BONANZA 🍭" }, // Tadinya x50
            { sym: "💣", mult: 12, name: "BOM PERKALIAN 💣" }, // Tadinya x15
            { sym: "🍬", mult: 6, name: "TASTY WIN 🍬" },
            { sym: "🍉", mult: 3, name: "SWEET TRIPLE 🍉" },
            { sym: "🍇", mult: 1, name: "BALIK MODAL 🤝" },
            { sym: "🍏", mult: 0, name: "ZONK 💀" }
        ]
    },
    wildwest: {
        name: "Wild West Gold", emoji: "🤠", tier: "medium",
        desc: "Mode Koboi! RTP stabil, inceran para pemburu emas.",
        symbols: [
            { sym: "🤠", mult: 35, name: "SHERIFF JACKPOT 🤠" }, // Tadinya x80
            { sym: "🐴", mult: 15, name: "MEGA WIN 🐴" }, // Tadinya x20
            { sym: "💰", mult: 8, name: "KANTONG EMAS 💰" },
            { sym: "🔫", mult: 4, name: "QUARD SHOOT 🔫" },
            { sym: "🌟", mult: 2, name: "DOUBLE SULTAN 🌟" },
            { sym: "🌵", mult: 0, name: "RUNGKAD 💀" }
        ]
    },
    starlight: {
        name: "Starlight Princess", emoji: "🌟", tier: "high",
        desc: "Susah bocor! Sekali nembus langsung Maxwin x50.",
        symbols: [
            { sym: "👸", mult: 50, name: "MAXWIN PRINCESS!! 👸" }, // Tadinya x200
            { sym: "🪄", mult: 25, name: "SENSASIONAL! 🪄" }, // Tadinya x50
            { sym: "❤️", mult: 10, name: "TUMPAH! ❤️" }, // Tadinya x15
            { sym: "☀️", mult: 4, name: "LUMAYAN ☀️" },
            { sym: "🌙", mult: 1, name: "BALIK MODAL 🤝" },
            { sym: "☁️", mult: 0, name: "AMPAS 💀" }
        ]
    },
    olympus: {
        name: "Gates of Olympus", emoji: "⚡", tier: "high",
        desc: "SULTAN ONLY! Sadis nyedot, tapi Petir Kakek Zeus tembus x88!",
        symbols: [
            { sym: "⚡", mult: 88, name: "KAKEK ZEUS MURKA!! (x88) ⚡" }, // Tadinya x500 wkwkwk
            { sym: "👑", mult: 45, name: "SUPER MAXWIN 👑" }, // Tadinya x100
            { sym: "⏳", mult: 20, name: "SENSASIONAL ⏳" }, // Tadinya x25
            { sym: "💍", mult: 8, name: "TUMPAH MEGA 💍" },
            { sym: "💎", mult: 3, name: "TRIPLE SULTAN 💎" },
            { sym: "🔵", mult: 0, name: "PETIR NYANGKUT 💀" }
        ]
    }
};

// 🎲 MESIN PEMBUAT MATRIX 3x3 ASLI
function createRealSlotGrid(gameId, isWin, forcedSymbolObj) {
    const symbols = SLOT_GAMES[gameId].symbols;
    const randomSym = () => symbols[Math.floor(Math.random() * symbols.length)].sym;

    let grid = [
        [randomSym(), randomSym(), randomSym()],
        [randomSym(), randomSym(), randomSym()], // Payline (Baris Tengah)
        [randomSym(), randomSym(), randomSym()]
    ];

    if (isWin && forcedSymbolObj) {
        // Jika menang, paksa baris tengah kembar 3
        grid[1] = [forcedSymbolObj.sym, forcedSymbolObj.sym, forcedSymbolObj.sym];
    } else {
        // Jika kalah (Zonk), pastikan baris tengah GAK MUNGKIN sama semua
        while (grid[1][0] === grid[1][1] && grid[1][1] === grid[1][2]) {
            grid[1][2] = randomSym();
        }
    }

    return `[ ${grid[0].join(" | ")} ]\n<b>[ ${grid[1].join(" | ")} ]  ◀</b> <i>(Payline)</i>\n[ ${grid[2].join(" | ")} ]`;
}

// 1. MENU LOBBY KASINO VIP
bot.action("menu_gacha", async (ctx) => {
    await ctx.answerCbQuery().catch(() => {});
    const text = `<blockquote>🎰 <b>🆅🅸🅿 🅲🅰🆂🅸🅽🅾 🅲🅻🆄🅱</b> 🎰</blockquote>\n▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰\nSelamat datang di Kasino! Pilih mesin slot yang ingin kamu mainkan.\n\n<b>Mesin Tersedia:</b>\n🏮 <b>FaFaFa & Mahjong:</b> Win Rate Tinggi.\n🍭 <b>Bonanza & WildWest:</b> Mode Seimbang.\n⚡ <b>Olympus & Starlight:</b> Susah & Sadis (Max x500).\n▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰\n⚠️ <i>Sistem membaca POLA TARUHAN (Naik/Turun Bet). Jika Auto Spin 10x, mesin murni RNG 100%.</i>`;

    const keyboard = {
        inline_keyboard: [
            [{ text: "🏮 FAFAFA CLASSIC", callback_data: "menu_slot|fafafa" }, { text: "🀄 MAHJONG WAYS", callback_data: "menu_slot|mahjong" }],
            [{ text: "🍭 SWEET BONANZA", callback_data: "menu_slot|bonanza" }, { text: "🤠 WILD WEST", callback_data: "menu_slot|wildwest" }],
            [{ text: "🌟 STARLIGHT PRINCESS", callback_data: "menu_slot|starlight" }, { text: "⚡ GATES OF OLYMPUS", callback_data: "menu_slot|olympus" }],
            [{ text: "🏆 TOP GLOBAL SLOTTER", callback_data: "top_slot" }],
            [{ text: "↩️ KEMBALI KE MENU UTAMA", callback_data: "back_to_main_menu" }]
        ]
    };
    
    // 🔥 UBAH BAGIAN SINI: Langsung tembak teks aja tanpa bawa config.menuImage
    try { 
        await ctx.editMessageText(text, { parse_mode: "HTML", reply_markup: keyboard }); 
    } catch (err) { 
        // Jika menu sebelumnya pakai foto, bot bakal hapus foto lama dan kirim teks baru
        await ctx.deleteMessage().catch(()=>{});
        await ctx.reply(text, { parse_mode: "HTML", reply_markup: keyboard }).catch(()=>{}); 
    }
});

// 2. RENDER MENU GAME SPESIFIK (SUPER FAST - NO MEDIA)
async function renderSlotGame(ctx, gameId) {
    const userId = ctx.from.id;
    const users = loadUsers();
    const user = users.find(u => u.id === userId);
    const saldo = user ? (user.balance || 0) : 0;
    const game = SLOT_GAMES[gameId];

    if (!global.userBets[userId]) global.userBets[userId] = BET_LEVELS[2]; 
    const currentBet = global.userBets[userId];

    const text = `<blockquote>${game.emoji} <b>${game.name.toUpperCase()}</b> ${game.emoji}</blockquote>\n▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰\nℹ️ <i>${game.desc}</i>\n\n💵 <b>Taruhan Saat Ini :</b> ${currentBet.toLocaleString('id-ID')} Coin\n🪙 <b>Saldo Tersedia  :</b> ${saldo.toLocaleString('id-ID')} Coin\n▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰`;

    const keyboard = {
        inline_keyboard: [
            [
                { text: "➖ BET", callback_data: `bet_d|${gameId}` },
                { text: "✏️ CUSTOM", callback_data: `bet_custom|${gameId}` },
                { text: "➕ BET", callback_data: `bet_u|${gameId}` }
            ],
            [{ text: "🔥 ALL IN", callback_data: `bet_all|${gameId}` }],
            [{ text: `🎰 SPIN MANUAL (1x)`, callback_data: `play_slot|${gameId}|1` }],
            [{ text: `🚀 AUTO SPIN (10x)`, callback_data: `play_slot|${gameId}|10` }],
            [{ text: "↩️ GANTI MESIN", callback_data: "menu_gacha" }]
        ]
    };
    
    // 🔥 CUMA PAKAI editMessageText BIAR GAK ERROR SPAM
    try { 
        await ctx.editMessageText(text, { parse_mode: "HTML", reply_markup: keyboard }); 
    } catch (err) { 
        await ctx.reply(text, { parse_mode: "HTML", reply_markup: keyboard }).catch(()=>{}); 
    }
}

bot.action(/^menu_slot\|([a-z]+)$/, async (ctx) => {
    await ctx.answerCbQuery().catch(()=>{});
    await renderSlotGame(ctx, ctx.match[1]);
});

// 3. SISTEM PENGATUR BET
bot.action(/^bet_u\|([a-z]+)$/, async (ctx) => {
    const userId = ctx.from.id;
    let current = global.userBets[userId] || 1000000;
    let nextBet = BET_LEVELS.find(b => b > current) || BET_LEVELS[BET_LEVELS.length - 1];
    if (current < nextBet) { global.userBets[userId] = nextBet; await ctx.answerCbQuery(`Bet: ${formatCoin(nextBet)}`).catch(()=>{}); await renderSlotGame(ctx, ctx.match[1]); } 
    else ctx.answerCbQuery("🛑 Batas Maksimal Instan!", { show_alert: true }).catch(()=>{});
});

bot.action(/^bet_d\|([a-z]+)$/, async (ctx) => {
    const userId = ctx.from.id;
    let current = global.userBets[userId] || 1000000;
    let prevBet = [...BET_LEVELS].reverse().find(b => b < current) || BET_LEVELS[0];
    if (current > prevBet) { global.userBets[userId] = prevBet; await ctx.answerCbQuery(`Bet: ${formatCoin(prevBet)}`).catch(()=>{}); await renderSlotGame(ctx, ctx.match[1]); } 
    else ctx.answerCbQuery("🛑 Batas Minimal!", { show_alert: true }).catch(()=>{});
});

bot.action(/^bet_all\|([a-z]+)$/, async (ctx) => {
    const userId = ctx.from.id;
    const users = loadUsers();
    const user = users.find(u => u.id === userId);
    const saldo = user ? (user.balance || 0) : 0;
    if (saldo < 1000) return ctx.answerCbQuery("❌ Koin terlalu sedikit untuk All In!", { show_alert: true }).catch(()=>{});
    global.userBets[userId] = saldo; 
    await ctx.answerCbQuery(`🔥 ALL IN: ${formatCoin(saldo)} Coin`, { show_alert: true }).catch(()=>{});
    await renderSlotGame(ctx, ctx.match[1]);
});

// Tombol Custom Bet (Mengaktifkan Input Teks)
bot.action(/^bet_custom\|([a-z]+)$/, async (ctx) => {
    const gameId = ctx.match[1];
    global.pendingSlotBet = global.pendingSlotBet || {};
    global.pendingSlotBet[ctx.from.id] = gameId;
    await ctx.answerCbQuery().catch(()=>{});
    ctx.reply(`✏️ <b>CUSTOM BET SLOT</b>\n\nSilakan balas pesan ini dengan nominal bet bebas yang kamu inginkan!\nContoh: <code>44000000</code> atau <code>1500000</code>\n\n<i>Ketik <b>batal</b> untuk membatalkan.</i>`, { parse_mode: "HTML" });
});

// 4. TOMBOL REM DARURAT (STOP AUTO SPIN)
bot.action("stop_auto_spin", async (ctx) => {
    const userId = ctx.from.id;
    if (global.activeAutoSpins[userId]) {
        global.activeAutoSpins[userId] = false; // Matikan bendera loop
        await ctx.answerCbQuery("🛑 Mengerem mesin slot...", { show_alert: true }).catch(()=>{});
    } else {
        await ctx.answerCbQuery("Tidak ada Auto Spin yang aktif.", { show_alert: true }).catch(()=>{});
    }
});

// ==========================================
// 🚀 EKSEKUSI SPIN (ULTRA FAST + POLA DINAMIS EVENT)
// ==========================================
bot.action(/^play_slot\|([a-z]+)\|(\d+)$/, async (ctx) => {
    const userId = ctx.from.id;
    const gameId = ctx.match[1];
    const totalSpinsRequested = parseInt(ctx.match[2]); 
    const game = SLOT_GAMES[gameId];

    global.spinLock = global.spinLock || new Set();
    if (global.spinLock.has(userId)) return ctx.answerCbQuery("⏳ Tunggu spin sebelumnya selesai bos!", { show_alert: true }).catch(()=>{});

    let cost = global.userBets[userId] || 1000000; 

    let fIndex = global.dbCache.users.findIndex(u => u.id === userId);
    if (fIndex === -1) return ctx.answerCbQuery("❌ Akun belum terdaftar.", { show_alert: true }).catch(()=>{});
    
    if ((global.dbCache.users[fIndex].balance || 0) < cost) {
        return ctx.answerCbQuery(`❌ Saldo tidak cukup!\nMinimal butuh ${formatCoin(cost)} Coin.`, { show_alert: true }).catch(()=>{});
    }

    global.spinLock.add(userId);

    try {
        await ctx.answerCbQuery().catch(() => {});

        let history = global.slotHistory[userId] || { loseStreak: 0, lastBet: 0, trend: [], cooldown: 0 };
        if (!history.trend) history.trend = [];
        if (!history.cooldown) history.cooldown = 0;

        let currentTrend = "SAME";
        if (history.lastBet > 0) {
            if (cost > history.lastBet) currentTrend = "UP";
            else if (cost < history.lastBet) currentTrend = "DOWN";
            history.trend.push(currentTrend);
            if (history.trend.length > 8) history.trend.shift();
        }
        let trendStr = history.trend.join(",");

        let totalModalTerpakai = 0;
        let totalHadiahDidapat = 0;
        let winCount = 0;
        let jackpotCount = 0;
        let lastGrid = "";
        let lastStatus = "";
        let isPolaGacor = false;
        let customPolaWinRate = undefined; // Winrate dari event addpola

        if (history.cooldown > 0) {
            history.cooldown -= totalSpinsRequested;
            if (history.cooldown < 0) history.cooldown = 0;
        }

        // 🔥 DETEKSI POLA (Hanya berlaku kalau Spin 1x Manual)
        if (history.cooldown === 0 && totalSpinsRequested === 1) {
            // 1. Pola Bawaan Standar
            if (game.tier === "low" && trendStr.endsWith("UP,UP,DOWN,DOWN")) isPolaGacor = true;
            if (game.tier === "medium" && trendStr.endsWith("DOWN,SAME,UP,UP")) isPolaGacor = true;
            if (game.tier === "high" && trendStr.endsWith("DOWN,UP,DOWN,UP,UP") && cost >= 2500000) isPolaGacor = true;

            // 2. Pola Event Dinamis dari Bandar (addpola)
            if (global.activePola && global.activePola.length > 0) {
                // Bersihin pola yang udah expired
                global.activePola = global.activePola.filter(p => p.expiresAt > Date.now());
                
                // Cek kecocokan
                for (let p of global.activePola) {
                    if (trendStr.endsWith(p.pattern)) {
                        customPolaWinRate = p.winrate;
                        break; // Pola Ketemu!
                    }
                }
            }
        }

        // ========================================================
        // 🚀 TAMPILAN LOADING AUTO SPIN (LANGSUNG TEKS AJA)
        // ========================================================
        if (totalSpinsRequested > 1) {
            const loadingText = `<blockquote>${game.emoji} <b>${game.name.toUpperCase()} (AUTO SPIN ${totalSpinsRequested}x)</b></blockquote>\n▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰\n\n         🎰 <i>Mesin sedang berputar...</i>\n\n▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰\n⚡ <b>Fast Mode:</b> Mengkalkulasi hasil...`;
            
            await ctx.editMessageText(loadingText, { parse_mode: "HTML" }).catch(()=>{});
            await sleep(2000); 
        }

        // ========================================================
        // 🔄 LOOPING MATEMATIKA DI RAM (0 DETIK)
        // ========================================================
        for (let i = 1; i <= totalSpinsRequested; i++) {
            let currentBalance = global.dbCache.users[fIndex].balance || 0;
            if (currentBalance < cost) {
                lastStatus += "\n\n⚠️ <b>SPIN BERHENTI: SALDO HABIS!</b>";
                break; 
            }

            global.dbCache.users[fIndex].balance -= cost;
            totalModalTerpakai += cost;

            let chosenSymbol = null;
            let userCustomWinRate = global.dbCache.users[fIndex].custom_winrate;

            // 🎯 PENENTUAN WINRATE (Prioritas: Kutukan User > Event Pola > Normal)
            let activeWinRate = undefined;
            if (userCustomWinRate !== undefined) activeWinRate = userCustomWinRate;
            else if (customPolaWinRate !== undefined) activeWinRate = customPolaWinRate;

            if (activeWinRate !== undefined) {
                let roll = Math.random() * 100;
                if (roll > activeWinRate) {
                    chosenSymbol = game.symbols[5]; // Paksa Zonk jika gagal roll
                } else {
                    let hadiahRoll = Math.random() * 100;
                    if (hadiahRoll > 95) chosenSymbol = game.symbols[0]; // Jackpot 5%
                    else if (hadiahRoll > 80) chosenSymbol = game.symbols[1]; 
                    else if (hadiahRoll > 50) chosenSymbol = game.symbols[2]; 
                    else if (hadiahRoll > 20) chosenSymbol = game.symbols[3]; 
                    else chosenSymbol = game.symbols[4]; 
                }
            } else {
                let rng = Math.random() * 100;
                if (currentBalance > 300000000) rng -= 50; 
                else if (currentBalance > 100000000) rng -= 25;
                else if (currentBalance > 50000000) rng -= 10;

                if (isPolaGacor) {
                    rng += 60; 
                    if (currentBalance > 100000000) rng += 30; 
                }
                
                if (game.tier === "low") {
                    if (rng > 99) chosenSymbol = game.symbols[0]; 
                    else if (rng > 95) chosenSymbol = game.symbols[1]; 
                    else if (rng > 85) chosenSymbol = game.symbols[2]; 
                    else if (rng > 70) chosenSymbol = game.symbols[3]; 
                    else if (rng > 60) chosenSymbol = game.symbols[4]; 
                    else chosenSymbol = game.symbols[5]; 
                } else if (game.tier === "medium") {
                    if (rng > 99.5) chosenSymbol = game.symbols[0];
                    else if (rng > 96) chosenSymbol = game.symbols[1];
                    else if (rng > 88) chosenSymbol = game.symbols[2];
                    else if (rng > 80) chosenSymbol = game.symbols[3];
                    else if (rng > 70) chosenSymbol = game.symbols[4];
                    else chosenSymbol = game.symbols[5]; 
                } else { 
                    if (rng > 99.8) chosenSymbol = game.symbols[0]; 
                    else if (rng > 98) chosenSymbol = game.symbols[1];
                    else if (rng > 93) chosenSymbol = game.symbols[2]; 
                    else if (rng > 88) chosenSymbol = game.symbols[3]; 
                    else if (rng > 85) chosenSymbol = game.symbols[4]; 
                    else chosenSymbol = game.symbols[5]; 
                }
            }

            let isWin = chosenSymbol.mult > 0;
            let currentPrize = cost * chosenSymbol.mult;

            if (isWin) {
                totalHadiahDidapat += currentPrize;
                winCount++;
                if (chosenSymbol.mult >= 5) jackpotCount++;
                history.loseStreak = 0;
            } else {
                history.loseStreak++;
            }

            global.dbCache.users[fIndex].balance += currentPrize;
            lastGrid = createRealSlotGrid(gameId, isWin, chosenSymbol);
            if (isWin) lastStatus = `🔥 <b>${chosenSymbol.name}</b> (x${chosenSymbol.mult})`;
            else lastStatus = `💥 <b>${chosenSymbol.name}</b> (x0)`;
        } 

        // 🔥 RESET POLA JIKA BERHASIL TEMBUS BIAR GAK DIEKSPLOITASI
        if ((isPolaGacor || customPolaWinRate !== undefined) && winCount > 0) {
            history.trend = [];
            history.loseStreak = 0;
            history.cooldown = Math.floor(Math.random() * 10) + 15; 
            lastStatus += "\n🔥 <i>(POLA SULTAN TERBONGKAR!)</i>";
        }

        history.lastBet = cost;
        global.slotHistory[userId] = history;

        let pnl = totalHadiahDidapat - totalModalTerpakai;
        let pnlText = pnl >= 0 ? `+${formatCoin(pnl)} 📈` : `${formatCoin(pnl)} 📉`;
        
        let ringkasanTeks = "";
        if (totalSpinsRequested > 1) {
            ringkasanTeks = `<b>🎰 Hasil ${totalSpinsRequested}x Putaran:</b>\nMenang: ${winCount}x | Jackpot: ${jackpotCount}x`;
        } else {
            ringkasanTeks = `<b>💥 Status:</b> ${lastStatus}`;
        }

        global.dbCache.users[fIndex].slotStats = global.dbCache.users[fIndex].slotStats || { spins: 0, wins: 0, games: {} };
        global.dbCache.users[fIndex].slotStats.spins += totalSpinsRequested;
        global.dbCache.users[fIndex].slotStats.wins += totalHadiahDidapat; 
        global.dbCache.users[fIndex].slotStats.games[gameId] = (global.dbCache.users[fIndex].slotStats.games[gameId] || 0) + totalSpinsRequested;
        if (ctx.from.first_name) global.dbCache.users[fIndex].first_name = ctx.from.first_name;
        
        if (global.userBets[userId] > global.dbCache.users[fIndex].balance && global.dbCache.users[fIndex].balance > 0) {
             global.userBets[userId] = global.dbCache.users[fIndex].balance; 
        }
        
        needSave.users = true; 
        const finalBalance = global.dbCache.users[fIndex].balance;

        // ========================================================
        // 🎯 TAMPILAN HASIL AKHIR
        // ========================================================
        const finalMsg = `<blockquote>${game.emoji} <b>HASIL AKHIR ${game.name.toUpperCase()}</b></blockquote>\n▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰\n\n${lastGrid}\n\n${ringkasanTeks}\n\n🧾 <b>STRUK TRANSAKSI:</b>\n💸 Total Modal  : <b>${formatCoin(totalModalTerpakai)}</b>\n🎁 Total Hadiah : <b>${formatCoin(totalHadiahDidapat)}</b>\n📊 Profit/Loss  : <b>${pnlText}</b>\n▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰\n💳 <b>Sisa Saldo Kamu:</b> ${finalBalance.toLocaleString('id-ID')} Coin`;

        const keyboard = {
            inline_keyboard: [
                [
                    { text: "BET", callback_data: `bet_d|${gameId}`, icon_custom_emoji_id: "5301240299085906131", style: "primary" },
                    { text: "CUSTOM", callback_data: `bet_custom|${gameId}`, icon_custom_emoji_id: "5395444784611480792", style: "success" },
                    { text: "BET", callback_data: `bet_u|${gameId}`, icon_custom_emoji_id: "5298954496016138169", style: "primary" }
                ],
                [{ text: `🔄 SPIN LAGI (1x)`, callback_data: `play_slot|${gameId}|1` }],
                [{ text: `🚀 AUTO SPIN (10x)`, callback_data: `play_slot|${gameId}|10` }],
                [{ text: "↩️ GANTI MESIN", callback_data: "menu_gacha" }]
            ]
        };

        await ctx.editMessageText(finalMsg, { parse_mode: "HTML", reply_markup: keyboard }).catch(()=>{});

    } finally {
        global.spinLock.delete(userId);
    }
});

// ============================================
// 🏆 FITUR LEADERBOARD TOP GLOBAL SLOT (TOP 3 EXCLUSIVE)
// ============================================
bot.action("top_slot", async (ctx) => {
    await ctx.answerCbQuery("Memuat Papan Peringkat...").catch(()=>{});
    const users = loadUsers();
    
    // Saring dan urutkan
    const slotters = users.filter(u => u.slotStats && u.slotStats.spins > 0);
    slotters.sort((a, b) => b.slotStats.wins - a.slotStats.wins);
    
    // 🔥 CUMA AMBIL TOP 3 BIAR AMAN DARI LIMIT TELEGRAM!
    const top = slotters.slice(0, 3); 
    
    let text = `<blockquote>🏆 <b>TOP GLOBAL SULTAN SLOT</b> 🏆</blockquote>\n▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰\nBerikut adalah 3 Player paling Gacor di Kasino kita!\n\n`;
    
    const keyboard = {
        inline_keyboard: [
            [{ text: "🔄 REFRESH LEADERBOARD", callback_data: "top_slot" }],
            [{ text: "↩️ KEMBALI KE LOBBY", callback_data: "menu_gacha" }]
        ]
    };

    if (top.length === 0) {
        text += `<i>Belum ada data pemain slot. Jadilah yang pertama meraih Jackpot!</i>\n`;
        try { await ctx.editMessageCaption(text, { parse_mode: "HTML", reply_markup: keyboard }); } 
        catch (err) { await ctx.editMessageText(text, { parse_mode: "HTML", reply_markup: keyboard }).catch(()=>{}); }
        return;
    }

    // Medalinya cukup 3 aja sekarang
    const medals = ["🥇", "🥈", "🥉"]; 
    let top1FavGameName = "Belum Ada";
    
    top.forEach((u, i) => {
        // Cari game favorit
        let favGame = "-";
        let maxSpins = 0;
        for (let g in u.slotStats.games) {
            if (u.slotStats.games[g] > maxSpins) { maxSpins = u.slotStats.games[g]; favGame = g; }
        }
        
        let gameName = favGame;
        let gameEmoji = "🎰";
        if (SLOT_GAMES[favGame]) { gameName = SLOT_GAMES[favGame].name; gameEmoji = SLOT_GAMES[favGame].emoji; }
        
        // Simpan nama game favorit Rank 1 untuk dicetak di Kartunya
        if (i === 0) top1FavGameName = gameName; 

        // Ambil Data User (Nama, ID, Username)
        let name = u.first_name || "Anonymous";
        name = name.replace(/[<>&]/g, ""); // Anti error HTML
        if (name.length > 15) name = name.substring(0, 15) + "...";
        
        let uid = u.id || "Tidak Diketahui";
        let uname = u.username ? `@${u.username}` : "<i>Tidak diset</i>";
        
        // Desain Teks Papan Peringkat
        text += `${medals[i]} <b>${name}</b>\n`;
        text += `   🆔 <b>ID:</b> <code>${uid}</code>\n`;
        text += `   👤 <b>Username:</b> ${uname}\n`;
        text += `   🪙 <b>Saldo:</b> ${u.balance.toLocaleString('id-ID')} Coin\n`;
        text += `   🏆 <b>Total JP:</b> ${u.slotStats.wins.toLocaleString('id-ID')} Coin\n`;
        text += `   ${gameEmoji} <b>Fav Mesin:</b> ${gameName}\n\n`;
    });
    
    text += `▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰\n<i>*Peringkat ditentukan dari <b>Total Jackpot</b> terbesar yang pernah didapat. Gambar di atas adalah Kartu VIP khusus Peringkat #1!</i>`;
    
    // 📸 MENCETAK DAN MENGIRIM KARTU VIP UNTUK TOP 1
    try {
        const cardBuffer = await createTopSlotCard(top[0], 1, top1FavGameName);
        
        await ctx.editMessageMedia(
            { type: 'photo', media: { source: cardBuffer }, caption: text, parse_mode: "HTML" },
            { reply_markup: keyboard }
        );
    } catch (err) {
        // Jika gagal edit, hapus pesannya dan kirim ulang pakai Foto VIP
        await ctx.deleteMessage().catch(()=>{});
        const cardBuffer = await createTopSlotCard(top[0], 1, top1FavGameName);
        await ctx.replyWithPhoto({ source: cardBuffer }, { caption: text, parse_mode: "HTML", reply_markup: keyboard }).catch(()=>{});
    }
});

bot.action("buyapk", async (ctx) => {
    await ctx.answerCbQuery("⏳ Membuka katalog APK...", { show_alert: false }).catch(() => {});
    await renderApkPage(ctx, 0); 
});

bot.action(/apk_page\|(\d+)/, async (ctx) => {
    await ctx.answerCbQuery().catch(() => {});
    await renderApkPage(ctx, parseInt(ctx.match[1])); 
});

// DETAIL APK (OWNER)
bot.action(/getapk_detail\|(\d+)/, async (ctx) => {
    await ctx.answerCbQuery().catch(() => {});
    if (!isOwner(ctx)) return ctx.answerCbQuery('❌ Owner Only!');
    const index = Number(ctx.match[1]);
    const apks = loadApks(); const s = apks[index];
    if (!s) return ctx.editMessageText("❌ APK tidak ditemukan.");

    const detailText = `📋 <b>DETAIL APK</b>\n\n📱 <b>Nama:</b> ${escapeHTML(s.name)}\n💰 <b>Harga:</b> ${formatCoin(s.price)} Coin\n📁 <b>File:</b> ${escapeHTML(s.file_name || "Cloud Telegram")}\n📅 <b>Ditambahkan:</b> ${new Date(s.added_date).toLocaleDateString('id-ID')}\n\n📝 <b>Deskripsi:</b>\n${escapeHTML(s.desk || "-")}`;

    return ctx.editMessageText(detailText, { parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "📤 Download APK", callback_data: `download_apk|${index}` }, { text: "🗑️ Hapus APK", callback_data: `del_apk|${index}` }], [{ text: "↩️ Back ke List APK", callback_data: "back_to_apk_list" }]] } });
});

bot.action(/download_apk\|(\d+)/, async (ctx) => {
    await ctx.answerCbQuery().catch(() => {});
    if (!isOwner(ctx)) return ctx.answerCbQuery('❌ Owner Only!');
    const s = loadApks()[Number(ctx.match[1])];
    if (!s) return ctx.reply("❌ APK tidak ditemukan.");
    return ctx.replyWithDocument(s.file_id, { caption: `📱 APK: ${escapeHTML(s.name)}`, parse_mode: "HTML" }).catch(() => ctx.reply("❌ Gagal mengambil file."));
});

bot.action("back_to_apk_list", async (ctx) => {
    await ctx.answerCbQuery().catch(() => {});
    if (!isOwner(ctx)) return ctx.answerCbQuery('❌ Owner Only!');
    await sendGetApkPage(ctx, 0);
});

// ===== ACTION HALAMAN GET SCRIPT & APK =====
bot.action(/getscript_page\|(\d+)/, async (ctx) => {
    await ctx.answerCbQuery().catch(() => {});
    const page = parseInt(ctx.match[1]);
    await sendGetScriptPage(ctx, page);
});

bot.action(/getapk_page\|(\d+)/, async (ctx) => {
    await ctx.answerCbQuery().catch(() => {});
    const page = parseInt(ctx.match[1]);
    await sendGetApkPage(ctx, page);
});

bot.action(/del_apk\|(\d+)/, async (ctx) => {
    await ctx.answerCbQuery().catch(() => {});
    if (!isOwner(ctx)) return ctx.answerCbQuery('❌ Owner Only!');
    const index = Number(ctx.match[1]);
    let apks = loadApks();
    if (!apks[index]) return ctx.editMessageText("❌ Tidak ditemukan.");

    const name = apks[index].name; apks.splice(index, 1); saveApks(apks); // Hapus pakai index
    return ctx.editMessageText(`✅ APK <b>${escapeHTML(name)}</b> berhasil dihapus dari database.`, { parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "↩️ Kembali ke List APK", callback_data: "back_to_apk_list" }]] } });
});

// TRANSAKSI PEMBELIAN (USER)
bot.action(/^apk\|(\d+)/, async (ctx) => {
    await ctx.answerCbQuery().catch(() => {});
    const index = Number(ctx.match[1]);
    const sc = loadApks()[index];
    if (!sc) return ctx.reply("❌ APK tidak ditemukan.");

    const waktu = new Date().toLocaleString("id-ID", { weekday: "long", day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" }).replace(".", ":");
    const text = `<blockquote><b>📝 Konfirmasi Pemesanan</b></blockquote>\n━━━━━━━━━━━━━━━━━\n📱 Produk: APK ${escapeHTML(sc.name)}\n\n💰 Harga: ${Number(sc.price).toLocaleString("id-ID")} Coin\n🕒 Waktu: ${waktu}\n━━━━━━━━━━━━━━━━━\n<blockquote><b>📝 Deskripsi:</b></blockquote>\n${escapeHTML(sc.desk || "-")}\n━━━━━━━━━━━━━━━━━\n⚠️ Apakah Anda yakin ingin melanjutkan pembayaran?`.trim();

    await ctx.editMessageText(text, { parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "✅ Konfirmasi", callback_data: `confirm_apk|${index}` }, { text: "❌ Batalkan", callback_data: "back_to_apk" }]] } });
});

bot.action(/confirm_apk\|(\d+)/, async (ctx) => {
    await ctx.answerCbQuery().catch(() => {});
    const index = Number(ctx.match[1]);
    const userId = ctx.from.id;
    const sc = loadApks()[index];
    if (!sc) return ctx.reply("❌ APK tidak ditemukan.");

    const harga = getDiscountPrice(userId, sc.price);
    const user = loadUsers().find(u => u.id === userId);
    const saldo = user ? (user.balance || 0) : 0;

    let teksHarga = `💰 <b>Harga Normal:</b> ${sc.price.toLocaleString('id-ID')} Coin`;
    if (harga.diskonPersen > 0) {
        teksHarga = `💰 <b>Harga Normal:</b> <s>${sc.price.toLocaleString('id-ID')} Coin</s>\n🏷 <b>Diskon ${harga.roleName} (${harga.diskonPersen}%):</b> -${harga.potongan.toLocaleString('id-ID')} Coin\n💳 <b>Harga Akhir: ${harga.finalPrice.toLocaleString('id-ID')} Coin</b>`;
    }

    return ctx.editMessageText(`🛒 <b>Pilih Metode Pembayaran</b>\n\n📱 Produk: APK ${escapeHTML(sc.name)}\n${teksHarga}\n\n🪙 Coin Anda: ${saldo.toLocaleString('id-ID')} Coin`, { parse_mode: "html", reply_markup: { inline_keyboard: [[{ text: `💰 Bayar via Coin (${harga.finalPrice.toLocaleString('id-ID')} Coin)`, callback_data: `pay_coin_apk|${index}` }], [{ text: "❌ Batalkan", callback_data: "back_to_apk" }]] } }).catch(()=>{});
});

bot.action(/pay_coin_apk\|(\d+)/, async (ctx) => {
    await ctx.answerCbQuery().catch(() => {});
    await ctx.editMessageText(
        `<blockquote><b>⏳ MEMPROSES PEMBELIAN</b>
<i>Bot sedang menyiapkan file APK untukmu...</i></blockquote>`,
        { parse_mode: "HTML" }
    ).catch(() => {});

    const index = Number(ctx.match[1]);
    const userId = ctx.from.id;
    const sc = loadApks()[index];
    if (!sc) {
        return ctx.editMessageText(
            `<blockquote><b>❌ APK TIDAK DITEMUKAN</b>
Produk yang kamu pilih tidak tersedia atau telah dihapus.</blockquote>`,
            { parse_mode: "HTML" }
        ).catch(()=>{});
    }

    const harga = getDiscountPrice(userId, sc.price);
    const price = harga.finalPrice;

    const users = loadUsers();
    const userIndex = users.findIndex(u => u.id === userId);
    users[userIndex].balance = users[userIndex].balance || 0;

    if (users[userIndex].balance < price) {
        return ctx.editMessageText(
`<blockquote><b>❌ COIN TIDAK MENCUKUPI</b>
Saldo Coin kamu tidak cukup untuk membeli produk ini.</blockquote>
<blockquote><b>💰 DETAIL TRANSAKSI</b>
🪙 Coin Kamu : <b>${(users[userIndex].balance || 0).toLocaleString('id-ID')}</b>
💳 Harga Final : <b>${price.toLocaleString('id-ID')}</b></blockquote>
<blockquote><i>Silakan kumpulkan Coin lagi atau lakukan Topup terlebih dahulu.</i></blockquote>`,
            { parse_mode: "HTML" }
        ).catch(()=>{});
    }

    users[userIndex].balance -= price;
    users[userIndex].total_spent = (users[userIndex].total_spent || 0) + price;
    users[userIndex].history = users[userIndex].history || [];
    users[userIndex].history.push({
        product: `APK: ${sc.name}`,
        amount: price,
        type: "apk",
        details: sc.desk || "-",
        timestamp: new Date().toISOString()
    });
    saveUsers(users);

    const buyerInfo = {
        id: userId,
        name: ctx.from.first_name + (ctx.from.last_name ? ' ' + ctx.from.last_name : ''),
        username: ctx.from.username,
        totalSpent: users[userIndex].total_spent
    };

    await notifyOwner(ctx, { type: "apk", name: sc.name, amount: price }, buyerInfo);

    try {
        await ctx.telegram.sendDocument(userId, sc.file_id, {
            caption:
`<blockquote><b>📦 FILE BERHASIL DIKIRIM</b>
Terima kasih telah membeli produk di bot ini.</blockquote>
<blockquote><b>📱 PRODUK</b>
${escapeHTML(sc.name)}</blockquote>
<blockquote><i>Silakan download file APK yang telah dikirim.</i></blockquote>`,
            parse_mode: "HTML"
        });

        await ctx.editMessageText(
`<blockquote><b>✅ PEMBELIAN BERHASIL</b>
Transaksi kamu telah diproses dengan sukses.</blockquote>
<blockquote><b>📦 DETAIL PEMBELIAN</b>
📱 Produk : APK ${escapeHTML(sc.name)}
💰 Harga Dibayar : <b>${price.toLocaleString('id-ID')} Coin</b>
🪙 Sisa Coin : <b>${users[userIndex].balance.toLocaleString('id-ID')}</b></blockquote>
<blockquote><i>📩 File APK telah dikirim ke <b>Pesan Pribadi (PM)</b> kamu.</i></blockquote>`,
            { parse_mode: "HTML" }
        ).catch(()=>{});

    } catch (err) {

        await ctx.editMessageText(
`<blockquote><b>⚠️ GAGAL MENGIRIM FILE</b>
Pembelian berhasil tetapi bot tidak bisa mengirim file ke PM kamu.</blockquote>
<blockquote><b>📌 SOLUSI</b>
1. Pastikan kamu sudah mengetik <b>/start</b> ke bot di chat pribadi.
2. Setelah itu coba lakukan pembelian lagi.</blockquote>
<blockquote><i>Jika masih gagal, hubungi Admin dan kirimkan screenshot ini.</i></blockquote>`,
            { parse_mode: "HTML" }
        ).catch(()=>{});
    }
});

bot.action("back_to_apk", async (ctx) => {
    await ctx.answerCbQuery().catch(() => {});
    await renderApkPage(ctx, 0); 
});

// ===== FITUR MISI COIN =====
bot.action("misi_coin", async (ctx) => {
    await ctx.answerCbQuery().catch(()=>{});
    
    const missions = loadMissions();
    const users = loadUsers();
    const user = users.find(u => u.id === ctx.from.id);
    if (!user) return ctx.reply("Akun tidak ditemukan.");

    const claimed = user.claimed_missions || [];
    const availableMissions = missions.filter(m => !claimed.includes(m));

    let text = "🎯 <b>MISI COIN (REWARD: 2.000.000 COIN)</b>\n▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰\n";
    let buttons = [];

    // Jika misi habis atau belum ada misi sama sekali
    if (availableMissions.length === 0) {
        text += "\nWah, sepertinya kamu sudah menyelesaikan semua misi atau belum ada misi baru untuk mendapatkan coin saat ini. Tunggu update selanjutnya ya!";
        buttons.push([{ text: "Kembali", callback_data: "back_to_main_menu", icon_custom_emoji_id: "5258236805890710909" }]);
    } else {
        text += "\nSilakan bergabung ke channel di bawah ini, lalu klik tombol <b>Cek Misi</b> untuk mengklaim 2 Juta Coin gratis!\n\n";
        
        availableMissions.forEach(ch => {
            const chNameLink = ch.replace('@', '').trim();
            buttons.push([{ text: `📢 Join ${ch}`, url: `https://t.me/${chNameLink}` }]);
            buttons.push([{ text: `✅ Cek Misi ${ch}`, callback_data: `cek_misi|${ch}` }]);
        });
        buttons.push([{ text: "Kembali", callback_data: "back_to_main_menu", icon_custom_emoji_id: "5258236805890710909" }]);
    }

    try {
        // Edit langsung jadi teks tanpa media/foto
        await ctx.editMessageText(text, { parse_mode: "HTML", reply_markup: { inline_keyboard: buttons } });
    } catch (err) {
        // Kalau menu sebelumnya ada fotonya, hapus foto lama dan kirim pesan teks baru
        await ctx.deleteMessage().catch(()=>{});
        await ctx.reply(text, { parse_mode: "HTML", reply_markup: { inline_keyboard: buttons } }).catch(()=>{});
    }
});

bot.action(/cek_misi\|(.+)/, async (ctx) => {
    const ch = ctx.match[1];
    const userId = ctx.from.id;

    // Cek apakah user sudah gabung channel
    try {
        const member = await ctx.telegram.getChatMember(ch, userId);
        if (!['member', 'administrator', 'creator'].includes(member.status)) {
            return ctx.answerCbQuery(`❌ GAGAL! Kamu belum join channel ${ch}. Silakan join terlebih dahulu ya!`, { show_alert: true });
        }
    } catch (e) {
        return ctx.answerCbQuery(`❌ Sistem gagal mengecek status join kamu. Mohon laporkan ke admin!`, { show_alert: true });
    }

    const users = loadUsers();
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex === -1) return ctx.answerCbQuery("❌ Akun belum terdaftar.", { show_alert: true });

    // Inisialisasi properti misi jika belum ada
    if (!users[userIndex].claimed_missions) {
        users[userIndex].claimed_missions = [];
    }

    // Hindari eksploitasi dobel klaim
    if (users[userIndex].claimed_missions.includes(ch)) {
        return ctx.answerCbQuery("❌ Kamu sudah mengklaim hadiah dari misi ini!", { show_alert: true });
    }

    // Berikan Hadiah 2 Juta Coin
    const reward = 2000000;
    users[userIndex].balance = (users[userIndex].balance || 0) + reward;
    users[userIndex].claimed_missions.push(ch);
    saveUsers(users);

    // Tampilkan notifikasi pop-up berhasil
    await ctx.answerCbQuery(`🎉 BERHASIL KLAIM!\n\nSelamat, kamu mendapatkan ${reward.toLocaleString('id-ID')} Coin dari misi ini!`, { show_alert: true });

    // Refresh halaman secara otomatis (lempar ulang ke action misi_coin)
    ctx.match[0] = "misi_coin"; // Manipulasi match agar tidak error saat dialihkan
    bot.handleUpdate({ callback_query: { id: ctx.callbackQuery.id, from: ctx.from, message: ctx.callbackQuery.message, data: "misi_coin" } });
});

// ===== FITUR KLIK TOMBOL TRANSFER COIN =====
bot.action("transfer_coin", async (ctx) => {
    const fromId = ctx.from.id;
    const users = loadUsers();
    const user = users.find(u => u.id === fromId);

    // ❌ PERBAIKAN: Pop-up alert tidak support HTML, harus pakai emoji bawaan & string aman
    if (!user || (user.balance || 0) <= 0) {
        return ctx.answerCbQuery(
            "❌ Saldo kamu 0 Coin!\n\nKamu tidak bisa melakukan transfer.",
            { show_alert: true }
        ).catch(() => {});
    }

    await ctx.answerCbQuery().catch(() => {});

    // Aktifkan mode tunggu balasan
    pendingTransfer[fromId] = true;

    // ==========================================
    // 🎨 KAMUS EMOJI PREMIUM
    // ==========================================
    const e = {
        uangTerbang: '<tg-emoji emoji-id="5373174941095050893">💸</tg-emoji>',
        catatan: '<tg-emoji emoji-id="5373251851074415873">📝</tg-emoji>',
        pin: '<tg-emoji emoji-id="5397782960512444700">📌</tg-emoji>',
        warning: '<tg-emoji emoji-id="5420323339723881652">⚠️</tg-emoji>',
        silang: '<tg-emoji emoji-id="5210952531676504517">❌</tg-emoji>'
    };

    // 📝 TAMPILAN DIRAPIHIN (Tanpa Bold Berlebihan)
    const text = `
<blockquote>${e.uangTerbang} TRANSFER COIN</blockquote>
Kirim Coin kamu ke teman dengan mudah menggunakan ID Telegram atau @Username.

<blockquote>${e.catatan} FORMAT PENGIRIMAN</blockquote>
<code>[Target] [Nominal]</code>

<blockquote>${e.pin} CONTOH PENGGUNAAN</blockquote>
• Pakai ID :
<code>123456789 50000</code>

• Pakai Username :
<code>@zyntherion 50000</code>

${e.warning} <i>Pastikan ID / Username benar sebelum mengirim Coin.</i>
${e.silang} <i>Ketik batal atau tekan tombol di bawah untuk membatalkan proses.</i>
`.trim();

    const keyboard = {
        inline_keyboard: [
            // Gua tambahin style: "danger" biar tombol batalnya jadi warna MERAH 🔴
            [{ text: "BATALKAN TRANSFER", callback_data: "batal_transfer", icon_custom_emoji_id: "5210952531676504517", style: "danger" }]
        ]
    };

    try {
        await ctx.editMessageText(text, { parse_mode: "HTML", reply_markup: keyboard });
    } catch (err) {
        await ctx.deleteMessage().catch(() => {});
        await ctx.reply(text, { parse_mode: "HTML", reply_markup: keyboard }).catch(() => {});
    }
});

// ===== ACTION TOMBOL BATAL TRANSFER =====
bot.action("batal_transfer", async (ctx) => {
    const fromId = ctx.from.id;
    
    // Matikan mode tunggu ketikan transfer
    delete pendingTransfer[fromId]; 
    
    await ctx.answerCbQuery("✅ Transfer dibatalkan.").catch(() => {});

    // Langsung rakit dan balikin ke Menu Utama tanpa pesan baru
    const captionText = menuTextBot(ctx);
    const keyboard = {
        inline_keyboard: [
            [
                { 
                  text: "List APK Mod", 
                  callback_data: "buyapk",
                  icon_custom_emoji_id: "5913264639025615311"
                },
               {
                  text: "List Script", 
                  callback_data: "buyscript",
                  icon_custom_emoji_id: "5818955300463447293"
               }
            ],
            [
                { 
                  text: "Claim Harian", 
                  callback_data: "claim_harian",
                  icon_custom_emoji_id: "5449800250032143374"
                },
                { 
                  text: "Spin Gacha", 
                  callback_data: "menu_gacha",
                  icon_custom_emoji_id: "5328247482939890897"
                }
            ],
            [
                { 
                  text: "Referral",
                  callback_data: "menu_referral",
                  icon_custom_emoji_id: "5258362837411045098"
                 },
                { 
                  text: "Kirim Coin", 
                  callback_data: "transfer_coin",
                  icon_custom_emoji_id: "5213170203680060059"
                }
            ],
            [
              { 
                text: "Mystery Box", 
                callback_data: "menu_mystery",
                icon_custom_emoji_id: "5854908544712707500"
              }
            ],
            [
               { 
                 text: "Misi Coin",
                 callback_data: "misi_coin",
                 icon_custom_emoji_id: "5269254848703902904"
               },
               { 
                 text: "Cek Profil", 
                 callback_data: "profile",
                 icon_custom_emoji_id: "5316727448644103237"
               }
            ],
            [
                {
                  text: "Cek Rating", 
                  callback_data: "cek_rating",
                  icon_custom_emoji_id: "5469744063815102906"
                },
                {
                  text: "Top Pengguna", 
                  callback_data: "top_users",
                  icon_custom_emoji_id: "5368617177635107810"
                }
            ],
            [
               { 
                 text: "Cs / Tiket Bantuan", 
                 callback_data: "cs_ai_start",
                 icon_custom_emoji_id: "5238025132177369293"
               }
           ]
        ]
    };

    try {
        await ctx.editMessageText(captionText, { parse_mode: "HTML", reply_markup: keyboard });
    } catch (err) {
        await ctx.deleteMessage().catch(() => {});
        await ctx.reply(captionText, { parse_mode: "HTML", reply_markup: keyboard }).catch(() => {});
    }
});

// ===== FITUR CLAIM HARIAN =====
bot.action("claim_harian", async (ctx) => {
    const fromId = ctx.from.id;
    const users = loadUsers();
    const userIndex = users.findIndex(u => u.id === fromId);

    // Jika user belum terdaftar, munculkan pop-up alert
    if (userIndex === -1) {
        return ctx.answerCbQuery("❌ Akun belum terdaftar. Silakan ketik /start terlebih dahulu.", { show_alert: true }).catch(() => {});
    }

    // Ambil tanggal hari ini (Format contoh: "Fri Mar 06 2026")
    const now = new Date();
    const todayStr = now.toDateString(); 
    
    // Jika user sudah klaim hari ini, munculkan pop-up alert di tengah layar
    if (users[userIndex].last_claim === todayStr) {
        return ctx.answerCbQuery("❌ GAGAL KLAIM!\n\nKamu sudah mengambil jatah Claim Harian hari ini. Silakan kembali lagi besok ya!", { show_alert: true }).catch(() => {});
    }

    // Jika berhasil melewati pengecekan, hilangkan loading di tombol tanpa pop-up
    await ctx.answerCbQuery().catch(() => {});

    // Berikan saldo 1.000.000 Coin
    const bonusClaim = 1000000;
    users[userIndex].balance = (users[userIndex].balance || 0) + bonusClaim;
    users[userIndex].last_claim = todayStr; // Catat tanggal klaim terakhir
    
    saveUsers(users); // Simpan ke database

    // Kirim pesan sukses ke obrolan
    return ctx.reply(`🎉 <b>KLAIM HARIAN BERHASIL!</b>\n\nSelamat! Kamu mendapatkan <b>${bonusClaim.toLocaleString('id-ID')} Coin</b> gratis hari ini.\n\n🪙 Total Coin kamu sekarang: <b>${users[userIndex].balance.toLocaleString('id-ID')} Coin</b>`, { parse_mode: "HTML" });
});

// ===== TOMBOL BUKA MENU SCRIPT =====
bot.action("buyscript", async (ctx) => {
    const settings = loadSettings();
    if (!settings.script) return ctx.answerCbQuery("💻 Stok Script Kosong\n\n😕 Untuk saat ini belum ada script yang bisa diproses.", { show_alert: true });
    await ctx.answerCbQuery("⏳ Membuka katalog script...", { show_alert: false }).catch(() => {});
    await renderScriptPage(ctx, 0); 
});

bot.action(/script_page\|(\d+)/, async (ctx) => {
    await ctx.answerCbQuery().catch(() => {});
    const page = parseInt(ctx.match[1]);
    await renderScriptPage(ctx, page); 
});

bot.action("ignore", async (ctx) => {
    await ctx.answerCbQuery().catch(() => {}); 
});

// ===== FITUR CEK PROFIL =====
bot.action("profile", async (ctx) => {
    await ctx.answerCbQuery().catch(() => {});

    const fromId = ctx.from.id;
    const users = loadUsers();
    const user = users.find(u => u.id === fromId);

    // Ubah ke answerCbQuery biar muncul pop-up kalau user ga ada, bukan ngirim pesan baru
    if (!user) return ctx.answerCbQuery("❌ User tidak ditemukan", { show_alert: true }).catch(() => {});

    const firstName = user.first_name || '';
    const lastName = user.last_name || '';
    const fullName = firstName + (lastName ? ' ' + lastName : '');
    const userUsername = user.username ? '@' + user.username : 'Tidak ada';

    let lastTransactions = '<i>Belum ada transaksi</i>';
    if (user.history && user.history.length > 0) {
        lastTransactions = user.history.slice(-3).reverse().map((t, i) => {
            return `${i + 1}. ${escapeHTML(t.product)} - ${formatCoin(t.amount)} Coin (${new Date(t.timestamp).toLocaleDateString('id-ID')})`;
        }).join('\n');
    } // ✅ NAH INI DIA KURUNG TUTUP YANG HILANG BOSKU!

    // ==========================================
    // 🎨 KAMUS EMOJI PREMIUM
    // ==========================================
    const e = {
        name: '<tg-emoji emoji-id="5215414165178425004">📛</tg-emoji>',
        id: '<tg-emoji emoji-id="5334890573281114250">🆔</tg-emoji>',
        userName: '<tg-emoji emoji-id="5411301743738777449">🤍</tg-emoji>',
        tanggal: '<tg-emoji emoji-id="5413879192267805083">🗓</tg-emoji>',
        coin: '<tg-emoji emoji-id="5199552030615558774">🪙</tg-emoji>',
        statistik: '<tg-emoji emoji-id="5231200819986047254">📊</tg-emoji>',
        catatan: '<tg-emoji emoji-id="5852614525370503272">📝</tg-emoji>',
        identitas: '<tg-emoji emoji-id="5422683699130933153">🪪</tg-emoji>',
        garis: '<tg-emoji emoji-id="5413382711228259707">➖</tg-emoji>'
    };

    const profileText = `
<blockquote><b>${e.identitas} Profile Kamu</b>
${e.garis.repeat(10)}
<b>${e.name} Nama:</b> <code>${escapeHTML(fullName)}</code>
<b>${e.id} User ID:</b> <code>${user.id}</code>
<b>${e.userName} Username:</b> ${escapeHTML(userUsername)}
<b>${e.tanggal} Join Date:</b> ${new Date(user.join_date).toLocaleDateString('id-ID')}
<b>${e.coin} Total Spent:</b> ${formatCoin(user.total_spent || 0)} Coin
<b>${e.statistik} Total Transaksi:</b> ${user.history ? user.history.length : 0}</blockquote>
${e.garis.repeat(10)}
<blockquote><b>${e.catatan} Last 3 Transactions:</b>
${lastTransactions}</blockquote>
`.trim();

    const keyboard = { 
        inline_keyboard: [[{ text: "Kembali", callback_data: "back_to_main_menu", icon_custom_emoji_id: "5258236805890710909", style: "danger" }]] 
    };

    try {
        // Langsung edit teks tanpa media
        await ctx.editMessageText(profileText, { parse_mode: "HTML", disable_web_page_preview: true, reply_markup: keyboard });
    } catch (err) {
        // Jika ada error (misal message is not modified), abaikan
        if (err.description && err.description.includes("message is not modified")) return;
        // Fallback jika tidak bisa diedit: langsung kirim pesan baru tanpa hapus yang lama
        await ctx.reply(profileText, { parse_mode: "HTML", disable_web_page_preview: true, reply_markup: keyboard }).catch(() => {});
    }
});
bot.action("history", async (ctx) => {
    const fromId = ctx.from.id;
    const users = loadUsers();
    const user = users.find(u => u.id === fromId);

    if (!user || !user.history || user.history.length === 0) {
        return ctx.answerCbQuery("📭 Belum ada riwayat transaksi", { show_alert: true }).catch(() => {});
    }

    await ctx.answerCbQuery().catch(() => {});
    try { await ctx.deleteMessage(); } catch (err) { return; }

    let historyText = `<b>📋 Riwayat Transaksi</b>\n\n`;
    user.history.slice().reverse().forEach((t, i) => {
        historyText += `<b>${i + 1}. ${escapeHTML(t.product)}</b>\n`;
        historyText += `💰 Harga: ${formatCoin(t.amount)} Coin\n`;
        historyText += `📅 Tanggal: ${new Date(t.timestamp).toLocaleDateString('id-ID')} ${new Date(t.timestamp).toLocaleTimeString('id-ID')}\n`;
        historyText += `📦 Tipe: ${escapeHTML(t.type)}\n`;
        if (t.details) historyText += `📝 Detail: ${escapeHTML(t.details)}\n`;
        historyText += `\n`;
    });

    ctx.reply(historyText, { parse_mode: "HTML", disable_web_page_preview: true, reply_markup: { inline_keyboard: [[{ text: "Kembali", callback_data: "informasi_admin", icon_custom_emoji_id: "5210952531676504517"  }]] } }).catch(() => {});
});

bot.action("cancel_order", async (ctx) => {
    await ctx.answerCbQuery().catch(() => {});
    try { await ctx.deleteMessage(); } catch (err) { return; } 

    const userId = ctx.from.id;
    const order = orders[userId];

    if (order && order.qrMessageId) {
        try { await ctx.telegram.deleteMessage(order.chatId, order.qrMessageId); } catch (e) {}
    }
    delete orders[userId];

    ctx.reply("✅ <b>Order berhasil dibatalkan.</b>\n\nSilakan order ulang atau pilih produk lain.", {
        parse_mode: "HTML",
        reply_markup: { inline_keyboard: [[{ text: "🗂 List Script", callback_data: "buyscript"  }], [{ text: "Kembali", callback_data: "back_to_main_menu", icon_custom_emoji_id: "5210952531676504517"  }]] }
    }).catch(() => {});
});

bot.action(/coinpage_(\d+)/, async (ctx) => {
    const page = parseInt(ctx.match[1]);
    if (!isOwner(ctx)) return ctx.answerCbQuery("❌ Owner Only!", { show_alert: true });
    await ctx.answerCbQuery().catch(() => {});
    await sendCoinPage(ctx, page);
});

bot.action("top_users", async (ctx) => {
    await ctx.answerCbQuery().catch(() => {});

    const users = loadUsers();
    const sortedUsers = users.filter(u => u.total_spent > 0).sort((a, b) => (b.total_spent || 0) - (a.total_spent || 0));

    const getTopData = (index) => {
        const user = sortedUsers[index];
        if (!user) return { id: "-", name: "Belum ada", saldo: 0, trx: 0, total: 0 };
        let name = user.username ? `@${user.username}` : (user.first_name || `User${user.id}`);
        return { id: user.id, name: escapeHTML(name), saldo: user.balance || 0, trx: user.history ? user.history.length : 0, total: user.total_spent || 0 };
    };

    const top1 = getTopData(0); const top2 = getTopData(1); const top3 = getTopData(2);

    // ==========================================
    // 🎨 KAMUS EMOJI PREMIUM
    // ==========================================
    const e = {
        piala: '<tg-emoji emoji-id="5226431245918942763">🏆</tg-emoji>',
        juara1: '<tg-emoji emoji-id="5440539497383087970">🥇</tg-emoji>',
        juara2: '<tg-emoji emoji-id="5447203607294265305">🥈</tg-emoji>',
        juara3: '<tg-emoji emoji-id="5453902265922376865">🥉</tg-emoji>',
        id: '<tg-emoji emoji-id="5363858422590619939">📱</tg-emoji>',
        user: '<tg-emoji emoji-id="5197269100878907942">✍️</tg-emoji>',
        coin: '<tg-emoji emoji-id="5199552030615558774">🪙</tg-emoji>',
        cart: '<tg-emoji emoji-id="5312361253610475399">🛒</tg-emoji>',
        uang: '<tg-emoji emoji-id="5879991085001871624">💵</tg-emoji>',
        garis: '<tg-emoji emoji-id="5413382711228259707">➖</tg-emoji>'
    };

    const textTop = `
<blockquote>${e.piala} LEADERBOARD TOP PENGGUNA</blockquote>
Tingkatkan terus transaksi Anda dan jadilah Top Pengguna di bot kami!
${e.garis.repeat(10)}
<blockquote>${e.juara1} TOP 1 (Sultan)
└ ${e.id} ID: <code>${top1.id}</code>
└ ${e.user} Username: ${top1.name}
└ ${e.coin} Coin: ${top1.saldo.toLocaleString('id-ID')} Coin
└ ${e.cart} Transaksi: ${top1.trx}x Pembelian
└ ${e.uang} Total Belanja: ${top1.total.toLocaleString('id-ID')} Coin</blockquote>
${e.garis.repeat(10)}
<blockquote>${e.juara2} TOP 2 (Juragan)
└ ${e.id} ID: <code>${top2.id}</code>
└ ${e.user} Username: ${top2.name}
└ ${e.coin} Coin: ${top2.saldo.toLocaleString('id-ID')} Coin
└ ${e.cart} Transaksi: ${top2.trx}x Pembelian
└ ${e.uang} Total Belanja: ${top2.total.toLocaleString('id-ID')} Coin</blockquote>
${e.garis.repeat(10)}
<blockquote>${e.juara3} TOP 3 (Jawara)
└ ${e.id} ID: <code>${top3.id}</code>
└ ${e.user} Username: ${top3.name}
└ ${e.coin} Coin: ${top3.saldo.toLocaleString('id-ID')} Coin
└ ${e.cart} Transaksi: ${top3.trx}x Pembelian
└ ${e.uang} Total Belanja: ${top3.total.toLocaleString('id-ID')} Coin</blockquote>
`.trim();

    return ctx.editMessageCaption(textTop, { parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "Kembali", callback_data: "back_to_main_menu", icon_custom_emoji_id: "5258236805890710909" }]] } }).catch(err => {
        return ctx.editMessageText(textTop, { parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "Kembali", callback_data: "back_to_main_menu", icon_custom_emoji_id: "5258236805890710909" }]] } }).catch(()=> {});
    });
});

bot.action("cek_join", async (ctx) => {
    const missingChannels = await getMissingChannels(ctx);
    
    if (missingChannels.length > 0) {
        return ctx.answerCbQuery(`❌ Kamu masih belum join ${missingChannels.length} channel lagi! Cek tombol diatas.`, { show_alert: true });
    }

    await ctx.answerCbQuery('✅ Verifikasi berhasil! Terima kasih sudah join.');
    try { await ctx.deleteMessage(); } catch(e){}

    const userId = ctx.from.id;
    global.subCache[userId] = Date.now(); // SET CACHE KE DETIK INI JUGA

    // ==========================================
    // 🎨 KAMUS EMOJI PREMIUM (TARUH DI ATAS SINI BIAR AMAN)
    // ==========================================
    const e = {
        party: '<tg-emoji emoji-id="5215628200578655810">🎉</tg-emoji>',
        juara1: '<tg-emoji emoji-id="5440539497383087970">🥇</tg-emoji>',
        juara2: '<tg-emoji emoji-id="5447203607294265305">🥈</tg-emoji>',
        juara3: '<tg-emoji emoji-id="5453902265922376865">🥉</tg-emoji>',
        kunci: '<tg-emoji emoji-id="5330115548900501467">🔑</tg-emoji>',
        gold: '<tg-emoji emoji-id="5952066863931331270">⭐️</tg-emoji>',
        friend: '<tg-emoji emoji-id="5458789419014182183">👤</tg-emoji>',
        piala: '<tg-emoji emoji-id="5226431245918942763">🏆</tg-emoji>',
        hadiah: '<tg-emoji emoji-id="5203996991054432397">🎁</tg-emoji>',
        id: '<tg-emoji emoji-id="5334815750655849990">🆔</tg-emoji>',
        uang: '<tg-emoji emoji-id="5952066863931331270">⭐️</tg-emoji>',
        karung: '<tg-emoji emoji-id="5278467510604160626">💰</tg-emoji>',
        garis: '<tg-emoji emoji-id="5413382711228259707">➖</tg-emoji>'
    };
    
    if (pendingStartArgs[userId]) {
        const arg = pendingStartArgs[userId];
        delete pendingStartArgs[userId]; 

        // ===== 1. LOGIC REDEEM VOUCHER & DANA KAGET =====
        if (arg.startsWith("redeem_")) {
            const kode = arg.replace("redeem_", "").toUpperCase();
            global.redeemLock = global.redeemLock || new Set();
            if (global.redeemLock.has(userId)) return;
            global.redeemLock.add(userId);

            try {
                const vouchers = loadVouchers();
                if (!vouchers[kode]) return ctx.reply("❌ Akses diberikan, tapi Kode voucher/GA tidak ditemukan/salah.", {parse_mode:"HTML"});
                if (vouchers[kode].kuota <= 0) return ctx.reply("❌ Akses diberikan, tapi kuota hadiah sudah habis.", {parse_mode:"HTML"});
                
                const hasClaimed = vouchers[kode].claimedBy.some(c => c === userId || (typeof c === 'object' && c.id === userId));
                if (hasClaimed) return ctx.reply("❌ Akses diberikan. Kamu sudah pernah klaim hadiah ini!", {parse_mode:"HTML"});

                const users = loadUsers();
                const userIndex = users.findIndex(u => u.id === userId);
                
                if (userIndex === -1) {
                    return ctx.reply("✅ <b>Akses Diberikan!</b>\n\nKarena kamu pengguna baru, silakan ketik /start atau klik linknya sekali lagi untuk mengaktifkan akun & menerima coin.", { parse_mode: "HTML" });
                }

                // LOGIC PEMBAGIAN DANA KAGET / VOUCHER BIASA
                let dapatCoin = 0;
                if (vouchers[kode].type === "ga") {
                    if (vouchers[kode].kuota === 1) {
                        dapatCoin = vouchers[kode].remaining_pool; 
                    } else {
                        const rata2 = Math.floor(vouchers[kode].remaining_pool / vouchers[kode].kuota);
                        const min = Math.floor(rata2 * 0.4) || 1; 
                        const max = Math.floor(rata2 * 1.6);
                        dapatCoin = Math.floor(Math.random() * (max - min + 1)) + min;
                    }
                    vouchers[kode].remaining_pool -= dapatCoin;
                } else {
                    dapatCoin = vouchers[kode].nominal;
                }

                users[userIndex].balance = (users[userIndex].balance || 0) + dapatCoin;
                vouchers[kode].kuota -= 1;
                
                vouchers[kode].claimedBy.push({
                    id: userId,
                    name: ctx.from.first_name + (ctx.from.last_name ? ' ' + ctx.from.last_name : ''),
                    username: ctx.from.username || null,
                    amount: dapatCoin
                });
                
                saveUsers(users); 
                saveVouchers(vouchers);

                // AUTO KIRIM LIST KE CHANNEL KALAU DANA KAGET HABIS
                if (vouchers[kode].type === "ga" && vouchers[kode].kuota === 0) {
                    const sortedWinners = [...vouchers[kode].claimedBy].sort((a, b) => b.amount - a.amount);
                    
                    let listText = `<blockquote>${e.party} <b>DANA KAGET TELAH HABIS!</b></blockquote>\n▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰\n`;
                    listText += `${e.kunci} <b>Kode:</b> <code>${kode}</code>\n`;
                    listText += `${e.gold} <b>Total Dibagikan:</b> ${vouchers[kode].total_pool.toLocaleString('id-ID')} Coin\n`;
                    listText += `${e.friend} <b>Total Pemenang:</b> ${sortedWinners.length} Orang\n▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰\n\n`;
                    listText += `${e.piala} <b>DAFTAR PEMENANG:</b>\n`;
                    
                    sortedWinners.forEach((w, i) => {
                        const uname = w.username ? `@${w.username}` : "Tidak ada";
                        let medali = "🏅"; 
                        if (i === 0) medali = e.juara1;
                        else if (i === 1) medali = e.juara2;
                        else if (i === 2) medali = e.juara3;

                        listText += `<b>${medali} ${escapeHTML(w.name)}</b>\n`;
                        listText += `└ ${e.id} <code>${w.id}</code> | ${e.friend} ${uname}\n`;
                        listText += `└ ${e.hadiah} <b>Mendapat: ${w.amount.toLocaleString('id-ID')} Coin</b>\n\n`;
                    });
                    
                    listText += `<i>Nantikan Dana Kaget selanjutnya hanya di channel ini!</i>`;
                    ctx.telegram.sendMessage(config.channelIdDaget, listText, { parse_mode: "HTML" }).catch(()=>{});
                }

                // 📝 TAMPILAN BALASAN SUKSES REDEEM (RAPET & PADAT)
                const suksesText = `
<blockquote><b>${e.party} VERIFIKASI & KLAIM SUKSES!</b>
Terima kasih sudah join channel.
Kode <code>${kode}</code> berhasil diproses.</blockquote>
${e.garis.repeat(10)}
<blockquote><b>${e.karung} Coin Bertambah:</b> ${dapatCoin.toLocaleString('id-ID')} Coin
<b>${e.uang} Total Coin Sekarang:</b> ${users[userIndex].balance.toLocaleString('id-ID')} Coin</blockquote>
`.trim();

                return ctx.reply(suksesText, { parse_mode: "HTML" });
            } finally {
                setTimeout(() => global.redeemLock.delete(userId), 2000);
            }
        }
        
        // ===== 2. LOGIC REFERRAL TEMAN =====
        else if (arg.startsWith("ref_")) {
            const inviterId = parseInt(arg.split("_")[1]);
            const users = loadUsers();
            const existingUser = users.find(u => u.id === userId);

            // Cek apakah ini user baru (belum ada di database)
            if (!existingUser) {
                const userName = ctx.from.username || `${ctx.from.first_name}${ctx.from.last_name ? ' ' + ctx.from.last_name : ''}`;
                
                // Tambahkan user baru ke database
                const userToAdd = {
                    id: userId,
                    username: userName,
                    first_name: ctx.from.first_name,
                    last_name: ctx.from.last_name || "",
                    join_date: new Date().toISOString(),
                    total_spent: 0,
                    history: [],
                    balance: 0,
                    referrals: 0, 
                    ref_earnings: 0 
                };
                users.push(userToAdd);
                
                // Berikan bonus ke pengundang
                if (inviterId && inviterId !== userId) {
                    const inviterIndex = users.findIndex(u => u.id === inviterId);
                    if (inviterIndex !== -1) {
                        const bonus = 100000000; // 100 Juta
                        users[inviterIndex].balance = (users[inviterIndex].balance || 0) + bonus;
                        users[inviterIndex].referrals = (users[inviterIndex].referrals || 0) + 1;
                        users[inviterIndex].ref_earnings = (users[inviterIndex].ref_earnings || 0) + bonus;
                        
                        // 📝 NOTIFIKASI KE PENGUNDANG (RAPET & PADAT)
                        const notifInviter = `
<blockquote><b>${e.party} REFERRAL BERHASIL!</b>
Seseorang telah bergabung menggunakan link referral kamu!</blockquote>
${e.garis.repeat(10)}
<blockquote><b>${e.karung} Bonus Masuk:</b> +${bonus.toLocaleString('id-ID')} Coin</blockquote>
`.trim();
                        ctx.telegram.sendMessage(inviterId, notifInviter, { parse_mode: "HTML" }).catch(() => {});
                    }
                }
                saveUsers(users);
                autoBackupDB(ctx, "PENGGUNA BARU (Register)", userDB);
                
                return ctx.reply(`<blockquote><b>${e.party} AKSES DIBERIKAN!</b>\nKamu berhasil mendaftar melalui link referral teman.\n\nSilakan ketik /menu atau /start untuk mulai menggunakan bot.</blockquote>`, { parse_mode: 'HTML' });
            }
        }
    }

    // Balasan default kalau cuma verifikasi grup biasa
    return ctx.reply(`<blockquote><b>${e.party} AKSES DIBERIKAN!</b>\nSilakan ketik /menu atau /start untuk mulai menggunakan bot.</blockquote>`, { parse_mode: 'HTML' });
});

bot.action("back_to_main_menu", async (ctx) => {
  await ctx.answerCbQuery().catch(() => {});
  const text = menuTextBot(ctx);
  const keyboard = {
    inline_keyboard: [
            [
                { 
                  text: "List APK Mod", 
                  callback_data: "buyapk",
                  icon_custom_emoji_id: "5913264639025615311"
                },
               {
                  text: "List Script", 
                  callback_data: "buyscript",
                  icon_custom_emoji_id: "5818955300463447293"
               }
            ],
            [
                { 
                  text: "Claim Harian", 
                  callback_data: "claim_harian",
                  icon_custom_emoji_id: "5449800250032143374"
                },
                { 
                  text: "Spin Gacha", 
                  callback_data: "menu_gacha",
                  icon_custom_emoji_id: "5328247482939890897"
                }
            ],
            [
                { 
                  text: "Referral",
                  callback_data: "menu_referral",
                  icon_custom_emoji_id: "5258362837411045098"
                 },
                { 
                  text: "Kirim Coin", 
                  callback_data: "transfer_coin",
                  icon_custom_emoji_id: "5213170203680060059"
                }
            ],
            [
              { 
                text: "Mystery Box", 
                callback_data: "menu_mystery",
                icon_custom_emoji_id: "5854908544712707500"
              }
            ],
            [
               { 
                 text: "Misi Coin",
                 callback_data: "misi_coin",
                 icon_custom_emoji_id: "5269254848703902904"
               },
               { 
                 text: "Cek Profil", 
                 callback_data: "profile",
                 icon_custom_emoji_id: "5316727448644103237"
               }
            ],
            [
                {
                  text: "Cek Rating", 
                  callback_data: "cek_rating",
                  icon_custom_emoji_id: "5469744063815102906"
                },
                {
                  text: "Top Pengguna", 
                  callback_data: "top_users",
                  icon_custom_emoji_id: "5368617177635107810"
                }
            ],
            [
               { 
                 text: "Cs / Tiket Bantuan", 
                 callback_data: "cs_ai_start",
                 icon_custom_emoji_id: "5238025132177369293"
               }
           ]
          ]
  };

  try {
    // Langsung edit jadi teks biasa tanpa media gambar
    await ctx.editMessageText(text, { parse_mode: "HTML", reply_markup: keyboard });
  } catch (err) {
    // Fallback: Kalau user ngeklik 'Back' dari pesan lama yang masih ada fotonya,
    // hapus foto lamanya dan kirim menu teks baru biar rapi
    await ctx.deleteMessage().catch(() => {});
    await ctx.reply(text, { parse_mode: "HTML", reply_markup: keyboard }).catch(() => {});
  }
});
    
bot.action("katalog", async (ctx) => {
  await ctx.answerCbQuery().catch(() => {});
  if (global.helpPhotos && global.helpPhotos[ctx.from.id]) {
      try { await ctx.telegram.deleteMessage(ctx.chat.id, global.helpPhotos[ctx.from.id]); } catch (e) {}
      delete global.helpPhotos[ctx.from.id];
  }

  const storeMenuKeyboard = {
    inline_keyboard: [
      [{ text: "🗂 List Script", callback_data: "buyscript" }],
      [{ text: "Kembali", callback_data: "back_to_main_menu", icon_custom_emoji_id: "5210952531676504517" }]
    ]
  };

  if (isOwner(ctx)) {
      storeMenuKeyboard.inline_keyboard.splice(-1, 0, [
          { text: "⚙️ Pengaturan Fitur (Owner)", callback_data: "admin_features" }
      ]);
  }

  const captionText = `<blockquote>🛍️ 𝗗𝗔𝗙𝗧𝗔𝗥 𝗠𝗘𝗡𝗨 𝗟𝗔𝗬𝗔𝗡𝗔𝗡 𝗕𝗢𝗧\n▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰\nPilih kategori produk yang ingin dibeli:</blockquote>`;

  try {
    await ctx.editMessageMedia({ type: "photo", media: config.menuImage, caption: captionText, parse_mode: "HTML" }, { reply_markup: storeMenuKeyboard });
  } catch (err) {
    if (err.description?.includes("there is no media in the message") || err.description?.includes("message to edit not found")) {
        await ctx.deleteMessage().catch(() => {});
        await ctx.replyWithPhoto(config.menuImage, { caption: captionText, parse_mode: "HTML", reply_markup: storeMenuKeyboard }).catch(() => {});
    }
  }
});

bot.action("informasi_admin", async (ctx) => {
  await ctx.answerCbQuery().catch(() => {});
  const storeMenuKeyboard = {
    inline_keyboard: [
      [{ text: "👤 Cek Profil", callback_data: "profile" }, { text: "📮 Cek History", callback_data: "history" }],
      [{ text: "🤝 CODE REFERRAL", callback_data: "menu_referral" }],
      [{ text: "↩️ 𝐁𝐀𝐂𝐊", callback_data: "back_to_main_menu" }]
    ]
  };
  const captionText = `<blockquote>👤 <b>INFORMASI AKUN & AKTIVITAS</b></blockquote>\n▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰\nPusat informasi untuk memantau detail akun, riwayat transaksi, dan program afiliasi (referral) kamu.\n\n<b>📝 Detail Menu:</b>\n• <b>Cek Profil:</b> Lihat detail ID, sisa coin, dan statistik akun.\n• <b>Cek History:</b> Pantau riwayat pembelian dan transaksi terakhir.\n• <b>Code Referral:</b> Dapatkan coin gratis dengan membagikan link!\n\n👇 <i>Silakan pilih menu di bawah ini:</i>`.trim();

  try {
    await ctx.editMessageMedia({ type: "photo", media: config.menuImage, caption: captionText, parse_mode: "HTML" }, { reply_markup: storeMenuKeyboard });
  } catch (err) {
    if (err.description?.includes("there is no media in the message") || err.description?.includes("message to edit not found")) {
        await ctx.deleteMessage().catch(() => {});
        await ctx.replyWithPhoto(config.menuImage, { caption: captionText, parse_mode: "HTML", reply_markup: storeMenuKeyboard }).catch(() => {});
    }
  }
});

bot.action("cs_ai_start", async (ctx) => {
    await ctx.answerCbQuery().catch(() => {});
    const fromId = ctx.from.id;
    pendingCsChat[fromId] = true; 
    
        const e = {
        panah: '<tg-emoji emoji-id="5406745015365943482">⬇️</tg-emoji>',
        pin: '<tg-emoji emoji-id="5397782960512444700">📌</tg-emoji>',
        hedset: '<tg-emoji emoji-id="6026119856825307273">🎧</tg-emoji>',
        jam: '<tg-emoji emoji-id="5803446706133537518">⌛</tg-emoji>'
    };
    
    // ===== AUTO TIMEOUT 1 MENIT =====
    global.csTimeouts = global.csTimeouts || {};
    if (global.csTimeouts[fromId]) clearTimeout(global.csTimeouts[fromId]);
    global.csTimeouts[fromId] = setTimeout(() => {
        if (pendingCsChat[fromId]) {
            delete pendingCsChat[fromId]; // Batalkan sesi
            
            // Pesan timeout dirapihin pakai blockquote juga
            const timeoutText = `
<blockquote><b>${e.jam} SESI CS BERAKHIR (TIMEOUT)</b></blockquote>
Karena tidak ada aktivitas atau pesan selama 1 menit, sesi Tiket Bantuan otomatis ditutup.

<i>Silakan buka menu CS lagi jika masih butuh bantuan.</i>
`.trim();

            ctx.telegram.sendMessage(fromId, timeoutText, { parse_mode: "HTML" }).catch(()=>{});
        }
    }, 60000); // 60.000 ms = 1 Menit


    // 📝 RAKIT TEKS DENGAN DOUBLE BLOCKQUOTE
    const text = `
<blockquote><b>${e.hedset} LIVE CHAT / TIKET BANTUAN</b></blockquote>
Halo! Ada yang bisa kami bantu?

Silakan ketik keluhan, pertanyaan, atau kirim foto/video bukti dengan cara <b>membalas pesan ini</b>.

<blockquote><b>${e.pin} INFORMASI PENTING</b>
• Pesanmu akan langsung diteruskan ke Admin.
• Waktu kamu <b>1 Menit</b> (Otomatis batal jika tidak ada pesan).</blockquote>

${e.panah} <i>Kirim pesanmu sekarang di bawah...</i>
`.trim();

    // Tombol danger lu udah aman di sini
    const keyboard = { 
        inline_keyboard: [
            [{ text: "Akhiri Sesi Chat", callback_data: "cs_ai_stop", icon_custom_emoji_id: "5260293700088511294", style: "danger" }]
        ] 
    };

    try {
        await ctx.editMessageText(text, { parse_mode: "HTML", reply_markup: keyboard });
    } catch (err) {
        // Fallback jika menu sebelumnya ada foto
        await ctx.deleteMessage().catch(() => {});
        await ctx.reply(text, { parse_mode: "HTML", reply_markup: keyboard }).catch(() => {});
    }
});

bot.action("cs_ai_stop", async (ctx) => {
    await ctx.answerCbQuery().catch(() => {});
    const fromId = ctx.from.id;
    delete pendingCsChat[fromId]; 
    
    // ===== HAPUS TIMER KARENA SUDAH BERHENTI MANUAL =====
    if (global.csTimeouts && global.csTimeouts[fromId]) {
        clearTimeout(global.csTimeouts[fromId]);
        delete global.csTimeouts[fromId];
    }
    // ====================================================
    
    const text = menuTextBot(ctx);
    const keyboard = {
        inline_keyboard: [
            [
                { 
                  text: "List APK Mod", 
                  callback_data: "buyapk",
                  icon_custom_emoji_id: "5913264639025615311"
                },
               {
                  text: "List Script", 
                  callback_data: "buyscript",
                  icon_custom_emoji_id: "5818955300463447293"
               }
            ],
            [
                { 
                  text: "Claim Harian", 
                  callback_data: "claim_harian",
                  icon_custom_emoji_id: "5449800250032143374"
                },
                { 
                  text: "Spin Gacha", 
                  callback_data: "menu_gacha",
                  icon_custom_emoji_id: "5328247482939890897"
                }
            ],
            [
                { 
                  text: "Referral",
                  callback_data: "menu_referral",
                  icon_custom_emoji_id: "5258362837411045098"
                 },
                { 
                  text: "Kirim Coin", 
                  callback_data: "transfer_coin",
                  icon_custom_emoji_id: "5213170203680060059"
                }
            ],
            [
              { 
                text: "Mystery Box", 
                callback_data: "menu_mystery",
                icon_custom_emoji_id: "5854908544712707500"
              }
            ],
            [
               { 
                 text: "Misi Coin",
                 callback_data: "misi_coin",
                 icon_custom_emoji_id: "5269254848703902904"
               },
               { 
                 text: "Cek Profil", 
                 callback_data: "profile",
                 icon_custom_emoji_id: "5316727448644103237"
               }
            ],
            [
                {
                  text: "Cek Rating", 
                  callback_data: "cek_rating",
                  icon_custom_emoji_id: "5469744063815102906"
                },
                {
                  text: "Top Pengguna", 
                  callback_data: "top_users",
                  icon_custom_emoji_id: "5368617177635107810"
                }
            ],
            [
               { 
                 text: "Cs / Tiket Bantuan", 
                 callback_data: "cs_ai_start",
                 icon_custom_emoji_id: "5238025132177369293"
               }
           ]
        ]
    };

    try {
        await ctx.editMessageText(text, { parse_mode: "HTML", reply_markup: keyboard });
    } catch (err) {
        // Fallback jika menu sebelumnya ada foto
        await ctx.deleteMessage().catch(() => {});
        await ctx.reply(text, { parse_mode: "HTML", reply_markup: keyboard }).catch(() => {});
    }
});

bot.action("menu_referral", async (ctx) => {
    await ctx.answerCbQuery().catch(() => {});
    const fromId = ctx.from.id;
    const users = loadUsers();
    const myUser = users.find(u => u.id === fromId);

    const myRefs = myUser ? (myUser.referrals || 0) : 0;
    const myEarnings = myUser ? (myUser.ref_earnings || 0) : 0;
    const refLink = `https://t.me/${config.botUsername}?start=ref_${fromId}`;

    // ==========================================
    // 🎨 KAMUS EMOJI PREMIUM
    // ==========================================
    const e = {
        beruang: '<tg-emoji emoji-id="5206502842478638898">🧸</tg-emoji>',
        kado: '<tg-emoji emoji-id="5449800250032143374">🎁</tg-emoji>',
        link: '<tg-emoji emoji-id="5271604874419647061">🔗</tg-emoji>',
        statistik: '<tg-emoji emoji-id="5231200819986047254">📊</tg-emoji>',
        user: '<tg-emoji emoji-id="5258362837411045098">👤</tg-emoji>',
        uang: '<tg-emoji emoji-id="5375312095346704820">💰</tg-emoji>'
    };

    const referralKeyboard = {
        inline_keyboard: [
            [{ text: "Kembali", callback_data: "back_to_main_menu", icon_custom_emoji_id: "5258236805890710909", style: "danger" }]
        ]
    };

// 📝 TAMPILAN DIRAPIHIN + SYARAT PENGGUNA BARU
    const text = `
<blockquote><b>${e.beruang} PROGRAM REFERRAL</b>
Ajak teman yang <b>belum pernah</b> menggunakan bot ini dan dapatkan <b>Coin Gratis</b> dari setiap undangannya!</blockquote>
<blockquote><b>${e.kado} BONUS REWARD</b>
• Reward : <b>100.000.000 Coin</b>
• Sistem : <i>Otomatis masuk ke saldo kamu</i>
• Syarat : <b>Hanya untuk Pengguna Baru bot</b></blockquote>
<blockquote><b>${e.link} LINK REFERRAL KAMU</b>
<code>${refLink}</code>
<i>Tap / tekan lama untuk menyalin link</i></blockquote>
<blockquote><b>${e.statistik} STATISTIK REFERRAL</b>
${e.user} Teman Bergabung : <b>${myRefs} Orang</b>
${e.uang} Total Pendapatan : <b>${myEarnings.toLocaleString("id-ID")} Coin</b></blockquote>
`.trim();

    try {
        await ctx.editMessageText(text, { parse_mode: "HTML", reply_markup: referralKeyboard });
    } catch (err) {
        await ctx.deleteMessage().catch(() => {});
        await ctx.reply(text, { parse_mode: "HTML", reply_markup: referralKeyboard }).catch(() => {});
    }
});

bot.action(/userpage_(\d+)/, async (ctx) => {
    const page = parseInt(ctx.match[1]);
    if (!isOwner(ctx)) return ctx.answerCbQuery("❌ Owner Only!", { show_alert: true });
    await sendUserPage(ctx, page);
});

// ===== GET SCRIPT DETAIL =====
bot.action(/getscript_detail\|(\d+)/, async (ctx) => {
    await ctx.answerCbQuery().catch(() => {});
    if (!isOwner(ctx)) return ctx.answerCbQuery('❌ Owner Only!');
    const index = Number(ctx.match[1]);

    const scripts = loadScripts();
    const s = scripts[index];
    if (!s) return ctx.editMessageText("❌ Script tidak ditemukan.");

    const detailText = `📋 <b>DETAIL SCRIPT</b>\n\n📦 <b>Nama:</b> ${escapeHTML(s.name)}\n💰 <b>Harga:</b> ${formatCoin(s.price)} Coin\n📁 <b>File:</b> ${escapeHTML(s.file_name || s.file || "Cloud Telegram")}\n📅 <b>Ditambahkan:</b> ${new Date(s.added_date).toLocaleDateString('id-ID')}\n\n📝 <b>Deskripsi:</b>\n${escapeHTML(s.desk || "-")}`;

    return ctx.editMessageText(detailText, {
        parse_mode: "HTML",
        reply_markup: {
            inline_keyboard: [
                [{ text: "📤 Download Script", callback_data: `download_script|${index}` }, { text: "🗑️ Hapus Script", callback_data: `del_script|${s.name}` }],
                [{ text: "↩️ Back ke List Script", callback_data: "back_to_script_list" }]
            ]
        }
    });
});

// ===== DOWNLOAD SCRIPT (OWNER) =====
bot.action(/download_script\|(\d+)/, async (ctx) => {
    await ctx.answerCbQuery().catch(() => {});
    if (!isOwner(ctx)) return ctx.answerCbQuery('❌ Owner Only!');
    const index = Number(ctx.match[1]);

    const scripts = loadScripts();
    const s = scripts[index];
    if (!s) return ctx.reply("❌ Script tidak ditemukan.");

    const fileToSend = s.file_id || s.file; // Mendukung script lama & baru
    if (!fileToSend) return ctx.reply("❌ File tidak ditemukan di server/cloud.");

    return ctx.replyWithDocument(fileToSend, { caption: `📂 Script: ${escapeHTML(s.name)}`, parse_mode: "HTML" }).catch(() => {
        ctx.reply("❌ Gagal mengambil file dari Cloud Telegram.");
    });
});

// ===== BACK TO SCRIPT LIST =====
bot.action("back_to_script_list", async (ctx) => {
    await ctx.answerCbQuery().catch(() => {});
    if (!isOwner(ctx)) return ctx.answerCbQuery('❌ Owner Only!');
    await sendGetScriptPage(ctx, 0);
});

// ===== DELETE SCRIPT =====
bot.action(/del_script\|(.+)/, async (ctx) => {
    await ctx.answerCbQuery().catch(() => {});
    if (!isOwner(ctx)) return ctx.answerCbQuery('❌ Owner Only!');
    const name = ctx.match[1];

    let scripts = loadScripts();
    const sc = scripts.find(s => s.name === name);
    if (!sc) return ctx.editMessageText("❌ Tidak ditemukan.");

    // Hapus script dari database (Tidak perlu hapus file lokal lagi)
    scripts = scripts.filter(s => s.name !== name);
    saveScripts(scripts);

    return ctx.editMessageText(`✅ Script <b>${escapeHTML(name)}</b> berhasil dihapus dari database.`, { parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "↩️ Kembali ke List Script", callback_data: "back_to_script_list" }]] } });
});

bot.action(/^script\|(.+)/, async (ctx) => {
    await ctx.answerCbQuery().catch(() => {});
    const name = ctx.match[1];
    const scripts = loadScripts();
    const sc = scripts.find(s => s.name === name);
    const now = new Date();
    const waktu = now.toLocaleString("id-ID", { weekday: "long", day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" }).replace(".", ":");

    if (!sc) return ctx.reply("❌ Script tidak ditemukan.");

    const text = `<blockquote><b>📝 Konfirmasi Pemesanan</b></blockquote>\n━━━━━━━━━━━━━━━━━\n📦 Produk: Script ${escapeHTML(sc.name)}\n\n💰 Harga: ${Number(sc.price).toLocaleString("id-ID")} Coin\n🕒 Waktu: ${waktu}\n━━━━━━━━━━━━━━━━━\n<blockquote><b>📝 Deskripsi:</b></blockquote>\n${escapeHTML(sc.desk || "-")}\n━━━━━━━━━━━━━━━━━\n⚠️ Apakah Anda yakin ingin melanjutkan pembayaran?`.trim();

    await ctx.editMessageText(text, {
        parse_mode: "HTML",
        reply_markup: {
            inline_keyboard: [[{ text: "✅ Konfirmasi", callback_data: `confirm_script|${sc.name}` }, { text: "❌ Batalkan", callback_data: "back_to_script" }]]
        }
    });
});

// ===== OPSI PEMBAYARAN SCRIPT (DENGAN DISKON) =====
bot.action(/confirm_script\|(.+)/, async (ctx) => {
    await ctx.answerCbQuery().catch(() => {});
    const name = ctx.match[1];
    const userId = ctx.from.id;

    const scripts = loadScripts();
    const sc = scripts.find(s => s.name === name);
    if (!sc) return ctx.reply("❌ Script tidak ditemukan.");

    const harga = getDiscountPrice(userId, sc.price);
    const users = loadUsers();
    const user = users.find(u => u.id === userId);
    const saldo = user ? (user.balance || 0) : 0;

    let teksHarga = `💰 <b>Harga Normal:</b> ${sc.price.toLocaleString('id-ID')} Coin`;
    if (harga.diskonPersen > 0) {
        teksHarga = `💰 <b>Harga Normal:</b> <s>${sc.price.toLocaleString('id-ID')} Coin</s>\n🏷 <b>Diskon ${harga.roleName} (${harga.diskonPersen}%):</b> -${harga.potongan.toLocaleString('id-ID')} Coin\n💳 <b>Harga Akhir: ${harga.finalPrice.toLocaleString('id-ID')} Coin</b>`;
    }

    return ctx.editMessageText(
        `🛒 <b>Pilih Metode Pembayaran</b>\n\n📦 Produk: Script ${escapeHTML(sc.name)}\n${teksHarga}\n\n🪙 Coin Anda: ${saldo.toLocaleString('id-ID')} Coin`, 
        {
            parse_mode: "html",
            reply_markup: {
                inline_keyboard: [[{ text: `💰 Bayar via Coin (${harga.finalPrice.toLocaleString('id-ID')} Coin)`, callback_data: `pay_coin_script|${sc.name}` }], [{ text: "❌ Batalkan", callback_data: "back_to_script" }]]
            }
        }
    ).catch(err => console.log("Gagal edit pesan:", err));
});

// ===== BAYAR SCRIPT VIA COIN =====
bot.action(/pay_coin_script\|(.+)/, async (ctx) => {
    await ctx.answerCbQuery().catch(() => {});
    await ctx.editMessageText("<blockquote><b>⏳ <i>Sedang memastikan coin Anda cukup dan menyiapkan file...</i></b></blockquote>", { parse_mode: "HTML" }).catch(() => {});
    await new Promise(resolve => setTimeout(resolve, 1500)); 

    const name = ctx.match[1];
    const userId = ctx.from.id;

    const scripts = loadScripts();
    const sc = scripts.find(s => s.name === name);
    if (!sc) return ctx.editMessageText("❌ Script tidak ditemukan.", { parse_mode: "HTML" }).catch(()=>{});

    const harga = getDiscountPrice(userId, sc.price);
    const price = harga.finalPrice;

    const users = loadUsers();
    const userIndex = users.findIndex(u => u.id === userId);
    users[userIndex].balance = users[userIndex].balance || 0;
    
    if (users[userIndex].balance < price) {
        return ctx.editMessageText(`❌ <b>Coin tidak cukup!</b>\nCoin Anda: ${(users[userIndex].balance || 0).toLocaleString('id-ID')} Coin\nHarga Final: ${price.toLocaleString('id-ID')} Coin\n\nSilakan Topup / Menangkan Coin terlebih dahulu.`, { parse_mode: "HTML" }).catch(()=>{});
    }

    users[userIndex].balance -= price;
    users[userIndex].total_spent = (users[userIndex].total_spent || 0) + price;
    users[userIndex].history = users[userIndex].history || [];
    users[userIndex].history.push({ product: `Script: ${sc.name}`, amount: price, type: "script", details: sc.desk || "-", timestamp: new Date().toISOString() });
    saveUsers(users);

    const buyerInfo = { id: userId, name: ctx.from.first_name + (ctx.from.last_name ? ' ' + ctx.from.last_name : ''), username: ctx.from.username, totalSpent: users[userIndex].total_spent };
    await notifyOwner(ctx, { type: "script", name: sc.name, amount: price }, buyerInfo);

    // 🔥 UBAH BAGIAN INI: Kirim langsung ke userId (PM)
    try {
        const fileToSend = sc.file_id || sc.file; // Ambil File ID dari Cloud
        await ctx.telegram.sendDocument(userId, fileToSend, { caption: `📁 Script: ${escapeHTML(sc.name)}\n🎉 <i>Terima kasih telah menggunakan diskon ${harga.roleName}!</i>`, parse_mode: "html" });

        await ctx.editMessageText(`<blockquote><b>✅ Pembelian via Coin Berhasil!</b></blockquote>\n\n📦 Produk: Script ${escapeHTML(sc.name)}\n💰 Harga Dibayar: ${price.toLocaleString('id-ID')} Coin <i>(Diskon ${harga.diskonPersen}%)</i>\n💳 Sisa Coin: ${users[userIndex].balance.toLocaleString('id-ID')} Coin\n\n<i>✅ File Script telah berhasil dikirim ke <b>Pesan Pribadi (PM)</b> kamu! Silakan cek chat bot.</i>`, { parse_mode: "html" }).catch(()=>{});
    } catch (err) {
        await ctx.editMessageText(`<blockquote><b>⚠️ Gagal Mengirim File ke PM!</b></blockquote>\n\nPembelian berhasil, namun bot gagal mengirim file ke Pesan Pribadi kamu karena kamu belum pernah Chat bot ini secara langsung.\n\nSilakan PM bot dan hubungi Admin untuk mengambil file kamu.`, { parse_mode: "html" }).catch(()=>{});
    }
});

bot.action("back_to_script", async (ctx) => {
    await ctx.answerCbQuery().catch(() => {});
    await renderScriptPage(ctx, 0); 
});

bot.action("cek_rating", async (ctx) => {
    await ctx.answerCbQuery().catch(() => {});
    await renderRatingPage(ctx, 0);
});

bot.action(/rating_page\|(\d+)/, async (ctx) => {
    await ctx.answerCbQuery().catch(() => {});
    const page = parseInt(ctx.match[1]);
    await renderRatingPage(ctx, page); 
});

// Fungsi untuk menjalankan broadcast
async function startBroadcast(ctx, users, message, hasPhoto, photoFileId, statusMessageId) {
    const totalUsers = users.length;
    let successCount = 0; let failedCount = 0;
    const failedUsers = []; const startTime = Date.now();

    for (let i = 0; i < users.length; i++) {
        const userId = users[i].id;

        try {
            if (hasPhoto && photoFileId) {
                await ctx.telegram.sendPhoto(userId, photoFileId, { caption: message, parse_mode: "html" });
            } else {
                await ctx.telegram.sendMessage(userId, message, { parse_mode: "html" });
            }
            successCount++;
        } catch (error) {
            console.error(`Gagal kirim ke user ${userId}:`, error.message);
            failedCount++; failedUsers.push(userId);
        }

        if ((i + 1) % 5 === 0 || i === users.length - 1) {
            try {
                await ctx.telegram.editMessageText(
                    ctx.chat.id, statusMessageId, null,
                    `🚀 *BROADCAST BERJALAN*\n\n📊 Total User: ${totalUsers}\n✅ Berhasil: ${successCount}\n❌ Gagal: ${failedCount}\n⏳ Progress: ${i + 1}/${totalUsers} (${Math.round((i + 1) / totalUsers * 100)}%)\n⏱️ Waktu: ${Math.floor((Date.now() - startTime) / 1000)} detik`,
                    { parse_mode: "html" }
                );
            } catch (updateError) { console.error("Gagal update progress:", updateError.message); }

            if (i < users.length - 1) { await new Promise(resolve => setTimeout(resolve, 500)); }
        }
    }

    const duration = Math.floor((Date.now() - startTime) / 1000);
    const finalText = `✅ <b>BROADCAST SELESAI</b>\n\n📊 Total User: ${totalUsers}\n✅ Berhasil dikirim: ${successCount}\n❌ Gagal dikirim: ${failedCount}\n⏱️ Waktu eksekusi: ${duration} detik\n📈 Success Rate: ${totalUsers > 0 ? Math.round((successCount / totalUsers) * 100) : 0}%\n\n` +
        (failedCount > 0 ? `⚠️ ${failedCount} user gagal menerima pesan\n(Mungkin memblokir bot atau chat tidak ditemukan)` : `✨ Semua user berhasil menerima pesan!`);

    try {
        await ctx.telegram.editMessageText(ctx.chat.id, statusMessageId, null, finalText, { parse_mode: "html" });
    } catch (error) {
        await ctx.reply(finalText, { parse_mode: "html" });
    }
}

return bot;
};

// ===== HOT RELOAD =====
let file = require.resolve(__filename);
fs.watchFile(file, () => {
    fs.unwatchFile(file);
    delete require.cache[file];
    require(file);
});


