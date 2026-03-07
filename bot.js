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

    const text = `<blockquote>🀄 <b>MAHJONG WAYS (SLOT KASINO)</b></blockquote>\n━━━━━━━━━━━━━━━━━━━━━━━━━\nAtur jumlah taruhanmu dan putar mesinnya! Hadiah dihitung berdasarkan perkalian taruhan (Bet).\n\n💵 <b>Taruhan (Bet) Saat Ini:</b> ${currentBet.toLocaleString('id-ID')} Coin\n\n<b>🏆 Daftar Perkalian (Multiplier):</b>\n✨ ✨ ✨ = <b>SCATTER JACKPOT (x50)</b>\n🐉 🐉 🐉 = <b>BIG WIN (x10)</b>\n🀄 🀄 🀄 = <b>MEGA WIN (x5)</b>\n🎋 🎋 🎋 = <b>SUPER WIN (x2)</b>\n🀣 🀣 🀣 = <b>BALIK MODAL (x1)</b>\n💔 💀 📉 = <b>ZONK (Koin Hangus)</b>\n━━━━━━━━━━━━━━━━━━━━━━━━━\n🪙 <b>Sisa Coin Kamu:</b> ${saldo.toLocaleString('id-ID')} Coin`;

    const keyboard = {
        inline_keyboard: [
            [
                { text: "➖ Turunkan Bet", callback_data: "bet_down" },
                { text: "➕ Naikkan Bet", callback_data: "bet_up" }
            ],
            [{ text: `🎰 SPIN MAHJONG (Bet: ${formatCoin(currentBet)})`, callback_data: "play_gacha" }],
            [{ text: "↩️ 𝗕𝗔𝗖𝗞", callback_data: "back_to_main_menu" }]
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

// ===== MESIN HALAMAN KATALOG APK MOD =====
async function renderApkPage(ctx, page) {
    const apksList = loadApks();
    if (!apksList.length) {
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

    const navRow = [];
    if (page > 0) navRow.push({ text: "⬅️ PREV", callback_data: `apk_page|${page - 1}` });
    navRow.push({ text: `Hal ${page + 1}/${totalPages}`, callback_data: "ignore" });
    if (page < totalPages - 1) navRow.push({ text: "NEXT ➡️", callback_data: `apk_page|${page + 1}` });

    buttons.push(navRow);
    buttons.push([{ text: "↩️ 𝗕𝗔𝗖𝗞", callback_data: "back_to_main_menu" }]);

    const text = `<blockquote>📱 <b>KATALOG APK MOD & APLIKASI</b></blockquote>\n\nTotal ada <b>${totalItems} Produk</b> di etalase kami.\nSilakan pilih aplikasi yang ingin dibeli:\n\n<i>*Gunakan tombol Prev/Next untuk melihat halaman lain.</i>`;

    try {
        await ctx.editMessageText(text, { parse_mode: "HTML", reply_markup: { inline_keyboard: buttons } });
    } catch (err) {
        if (err.description && err.description.includes("message is not modified")) return;
        await ctx.deleteMessage().catch(() => {});
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

    const buttons = currentItems.map((s, index) => {
        const absoluteIdx = start + index;
        return [{ text: `📂 ${escapeHTML(s.name)} - ${formatCoin(s.price)} Coin`, callback_data: `getscript_detail|${absoluteIdx}` }];
    });

    const navRow = [];
    if (page > 0) navRow.push({ text: "⬅️ Prev", callback_data: `getscript_page|${page - 1}` });
    if (page < totalPages - 1) navRow.push({ text: "Next ➡️", callback_data: `getscript_page|${page + 1}` });
    
    if (navRow.length > 0) buttons.push(navRow);

    const text = `<b>📦 DAFTAR SCRIPT (Hal ${page + 1}/${totalPages})</b>\n\nPilih Script untuk melihat detail:`;

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
    if (user.role === "distributor") return { name: "Distributor ✅", diskon: 30 };

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
        return ctx.reply("📭 <i>Belum ada script yang dijual saat ini.</i>", { parse_mode: "HTML" }).catch(()=>{});
    }

    const ITEMS_PER_PAGE = 20;
    const totalItems = scriptsList.length;
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

    const startIdx = page * ITEMS_PER_PAGE;
    const endIdx = startIdx + ITEMS_PER_PAGE;
    const currentItems = scriptsList.slice(startIdx, endIdx);

    const buttons = currentItems.map(s => [
        {
            text: `🗂 ${escapeHTML(s.name)} - ${Number(s.price).toLocaleString("id-ID")} Coin`,
            callback_data: `script|${s.name}`
        }
    ]);

    const navRow = [];
    if (page > 0) navRow.push({ text: "⬅️ PREV", callback_data: `script_page|${page - 1}` });
    navRow.push({ text: `Hal ${page + 1}/${totalPages}`, callback_data: "ignore" });
    if (page < totalPages - 1) navRow.push({ text: "NEXT ➡️", callback_data: `script_page|${page + 1}` });

    buttons.push(navRow);
    buttons.push([{ text: "↩️ 𝐁𝐀𝐂𝐊", callback_data: "back_to_main_menu" }]);

    const text = `<blockquote>📦 <b>KATALOG SCRIPT & SOURCE CODE</b></blockquote>\n\nTotal ada <b>${totalItems} Produk</b> di etalase kami.\nSilakan pilih script yang ingin dibeli:\n\n<i>*Gunakan tombol Prev/Next untuk melihat halaman lain.</i>`;

    try {
        await ctx.editMessageText(text, { parse_mode: "HTML", reply_markup: { inline_keyboard: buttons } });
    } catch (err) {
        if (err.description && err.description.includes("message is not modified")) return;
        await ctx.deleteMessage().catch(() => {});
        await ctx.reply(text, { parse_mode: "HTML", reply_markup: { inline_keyboard: buttons } }).catch(() => {});
    }
}

// ===== MESIN HALAMAN RATING (TESTIMONI) =====
async function renderRatingPage(ctx, page) {
    const ratings = loadRatings();
    
    if (!ratings || ratings.length === 0) {
        const emptyText = `<blockquote><b>🌟 ULASAN PENGGUNA</b></blockquote>\n\n📭 <i>Belum ada rating/ulasan dari pengguna. Jadilah yang pertama dengan mengetik:</i>\n<code>${config.prefix}rating 5 Mantap botnya!</code>`;
        try {
            await ctx.editMessageMedia(
                { type: "photo", media: config.menuImage, caption: emptyText, parse_mode: "HTML" },
                { reply_markup: { inline_keyboard: [[{ text: "↩️ 𝐁𝐀𝐂𝐊", callback_data: "back_to_main_menu" }]] } }
            );
        } catch (err) {
            if (err.description && err.description.includes("message is not modified")) return;
            await ctx.deleteMessage().catch(()=>{});
            await ctx.replyWithPhoto(config.menuImage, { caption: emptyText, parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "↩️ 𝐁𝐀𝐂𝐊", callback_data: "back_to_main_menu" }]] } }).catch(()=>{});
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

    let text = `<blockquote><b>🌟 ULASAN PENGGUNA (RATING)</b></blockquote>\n`;
    text += `📊 <b>Rata-rata:</b> ${avgStar} / 5.0 ⭐\n`;
    text += `👥 <b>Total Ulasan:</b> ${ratings.length} Pengguna\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `💡 <b>Cara Memberi Ulasan:</b>\n`;
    text += `Ketik: <code>${config.prefix}rating [angka_bintang] [pesan_ulasan]</code>\n`;
    text += `Contoh: <code>${config.prefix}rating 5 Prosesnya cepet banget!</code>\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    currentItems.forEach((r, i) => {
        const starDraw = "⭐".repeat(r.star);
        const dateStr = new Date(r.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
        text += `👤 <b>${escapeHTML(r.name)}</b> ${r.username !== "-" ? `(@${r.username})` : ""}\n`;
        text += `🗓️ ${dateStr} | ${starDraw}\n`;
        text += `💬 <i>"${escapeHTML(r.text)}"</i>\n`;
        text += `━━━━━━━━━━━━━━━━━━━━━━\n`;
    });

    const navRow = [];
    if (page > 0) navRow.push({ text: "⬅️ PREV", callback_data: `rating_page|${page - 1}` });
    navRow.push({ text: `Hal ${page + 1}/${totalPages}`, callback_data: "ignore" });
    if (page < totalPages - 1) navRow.push({ text: "NEXT ➡️", callback_data: `rating_page|${page + 1}` });

    const keyboard = { inline_keyboard: [navRow, [{ text: "↩️ 𝐁𝐀𝐂𝐊", callback_data: "back_to_main_menu" }]] };

    try {
        await ctx.editMessageMedia(
            { type: "photo", media: config.menuImage, caption: text, parse_mode: "HTML" },
            { reply_markup: keyboard }
        );
    } catch (err) {
        if (err.description && err.description.includes("message is not modified")) return;
        await ctx.deleteMessage().catch(()=>{});
        await ctx.replyWithPhoto(config.menuImage, { caption: text, parse_mode: "HTML", reply_markup: keyboard }).catch(()=>{});
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
  
  const fullName = firstName + (lastName ? ' ' + lastName : '');
  const userUsername = ctx.from?.username ? '@' + ctx.from.username : 'Tidak ada';
  const roleData = getUserRole(myUser);

  return `
<blockquote><b>🔑 Status Akun: ${roleData.name}</b>
<b>🤖 Version Bot: 2.0</b>
━━━━━━━━━━━━━━━━━
<b>🪪 PROFILE KAMU</b>
<b>🆔 User ID:</b> <code>${userId}</code>
<b>📧 Username:</b> ${escapeHTML(userUsername)}
<b>📛 Nama:</b> <code>${escapeHTML(fullName)}</code>
<b>🪙 Coin:</b> ${saldo.toLocaleString("id-ID")} Coin
<b>👥 Refferal: </b>${myRefs} Orang
━━━━━━━━━━━━━━━━━
<b>📊 STATISTIK BOT</b>
<b>👥 Total User Bot:</b> ${totalUser}
<b>🛒 Total Transaksi:</b> ${totalTransaksi}
<b>💰 Total Pemasukan:</b> ${escapeHTML(totalPemasukan.toLocaleString("id-ID"))} Coin
━━━━━━━━━━━━━━━━━━</blockquote>
`;
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

const isOwner = (ctx) => {
    const fromId = ctx.from?.id || ctx.callbackQuery?.from?.id || ctx.inlineQuery?.from?.id;
    return fromId.toString() == config.ownerId;
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

global.channelTitleCache = {}; 

// MEMORI VIP PASS (Catat ID yang sudah lulus cek channel)
global.verifiedUsers = global.verifiedUsers || new Set();

bot.use(async (ctx, next) => {
    // Abaikan pengecekan jika bot sedang berada di grup
    if (ctx.chat && ctx.chat.type !== 'private') return next();

    // 1. OWNER BEBAS LEWAT TANPA HALANGAN APAPUN
    if (ctx.from && String(ctx.from.id) === String(config.ownerId)) return next();

    // ==========================================
    // 🛑 2. SISTEM MAINTENANCE MODE 🛑
    // ==========================================
    const settings = loadSettings();
    if (settings.maintenance) {
        if (ctx.callbackQuery) {
            return ctx.answerCbQuery("🛠️ BOT UNDER MAINTENANCE!\n\nSedang ada perbaikan/update sistem. Silakan kembali nanti.", { show_alert: true }).catch(() => {});
        } else if (ctx.message) {
            return ctx.reply("🛠️ <b>BOT UNDER MAINTENANCE</b>\n\nMohon maaf, bot sedang dalam perbaikan/update sistem oleh Owner. Silakan coba lagi nanti!", { parse_mode: "HTML" }).catch(() => {});
        }
        return; // Berhenti total di sini, jangan biarkan user masuk!
    }

    const userId = ctx.from?.id;

    // 🚀 INI KUNCI ANTI-DELAY: Kalau user udah pernah dicek & lulus, langsung gas lewati (0ms Delay)
    if (userId && global.verifiedUsers.has(userId)) {
        return next();
    }

    const rawChannels = config.wajibJoinChannels || (config.wajibJoinChannel ? [config.wajibJoinChannel] : []);
    const channels = rawChannels.filter(c => c && c.length > 1); 
    
    if (channels.length > 0) {
        if (ctx.callbackQuery && ctx.callbackQuery.data === 'cek_join') {
            return next();
        }

        const missingChannels = await getMissingChannels(ctx);
        if (missingChannels.length > 0) {
            if (ctx.message && ctx.message.text && ctx.message.text.startsWith('/start ')) {
                const args = ctx.message.text.split(' ');
                if (args.length > 1) {
                    pendingStartArgs[ctx.from.id] = args[1];
                }
            }

            const textPeringatan = `🛑 <b>AKSES DITOLAK!</b>\n━━━━━━━━━━━━━━━━━━━━━━━\nKamu belum bergabung ke channel kami.\nSilakan join semua channel di bawah ini agar tombol bisa mendeteksi nama channel secara otomatis.\n\n👇 <i>Klik tombol di bawah, lalu tekan <b>SAYA SUDAH JOIN</b>.</i>`;
            
            const buttons = [];
            for (const ch of channels) {
                let displayName = ch; 
                if (global.channelTitleCache[ch]) {
                    displayName = global.channelTitleCache[ch];
                } else {
                    try {
                        const chatInfo = await ctx.telegram.getChat(ch);
                        if (chatInfo && chatInfo.title) {
                            displayName = chatInfo.title;
                            global.channelTitleCache[ch] = chatInfo.title; 
                        }
                    } catch (e) { }
                }

                displayName = String(displayName || ch);
                if (Array.from(displayName).length > 25) {
                    displayName = Array.from(displayName).slice(0, 20).join("") + "...";
                }

                const chNameLink = ch.replace('@', '').trim();
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
            } catch (err) {
                console.log("Error Force Sub:", err.message);
            }
            return; 
        } else {
            // KALAU LULUS, MASUKKAN KE DAFTAR VIP PASS BIAR GAK DICEK LAGI
            if (userId) global.verifiedUsers.add(userId);
        }
    } else {
        if (userId) global.verifiedUsers.add(userId);
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
        const prefix = config.prefix;

        // Tangkap teks biasa ATAU teks di bawah foto/video (caption)
        const body = (msg.text || msg.caption || "").trim();

        const isCmd = body.startsWith(prefix);
        const args = body.split(/ +/).slice(1);
        const text = args.join(" ");
        const command = isCmd
            ? body.slice(prefix.length).trim().split(" ")[0].toLowerCase()
            : body.toLowerCase();
            
        const fromId = ctx.from.id;
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

                    let textChannel = "";
                    let claimText = "";

                    if (data.type === "voucher") {
                        textChannel = `<blockquote>🎉 <b>VOUCHER COIN GRATIS!</b></blockquote>\n━━━━━━━━━━━━━━━━━━━━━━━━━\nSiapa cepat dia dapat! Segera klaim coin gratis untuk membeli Script, Source Code, atau APK Mod di dalam bot kami.\n\n💰 <b>Nominal:</b> ${v.nominal.toLocaleString('id-ID')} Coin\n🎁 <b>Kuota:</b> ${v.kuota} Orang Pemenang\n🔑 <b>Kode:</b> <code>${data.kode}</code>\n━━━━━━━━━━━━━━━━━━━━━━━━━\n👇 <i>Klik tombol di bawah ini untuk mengklaim!</i>`;
                        claimText = "🎁 KLAIM VOUCHER SEKARANG";
                    } else {
                        textChannel = `<blockquote>🎉 <b>DANA KAGET (GIVEAWAY) COIN!</b></blockquote>\n━━━━━━━━━━━━━━━━━━━━━━━━━\nAyo adu hoki! Nominal yang didapatkan akan diacak secara otomatis (Sistem Dana Kaget).\n\n💰 <b>Total Hadiah:</b> ${v.total_pool.toLocaleString('id-ID')} Coin\n👥 <b>Untuk:</b> ${v.kuota} Orang Pemenang\n🔑 <b>Kode:</b> <code>${data.kode}</code>\n━━━━━━━━━━━━━━━━━━━━━━━━━\n👇 <i>Klik tombol di bawah ini untuk berebut!</i>`;
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
                        const bonus = 7000000; 
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
                const sortedWinners = [...vouchers[kode].claimedBy].sort((a, b) => b.amount - a.amount);
                let listText = `<blockquote>🎉 <b>DANA KAGET TELAH HABIS!</b></blockquote>\n━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
                listText += `🔑 <b>Kode:</b> <code>${kode}</code>\n`;
                listText += `💰 <b>Total Dibagikan:</b> ${vouchers[kode].total_pool.toLocaleString('id-ID')} Coin\n`;
                listText += `👥 <b>Total Pemenang:</b> ${sortedWinners.length} Orang\n━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
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

            return ctx.reply(`🎉 <b>SELAMAT!</b>\n\nKamu berhasil menukarkan kode ${textTipe} <code>${kode}</code>!\n💰 Coin bertambah ${dapatCoin.toLocaleString('id-ID')} Coin\n🪙 Coin sekarang: ${users[userIndex].balance.toLocaleString('id-ID')} Coin`, { parse_mode: "HTML" });
        } finally {
            setTimeout(() => global.redeemLock.delete(fromId), 2000);
        }
    }

    return ctx.replyWithPhoto(config.menuImage, {
        caption: menuTextBot(ctx),
        parse_mode: "HTML",
        reply_markup: {
            inline_keyboard: [
                [
                    { text: "📱 List APK Mod", callback_data: "buyapk", style: "primary" },
                    { text: "🗂 List Script", callback_data: "buyscript", style: "primary" }
                ],
                [
                    { text: "🎁 Claim Harian", callback_data: "claim_harian", style: "danger" }
                ],
                [
                    { text: "🤝 Referral", callback_data: "menu_referral", style: "primary" },
                    { text: "💸 Kirim Coin", callback_data: "transfer_coin", style: "primary" }
                ],
                [
                   { text: "📦 Mystery Box", callback_data: "menu_mystery", style: "danger" }
                ],
                [
                   { text: "🎯 Misi Coin", callback_data: "misi_coin", style: "primary" },
                   { text: "👤 Cek Profil", callback_data: "profile", style: "primary" }
                ],
                [
                   { text: "🎰 Spin Gacha", callback_data: "menu_gacha", style: "danger" }
                ],
                [
                    { text: "🌟 Cek Rating", callback_data: "cek_rating", style: "primary" },
                    { text: "🏆 Top Pengguna", callback_data: "top_users", style: "primary" }
                ],
                [
                   { text: "🎧 Cs / Tiket Bantuan", callback_data: "cs_ai_start", style: "success" }
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
━━━━━━━━━━━━━━━━━━━━━━
💰 Coin: <b>${nominal.toLocaleString('id-ID')} Coin</b>
🎁 Hadiah Untuk: <b>${kuota}</b> orang
━━━━━━━━━━━━━━━━━━━━━━

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
            let listText = `<blockquote>🎉 <b>DANA KAGET TELAH HABIS!</b></blockquote>\n━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
            listText += `🔑 <b>Kode:</b> <code>${kode}</code>\n`;
            listText += `💰 <b>Total Dibagikan:</b> ${vouchers[kode].total_pool.toLocaleString('id-ID')} Coin\n`;
            listText += `👥 <b>Total Pemenang:</b> ${sortedWinners.length} Orang\n━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
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

    const profileText = `
<blockquote><b>🪪 Profile Kamu</b>
━━━━━━━━━━━━━━━━━
<b>📛 Nama:</b> <code>${escapeHTML(fullName)}</code>
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
━━━━━━━━━━━━━━━━━━━━━━
💰 Total Pembagian: <b>${totalCoin.toLocaleString('id-ID')} Coin</b>
🎁 Hadiah Acak Untuk: <b>${kuota.toLocaleString('id-ID')}</b> orang
━━━━━━━━━━━━━━━━━━━━━━

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

    const text = `<blockquote>⚔️ <b>ARENA ADU KOIN (PvP)</b> ⚔️</blockquote>\n▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰\n🦅 <b>Penantang :</b> ${penantangName}\n💰 <b>Taruhan    :</b> ${formatCoin(nominal)} Coin\n🏆 <b>Total Pot  :</b> ${formatCoin(nominal * 2)} Coin\n▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰\n🔥 <i>Siapa yang berani menerima tantangan ini? Pilih tebakanmu di bawah! (Pajak Kasino 5%)</i>`;

    const keyboard = {
        inline_keyboard: [
            [
                { text: "🦅 PILIH GARUDA", callback_data: `terima_adu|${duelId}|garuda` },
                { text: "🔢 PILIH ANGKA", callback_data: `terima_adu|${duelId}|angka` }
            ],
            [{ text: "❌ BATALKAN TANTANGAN", callback_data: `batal_adu|${duelId}` }]
        ]
    };

    await ctx.reply(text, { parse_mode: "HTML", reply_markup: keyboard });
    break;
}

}
}); // End of bot.on("text")

// ============================================
// ⚔️ AKSI TOMBOL PvP (TARUH DI LUAR SWITCH/CASE)
// ============================================

// Aksi Membatalkan Duel
bot.action(/^batal_adu\|(.+)$/, async (ctx) => {
    const duelId = ctx.match[1];
    const duel = global.activeDuels[duelId];

    if (!duel) return ctx.answerCbQuery("❌ Tantangan sudah tidak berlaku/sudah selesai!", { show_alert: true }).catch(()=>{});
    if (ctx.from.id !== duel.p1_id) return ctx.answerCbQuery("❌ Hanya pembuat tantangan yang bisa membatalkan!", { show_alert: true }).catch(()=>{});

    delete global.activeDuels[duelId]; // Hapus dari memori
    
    try { await ctx.editMessageText(`<i>Tantangan ${formatCoin(duel.nominal)} Coin dari <b>${duel.p1_name}</b> telah dibatalkan.</i> 🏳️`, { parse_mode: "HTML" }); } catch(e){}
});

// Aksi Menerima Duel (Gacha dimulai)
bot.action(/^terima_adu\|(.+)\|(.+)$/, async (ctx) => {
    const userId = ctx.from.id;
    const duelId = ctx.match[1];
    const tebakanLawan = ctx.match[2]; // 'garuda' atau 'angka'
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

    const animasiHeader = `<blockquote>⚔️ <b>ARENA ADU KOIN (PvP)</b> ⚔️</blockquote>\n▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰\n🥊 <b>${duel.p1_name}</b> (Pilih ${tebakanP1.toUpperCase()})\n🆚\n🥊 <b>${p2Name}</b> (Pilih ${tebakanLawan.toUpperCase()})\n▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰\n`;
    
    try { await ctx.editMessageText(animasiHeader + `\n      [ 🪙 Mengambil Koin... ]`, { parse_mode: "HTML" }); } catch(e){}
    await sleep(1000);
    try { await ctx.editMessageText(animasiHeader + `\n      [ 🔄 Koin dilempar ke udara... ]`, { parse_mode: "HTML" }); } catch(e){}
    await sleep(1000);
    try { await ctx.editMessageText(animasiHeader + `\n      [ 💥 Koin jatuh dan berputar... ]`, { parse_mode: "HTML" }); } catch(e){}
    await sleep(1500);

    // 🎲 HASIL RNG & PEMBAGIAN UANG (PAJAK 5%)
    const hasilAcak = Math.random() < 0.5 ? "garuda" : "angka";
    const emojiHasil = hasilAcak === "garuda" ? "🦅 GARUDA" : "🔢 ANGKA";
    
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

    const hasilTeks = `${animasiHeader}\n✨ <b>HASIL LEMPARAN : ${emojiHasil}</b> ✨\n\n🎉 <b>PEMENANG : ${pemenang}</b>\n💀 <b>RUNGKAD : ${pecundang}</b>\n\n🧾 <b>Struk Hadiah:</b>\n💰 Total Pot : <b>${formatCoin(totalPot)} Coin</b>\n🏦 Pajak (5%) : <b>-${formatCoin(pajakBandar)} Coin</b>\n💸 Diterima   : <b>+${formatCoin(hadiahBersih)} Coin</b>`;

    try { await ctx.editMessageText(hasilTeks, { parse_mode: "HTML" }); } catch(e){}
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
    const textChannel = `<blockquote>🎉 <b>VOUCHER COIN GRATIS!</b></blockquote>\n━━━━━━━━━━━━━━━━━━━━━━━━━\nSiapa cepat dia dapat! Segera klaim coin gratis untuk membeli Script, Source Code, atau APK Mod di dalam bot kami.\n\n💰 <b>Nominal:</b> ${v.nominal.toLocaleString('id-ID')} Coin\n🎁 <b>Kuota:</b> ${v.kuota} Orang Pemenang\n🔑 <b>Kode:</b> <code>${kode}</code>\n━━━━━━━━━━━━━━━━━━━━━━━━━\n👇 <i>Klik tombol di bawah ini untuk mengklaim!</i>`;

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
    const textChannel = `<blockquote>🎉 <b>DANA KAGET (GIVEAWAY) COIN!</b></blockquote>\n━━━━━━━━━━━━━━━━━━━━━━━━━\nAyo adu hoki! Nominal yang didapatkan akan diacak secara otomatis (Sistem Dana Kaget).\n\n💰 <b>Total Hadiah:</b> ${v.total_pool.toLocaleString('id-ID')} Coin\n👥 <b>Untuk:</b> ${v.kuota} Orang Pemenang\n🔑 <b>Kode:</b> <code>${kode}</code>\n━━━━━━━━━━━━━━━━━━━━━━━━━\n👇 <i>Klik tombol di bawah ini untuk berebut!</i>`;

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

    const text = `<blockquote>📦 <b>MYSTERY BOX VIP</b></blockquote>\n━━━━━━━━━━━━━━━━━━━━━━━━━\nBuka kotak misteri ini dan dapatkan kesempatan memenangkan <b>Script / APK Premium</b> secara acak dari database!\n\n💵 <b>Harga 1 Box:</b> 5.000.000 Coin\n⏳ <b>Jatah Harian:</b> Sisa ${limitStr}x buka hari ini.\n\n<b>🎁 Peluang Hadiah:</b>\n📦 <b>Jackpot:</b> Random Script / APK Mod\n💰 <b>Koin:</b> Koin Acak (1Jt - 8Jt)\n💀 <b>Zonk:</b> Kotak Kosong (Hangus)\n━━━━━━━━━━━━━━━━━━━━━━━━━\n🪙 <b>Sisa Coin Kamu:</b> ${saldo.toLocaleString('id-ID')} Coin`;

    const keyboard = {
        inline_keyboard: [
            [{ text: `🎁 BUKA MYSTERY BOX (5 Juta)`, callback_data: "open_mystery" }],
            [{ text: "↩️ 𝗕𝗔𝗖𝗞", callback_data: "back_to_main_menu" }]
        ]
    };

    try {
        await ctx.editMessageMedia({ type: "photo", media: config.menuImage, caption: text, parse_mode: "HTML" }, { reply_markup: keyboard });
    } catch (err) {
        await ctx.editMessageText(text, { parse_mode: "HTML", reply_markup: keyboard }).catch(()=>{});
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
        const animText = `<blockquote>📦 <b>MEMBUKA MYSTERY BOX...</b></blockquote>\n━━━━━━━━━━━━━━━━━━━━━━━━━\n\n        🔄 📦 🔄\n\n<i>Mencari hadiah di dalam database...</i>\n━━━━━━━━━━━━━━━━━━━━━━━━━`;
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

        const finalMsg = `<blockquote>📦 <b>HASIL MYSTERY BOX</b></blockquote>\n━━━━━━━━━━━━━━━━━━━━━━━━━\n\n${resultText}\n\n━━━━━━━━━━━━━━━━━━━━━━━━━\n⏳ <b>Jatah Harian:</b> Sisa ${sisaLimit} kali\n🪙 <b>Sisa Coin Kamu:</b> ${freshUsers[fIndex].balance.toLocaleString('id-ID')} Coin`;

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

        // Kalau menang file, kirim dokumennya ke chat
        if (fileToSend) {
            try {
                await ctx.telegram.sendDocument(ctx.chat.id, fileToSend, { caption: fileCaption, parse_mode: "HTML" });
            } catch(e) {
                ctx.reply("❌ Gagal mengirim file hadiah dari Cloud.");
            }
        }

    } finally {
        global.boxLock.delete(userId);
    }
});

// ============================================
// ======== 🎰 FITUR KASINO VIP (5 GAME SLOT) ====
// ============================================

const BET_LEVELS = [100000, 500000, 1000000, 5000000, 10000000, 25000000, 50000000, 100000000, 150000000, 250000000, 500000000, 1000000000];
global.userBets = global.userBets || {}; 
global.slotHistory = global.slotHistory || {}; // Memori Pola Gacor User

// RTP BANDAR SEIMBANG (5 MESIN SLOT)
const SLOT_GAMES = {
    mahjong: {
        name: "Mahjong Ways", emoji: "🀄", theme: "🎋 🐉 🀄",
        desc: "Seimbang (Balanced). Gampang menang, Profit Max 150 Juta.",
        prizes: [
            { chance: 35, mult: 0, text: "💥 ZONK!", emj: ["🍎 🍋 🍇", "💀 📉 💔", "💩 🗑️ 🤡", "💨 🍂 💀"] },
            { chance: 55, mult: 0.5, text: "📉 RUGI SETENGAH (x0.5)", emj: ["🎋 🀄 🀣"] },
            { chance: 75, mult: 1, text: "⚖️ AMAN! (x1)", emj: ["🀣 🀣 🀣"] },
            { chance: 88, mult: 2, text: "🔥 SUPER WIN! (x2)", emj: ["🎋 🎋 🎋"] },
            { chance: 97, mult: 5, text: "💸 MEGA WIN! (x5)", emj: ["🀄 🀄 🀄"] },
            { chance: 101, mult: 10, text: "✨ JACKPOT MAHJONG! (x10) ✨", emj: ["🐉 🐉 🐉"] }
        ]
    },
    olympus: {
        name: "Gates of Olympus", emoji: "⚡", theme: "💎 👑 ⚡",
        desc: "Sangat susah menang (High Volatility). Khusus Sultan pencari Maxwin!",
        prizes: [
            { chance: 70, mult: 0, text: "💥 PETIR NYANGKUT!", emj: ["💀 ☁️ 🌧️", "💔 📉 💩", "💨 🍂 💀"] },
            { chance: 80, mult: 0.2, text: "📉 AMPAS! (x0.2)", emj: ["🔵 🟢 🟡"] },
            { chance: 88, mult: 0.5, text: "📉 RUGI! (x0.5)", emj: ["💍 💍 💍"] },
            { chance: 95, mult: 2, text: "🔥 LUMAYAN! (x2)", emj: ["⏳ ⏳ ⏳"] },
            { chance: 98, mult: 10, text: "💸 TUMPAH! (x10)", emj: ["👑 👑 👑"] },
            { chance: 99.8, mult: 25, text: "👑 PETIR KAKEK ZEUS! (x25)", emj: ["⚡ ⚡ ⚡"] },
            { chance: 101, mult: 100, text: "⚡ MAXWIN OLYMPUS! (x100) ⚡", emj: ["👴 👴 👴"] }
        ]
    },
    fafafa: {
        name: "FaFaFa Classic", emoji: "🏮", theme: "🧧 🧨 🪙",
        desc: "Paling gampang menang! Cocok untuk santai (Profit Max 150 Juta).",
        prizes: [
            { chance: 25, mult: 0, text: "💥 ZONK!", emj: ["💨 🍂 💀", "💩 📉 💔"] },
            { chance: 55, mult: 0.5, text: "📉 RUGI DIKIT (x0.5)", emj: ["🪙 💨 🪙"] }, 
            { chance: 80, mult: 1, text: "⚖️ BALIK MODAL (x1)", emj: ["🪙 🪙 🪙"] }, 
            { chance: 92, mult: 1.5, text: "🔥 CENGLI! (x1.5)", emj: ["🧨 🧨 🧨"] }, 
            { chance: 98, mult: 3, text: "💸 HOKI! (x3)", emj: ["🧧 🧧 🧧"] },
            { chance: 101, mult: 5, text: "🐉 MAXWIN FAFAFA! (x5)", emj: ["🏮 🈵 🏮"] }
        ]
    },
    bonanza: {
        name: "Sweet Bonanza", emoji: "🍭", theme: "🍬 🍭 🍇",
        desc: "Manis tapi mematikan! Sering meledak bom perkalian (Max 150 Juta).",
        prizes: [
            { chance: 40, mult: 0, text: "💥 PERMEN PAHIT!", emj: ["💨 🍂 💀", "🍏 🍌 🍉"] },
            { chance: 60, mult: 0.5, text: "📉 RUGI DIKIT (x0.5)", emj: ["🍇 🍇 🍇"] }, 
            { chance: 75, mult: 1, text: "⚖️ BALIK MODAL (x1)", emj: ["🍬 🍬 🍬"] }, 
            { chance: 88, mult: 3, text: "🔥 TASTY! (x3)", emj: ["🍭 🍭 🍭"] }, 
            { chance: 97, mult: 10, text: "💣 BOM PERKALIAN! (x10)", emj: ["💣 💣 💣"] },
            { chance: 101, mult: 30, text: "🍭 SENSASIONAL BONANZA! (x30)", emj: ["💖 💖 💖"] }
        ]
    },
    starlight: {
        name: "Starlight Princess", emoji: "🌟", theme: "👸 ✨ 🪄",
        desc: "Cucu Kakek Zeus! Volatilitas tinggi, Maxwin x88 menantimu!",
        prizes: [
            { chance: 65, mult: 0, text: "💥 BINTANG JATUH!", emj: ["💀 ☁️ 🌧️", "💔 📉 💩"] },
            { chance: 78, mult: 0.2, text: "📉 AMPAS! (x0.2)", emj: ["🔵 🟢 🟡"] },
            { chance: 85, mult: 0.5, text: "📉 RUGI! (x0.5)", emj: ["🌙 🌙 🌙"] },
            { chance: 93, mult: 2, text: "🔥 LUMAYAN! (x2)", emj: ["☀️ ☀️ ☀️"] },
            { chance: 97, mult: 15, text: "💸 TUMPAH! (x15)", emj: ["❤️ ❤️ ❤️"] },
            { chance: 99.7, mult: 35, text: "🪄 TONGKAT AJAIB! (x35)", emj: ["✨ ✨ ✨"] },
            { chance: 101, mult: 88, text: "🌟 MAXWIN PRINCESS! (x88) 🌟", emj: ["👸 👸 👸"] }
        ]
    }
};

// 1. MENU LOBBY KASINO (UI MEWAH + LEADERBOARD)
bot.action("menu_gacha", async (ctx) => {
    await ctx.answerCbQuery().catch(() => {});
    const text = `<blockquote>🎰 <b>🆅🅸🅿 🅲🅰🆂🅸🅽🅾 🅲🅻🆄🅱</b> 🎰</blockquote>\n▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰\nSelamat datang di Kasino! Pilih mesin slot yang ingin kamu mainkan.\n\n<b>Daftar Mesin Slot:</b>\n🀄 <b>Mahjong Ways:</b> Stabil (Max x10)\n⚡ <b>Olympus:</b> Susah & Sadis (Max x100)\n🏮 <b>FaFaFa:</b> Gampang Menang (Max x5)\n🍭 <b>Sweet Bonanza:</b> Manis & Gacor (Max x30)\n🌟 <b>Starlight Princess:</b> Cucu Kakek Zeus (Max x88)\n▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰\n⚠️ <i>Sistem membaca POLA TARUHAN. Bermain monoton akan membuat koinmu disedot bandar!</i>`;

    const keyboard = {
        inline_keyboard: [
            [{ text: "🀄 MAIN MAHJONG WAYS", callback_data: "menu_slot|mahjong" }],
            [{ text: "⚡ MAIN GATES OF OLYMPUS", callback_data: "menu_slot|olympus" }],
            [{ text: "🏮 MAIN FAFAFA CLASSIC", callback_data: "menu_slot|fafafa" }],
            [{ text: "🍭 MAIN SWEET BONANZA", callback_data: "menu_slot|bonanza" }],
            [{ text: "🌟 MAIN STARLIGHT PRINCESS", callback_data: "menu_slot|starlight" }],
            [{ text: "🏆 TOP GLOBAL SLOTTER", callback_data: "top_slot" }], // <-- INI TOMBOL BARUNYA
            [{ text: "↩️ KEMBALI KE MENU UTAMA", callback_data: "back_to_main_menu" }]
        ]
    };

    try { await ctx.editMessageMedia({ type: "photo", media: config.menuImage, caption: text, parse_mode: "HTML" }, { reply_markup: keyboard }); } 
    catch (err) { await ctx.editMessageText(text, { parse_mode: "HTML", reply_markup: keyboard }).catch(()=>{}); }
});

// Render Menu Game Spesifik (UI Mewah)
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
                { text: "🔥 ALL IN", callback_data: `bet_all|${gameId}` },
                { text: "➕ BET", callback_data: `bet_u|${gameId}` }
            ],
            [{ text: `🎰 SPIN MANUAL (1x)`, callback_data: `play_slot|${gameId}|1` }],
            [{ text: `🚀 AUTO SPIN (10x)`, callback_data: `play_slot|${gameId}|10` }],
            [{ text: "↩️ GANTI MESIN", callback_data: "menu_gacha" }]
        ]
    };

    try { await ctx.editMessageCaption(text, { parse_mode: "HTML", reply_markup: keyboard }); } 
    catch (err) { await ctx.editMessageText(text, { parse_mode: "HTML", reply_markup: keyboard }).catch(()=>{}); }
}

bot.action(/^menu_slot\|([a-z]+)$/, async (ctx) => {
    await ctx.answerCbQuery().catch(()=>{});
    await renderSlotGame(ctx, ctx.match[1]);
});

// Sistem Pengatur Bet
bot.action(/^bet_u\|([a-z]+)$/, async (ctx) => {
    const userId = ctx.from.id;
    let idx = BET_LEVELS.indexOf(global.userBets[userId]);
    if (idx < BET_LEVELS.length - 1) {
        global.userBets[userId] = BET_LEVELS[idx + 1];
        await ctx.answerCbQuery(`💵 Bet Naik: ${formatCoin(global.userBets[userId])} Coin`).catch(()=>{});
        await renderSlotGame(ctx, ctx.match[1]);
    } else ctx.answerCbQuery("🛑 Ini adalah batas Taruhan Maksimal (1 Milyar)!", { show_alert: true }).catch(()=>{});
});

bot.action(/^bet_d\|([a-z]+)$/, async (ctx) => {
    const userId = ctx.from.id;
    let idx = BET_LEVELS.indexOf(global.userBets[userId]);
    if (idx > 0) {
        global.userBets[userId] = BET_LEVELS[idx - 1];
        await ctx.answerCbQuery(`💵 Bet Turun: ${formatCoin(global.userBets[userId])} Coin`).catch(()=>{});
        await renderSlotGame(ctx, ctx.match[1]);
    } else ctx.answerCbQuery("🛑 Ini adalah batas Taruhan Minimal!", { show_alert: true }).catch(()=>{});
});

bot.action(/^bet_all\|([a-z]+)$/, async (ctx) => {
    const userId = ctx.from.id;
    const users = loadUsers();
    const user = users.find(u => u.id === userId);
    const saldo = user ? (user.balance || 0) : 0;

    if (saldo < 100000) return ctx.answerCbQuery("❌ Koin terlalu sedikit untuk All In!", { show_alert: true }).catch(()=>{});
    
    global.userBets[userId] = saldo; 
    await ctx.answerCbQuery(`🔥 ALL IN AKTIF! Taruhan: ${formatCoin(saldo)} Coin`, { show_alert: true }).catch(()=>{});
    await renderSlotGame(ctx, ctx.match[1]);
});

// ==========================================
// 🚀 EKSEKUSI SPIN (3 POLA RANDOM + ANTI-SPAM COOLDOWN)
// ==========================================
bot.action(/^play_slot\|([a-z]+)\|(\d+)$/, async (ctx) => {
    const userId = ctx.from.id;
    const gameId = ctx.match[1];
    const spinCount = parseInt(ctx.match[2]); 
    const game = SLOT_GAMES[gameId];

    global.spinLock = global.spinLock || new Set();
    if (global.spinLock.has(userId)) return ctx.answerCbQuery("⏳ Mesin masih berputar!", { show_alert: true }).catch(()=>{});

    let cost = global.userBets[userId] || 1000000; 
    let totalCost = cost * spinCount;

    let users = loadUsers();
    let userIndex = users.findIndex(u => u.id === userId);
    
    if (userIndex === -1) return ctx.answerCbQuery("❌ Akun belum terdaftar.", { show_alert: true }).catch(()=>{});
    if ((users[userIndex].balance || 0) < totalCost) {
        return ctx.answerCbQuery(`❌ Saldo tidak cukup!\nButuh ${formatCoin(totalCost)} Coin untuk ${spinCount}x Spin.`, { show_alert: true }).catch(()=>{});
    }

    global.spinLock.add(userId);

    try {
        await ctx.answerCbQuery().catch(() => {});
        users[userIndex].balance -= totalCost; 
        saveUsers(users); 

        // 🧠 MEMBACA PERGERAKAN USER & COOLDOWN MESIN
        let history = global.slotHistory[userId] || { loseStreak: 0, lastBet: 0, trend: [], cooldown: 0 };
        if (!history.trend) history.trend = [];
        if (!history.cooldown) history.cooldown = 0;
        
        // Pilih 1 dari 3 pola random untuk semua game
        if (!history.polaFaFa) history.polaFaFa = Math.floor(Math.random() * 3) + 1;
        if (!history.polaMahjong) history.polaMahjong = Math.floor(Math.random() * 3) + 1;
        if (!history.polaOlympus) history.polaOlympus = Math.floor(Math.random() * 3) + 1; 
        if (!history.polaBonanza) history.polaBonanza = Math.floor(Math.random() * 3) + 1; 
        if (!history.polaStarlight) history.polaStarlight = Math.floor(Math.random() * 3) + 1; 

        let currentTrend = "SAME";
        if (history.lastBet > 0) {
            if (cost > history.lastBet) currentTrend = "UP";
            else if (cost < history.lastBet) currentTrend = "DOWN";

            if (currentTrend !== "SAME") {
                history.trend.push(currentTrend);
                if (history.trend.length > 6) history.trend.shift();
            }
        }

        let rtpBoost = 0;
        let isPolaGacor = false;
        let trendStr = history.trend.join(","); 

        if (history.cooldown > 0) {
            history.cooldown -= spinCount;
            if (history.cooldown < 0) history.cooldown = 0;
        }

        // 🔥 HANYA BISA GACOR KALAU MESIN TIDAK DALAM MASA COOLDOWN!
        if (history.cooldown === 0) {
            // 🏮 FAFAFA
            if (gameId === "fafafa") {
                if (history.polaFaFa === 1 && history.loseStreak >= 3 && currentTrend === "UP") { isPolaGacor = true; rtpBoost = 35; }
                else if (history.polaFaFa === 2 && history.loseStreak >= 3 && trendStr.endsWith("DOWN,UP")) { isPolaGacor = true; rtpBoost = 35; }
                else if (history.polaFaFa === 3 && history.loseStreak >= 2 && trendStr.endsWith("UP,UP")) { isPolaGacor = true; rtpBoost = 35; }
            }
            // 🀄 MAHJONG
            else if (gameId === "mahjong") {
                if (history.polaMahjong === 1 && history.loseStreak >= 4 && trendStr.endsWith("UP,DOWN,UP")) { isPolaGacor = true; rtpBoost = 50; }
                else if (history.polaMahjong === 2 && history.loseStreak >= 3 && trendStr.endsWith("DOWN,DOWN,UP")) { isPolaGacor = true; rtpBoost = 50; }
                else if (history.polaMahjong === 3 && history.loseStreak >= 4 && trendStr.endsWith("UP,UP,DOWN,UP")) { isPolaGacor = true; rtpBoost = 50; }
            }
            // 🍭 BONANZA
            else if (gameId === "bonanza") {
                if (history.polaBonanza === 1 && history.loseStreak >= 4 && trendStr.endsWith("DOWN,UP,UP")) { isPolaGacor = true; rtpBoost = 60; }
                else if (history.polaBonanza === 2 && history.loseStreak >= 3 && trendStr.endsWith("UP,UP,DOWN")) { isPolaGacor = true; rtpBoost = 60; }
                else if (history.polaBonanza === 3 && history.loseStreak >= 5 && trendStr.endsWith("UP,DOWN,UP")) { isPolaGacor = true; rtpBoost = 60; }
            }
            // ⚡ OLYMPUS
            else if (gameId === "olympus") {
                if (history.polaOlympus === 1 && history.loseStreak >= 5 && trendStr.endsWith("UP,DOWN,UP,DOWN,UP") && cost >= 10000000) { isPolaGacor = true; rtpBoost = 200; }
                else if (history.polaOlympus === 2 && history.loseStreak >= 6 && trendStr.endsWith("DOWN,DOWN,UP,UP,UP") && cost >= 5000000) { isPolaGacor = true; rtpBoost = 200; }
                else if (history.polaOlympus === 3 && history.loseStreak >= 4 && trendStr.endsWith("UP,UP,DOWN,DOWN,UP") && cost >= 15000000) { isPolaGacor = true; rtpBoost = 200; }
            }
            // 🌟 STARLIGHT PRINCESS
            else if (gameId === "starlight") {
                if (history.polaStarlight === 1 && history.loseStreak >= 5 && trendStr.endsWith("DOWN,DOWN,UP,UP") && cost >= 8000000) { isPolaGacor = true; rtpBoost = 200; }
                else if (history.polaStarlight === 2 && history.loseStreak >= 4 && trendStr.endsWith("UP,DOWN,UP,DOWN") && cost >= 12000000) { isPolaGacor = true; rtpBoost = 200; }
                else if (history.polaStarlight === 3 && history.loseStreak >= 6 && trendStr.endsWith("UP,UP,UP,DOWN") && cost >= 5000000) { isPolaGacor = true; rtpBoost = 200; }
            }
        }

        if (!isPolaGacor) {
            if (currentTrend === "SAME") rtpBoost = -15; // Monoton? Sedot habis!
            else rtpBoost = -5; // Acak-acakan? Sedot pelan-pelan
        }

        let totalPrize = 0;
        let finalEmoji = "";
        let finalStatus = "";

        // JIKA AUTO SPIN
        if (spinCount > 1) {
            let winCount = 0;
            for(let i=0; i<spinCount; i++) {
                let rng = (Math.random() * 100) + rtpBoost;
                let prizeObj = game.prizes.find(p => rng <= p.chance) || game.prizes[game.prizes.length-1];
                totalPrize += (cost * prizeObj.mult);
                if (prizeObj.mult > 0) winCount++;
            }
            finalEmoji = `[ 🔄 <b>AUTO SPIN ${spinCount}x SELESAI</b> 🔄 ]`;
            finalStatus = `Kamu menang ${winCount}x dari ${spinCount} putaran.`;
            
            if (totalPrize < totalCost) history.loseStreak += 3; else history.loseStreak = 0;
        } else {
            // JIKA MANUAL SPIN (1x)
            let rng = (Math.random() * 100) + rtpBoost;
            let prizeObj = game.prizes.find(p => rng <= p.chance) || game.prizes[game.prizes.length-1];
            
            totalPrize = cost * prizeObj.mult;
            finalEmoji = `[  ${prizeObj.emj[Math.floor(Math.random() * prizeObj.emj.length)]}  ]`;
            finalStatus = prizeObj.text;

            if (prizeObj.mult <= 1) history.loseStreak++; else history.loseStreak = 0;
        }

        // Reset pola kalau berhasil mancing Jackpot
        if (isPolaGacor) {
            history.trend = [];
            history.loseStreak = 0;
            history.cooldown = Math.floor(Math.random() * 10) + 15; // 🛑 COOLDOWN AKTIF (15-24 spin ke depan dijamin rungkad)
            finalStatus += "\n🔥 <i>(POLA RAHASIA AKTIF!)</i>";
            
            // ACAK POLA BARU
            if (gameId === "fafafa") { let polaLama = history.polaFaFa; while(history.polaFaFa === polaLama) history.polaFaFa = Math.floor(Math.random() * 3) + 1; }
            if (gameId === "mahjong") { let polaLama = history.polaMahjong; while(history.polaMahjong === polaLama) history.polaMahjong = Math.floor(Math.random() * 3) + 1; }
            if (gameId === "bonanza") { let polaLama = history.polaBonanza; while(history.polaBonanza === polaLama) history.polaBonanza = Math.floor(Math.random() * 3) + 1; }
            if (gameId === "olympus") { let polaLama = history.polaOlympus; while(history.polaOlympus === polaLama) history.polaOlympus = Math.floor(Math.random() * 3) + 1; }
            if (gameId === "starlight") { let polaLama = history.polaStarlight; while(history.polaStarlight === polaLama) history.polaStarlight = Math.floor(Math.random() * 3) + 1; }
        }

        history.lastBet = cost;
        global.slotHistory[userId] = history;

        // ====================================================
        // 🛑 SISTEM LIMIT PROFIT BANDAR (MAX 150 JUTA / SPIN)
        // ====================================================
        // Olympus & Starlight dikecualikan (Bebas JP Milyaran buat Sultan)
        if (gameId !== "olympus" && gameId !== "starlight") {
            let profitKotor = totalPrize - totalCost;
            let maxProfitAman = 150000000; // LIMIT 150 JUTA
            
            if (profitKotor > maxProfitAman) {
                totalPrize = totalCost + maxProfitAman; 
                finalStatus += "\n⚠️ <i>(Maksimal Keuntungan Dibatasi +150 Juta Coin)</i>";
            }
        }
        // ====================================================

        // ANIMASI SPIN FAST MODE
        const spinText = `<blockquote>${game.emoji} <b>${game.name.toUpperCase()}</b> ${game.emoji}</blockquote>\n▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰\n\n        [  🔄 🎰 🔄  ]\n\n<b>🔄 Menganalisis Pola Bet...</b>\n▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰\n💸 <b>Modal Spin:</b> ${formatCoin(totalCost)}`;
        try { await ctx.editMessageCaption(spinText, { parse_mode: "HTML" }); } catch(e){}
        await sleep(1500);

// RELOAD DATA (ANTI TABRAKAN KLAIM HARIAN)
        let freshUsers = loadUsers();
        let freshIndex = freshUsers.findIndex(u => u.id === userId);
        freshUsers[freshIndex].balance += totalPrize;
        
        // =================================================
        // 📊 TRACKER LEADERBOARD (CCTV REKAM JEJAK USER)
        // =================================================
        if (!freshUsers[freshIndex].slotStats) {
            freshUsers[freshIndex].slotStats = { spins: 0, wins: 0, games: {} };
        }
        freshUsers[freshIndex].slotStats.spins += spinCount; // Rekam total putaran
        freshUsers[freshIndex].slotStats.wins += totalPrize; // Rekam total Jackpot yang didapat
        freshUsers[freshIndex].slotStats.games[gameId] = (freshUsers[freshIndex].slotStats.games[gameId] || 0) + spinCount; // Rekam game favorit
        
        // Pastikan nama user tersimpan untuk dipajang di Leaderboard
        if (ctx.from.first_name) freshUsers[freshIndex].first_name = ctx.from.first_name;
        // =================================================
        
        // Reset bet ke 1 Jt kalau habis All In tapi masih hidup
        if (global.userBets[userId] > freshUsers[freshIndex].balance && freshUsers[freshIndex].balance > 0) {
             global.userBets[userId] = BET_LEVELS[2]; 
        }
        
        saveUsers(freshUsers);

        let untungRugi = totalPrize - totalCost;
        let pnlText = untungRugi >= 0 ? `+${formatCoin(untungRugi)} Coin 📈` : `${formatCoin(untungRugi)} Coin 📉`;

        // HASIL AKHIR
        const resultText = `<blockquote>${game.emoji} <b>HASIL ${game.name.toUpperCase()}</b> ${game.emoji}</blockquote>\n▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰\n\n       ${finalEmoji}\n\n<b>${finalStatus}</b>\n\n🧾 <b>Struk Transaksi:</b>\n💸 Modal Taruhan : <b>${formatCoin(totalCost)}</b>\n🎁 Hasil Jackpot   : <b>${formatCoin(totalPrize)}</b>\n📊 Profit/Loss     : <b>${pnlText}</b>\n▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰\n💳 <b>Sisa Saldo Kamu:</b> ${freshUsers[freshIndex].balance.toLocaleString('id-ID')} Coin`;

        const keyboard = {
            inline_keyboard: [
                [
                    { text: "➖ BET", callback_data: `bet_d|${gameId}` },
                    { text: "🔥 ALL IN", callback_data: `bet_all|${gameId}` },
                    { text: "➕ BET", callback_data: `bet_u|${gameId}` }
                ],
                [{ text: `🔄 SPIN LAGI (1x)`, callback_data: `play_slot|${gameId}|1` }],
                [{ text: `🚀 AUTO SPIN (10x)`, callback_data: `play_slot|${gameId}|10` }],
                [{ text: "↩️ GANTI MESIN", callback_data: "menu_gacha" }]
            ]
        };

        try { await ctx.editMessageCaption(resultText, { parse_mode: "HTML", reply_markup: keyboard }); } 
        catch (err) { await ctx.editMessageText(resultText, { parse_mode: "HTML", reply_markup: keyboard }).catch(()=>{}); }

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
    await ctx.editMessageText("<blockquote><b>⏳ <i>Sedang menyiapkan APK untukmu...</i></b></blockquote>", { parse_mode: "HTML" }).catch(() => {});
    
    const index = Number(ctx.match[1]);
    const userId = ctx.from.id;
    const sc = loadApks()[index];
    if (!sc) return ctx.editMessageText("❌ APK tidak ditemukan.", { parse_mode: "HTML" }).catch(()=>{});

    const harga = getDiscountPrice(userId, sc.price);
    const price = harga.finalPrice;

    const users = loadUsers();
    const userIndex = users.findIndex(u => u.id === userId);
    users[userIndex].balance = users[userIndex].balance || 0;
    
    if (users[userIndex].balance < price) {
        return ctx.editMessageText(`❌ <b>Coin tidak cukup!</b>\nCoin Anda: ${(users[userIndex].balance || 0).toLocaleString('id-ID')} Coin\nHarga Final: ${price.toLocaleString('id-ID')} Coin\n\nSilakan Topup terlebih dahulu.`, { parse_mode: "HTML" }).catch(()=>{});
    }

    users[userIndex].balance -= price;
    users[userIndex].total_spent = (users[userIndex].total_spent || 0) + price;
    users[userIndex].history = users[userIndex].history || [];
    users[userIndex].history.push({ product: `APK: ${sc.name}`, amount: price, type: "apk", details: sc.desk || "-", timestamp: new Date().toISOString() });
    saveUsers(users);

    const buyerInfo = { id: userId, name: ctx.from.first_name + (ctx.from.last_name ? ' ' + ctx.from.last_name : ''), username: ctx.from.username, totalSpent: users[userIndex].total_spent };
    await notifyOwner(ctx, { type: "apk", name: sc.name, amount: price }, buyerInfo);

    await ctx.editMessageText(`<blockquote><b>✅ Pembelian Berhasil!</b></blockquote>\n\n📱 Produk: APK ${escapeHTML(sc.name)}\n💰 Harga Dibayar: ${price.toLocaleString('id-ID')} Coin\n💳 Sisa Coin: ${users[userIndex].balance.toLocaleString('id-ID')} Coin\n\n<i>File APK dikirim secara instan...</i>`, { parse_mode: "html" }).catch(()=>{});

    try {
        await ctx.telegram.sendDocument(ctx.chat.id, sc.file_id, { caption: `📱 APK: ${escapeHTML(sc.name)}\n🎉 <i>Terima kasih telah berbelanja!</i>`, parse_mode: "html" });
    } catch (err) {
        await ctx.reply("❌ Gagal mengirim file APK.");
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

    let text = "🎯 <b>MISI COIN (REWARD: 2.000.000 COIN)</b>\n━━━━━━━━━━━━━━━━━━━━━━━━━\n";
    let buttons = [];

    // Jika misi habis atau belum ada misi sama sekali
    if (availableMissions.length === 0) {
        text += "\nWah, sepertinya kamu sudah menyelesaikan semua misi atau belum ada misi baru untuk mendapatkan coin saat ini. Tunggu update selanjutnya ya!";
        buttons.push([{ text: "↩️ 𝗕𝗔𝗖𝗞", callback_data: "back_to_main_menu" }]);
    } else {
        text += "\nSilakan bergabung ke channel di bawah ini, lalu klik tombol <b>Cek Misi</b> untuk mengklaim 2 Juta Coin gratis!\n\n";
        
        availableMissions.forEach(ch => {
            const chNameLink = ch.replace('@', '').trim();
            buttons.push([{ text: `📢 Join ${ch}`, url: `https://t.me/${chNameLink}` }]);
            buttons.push([{ text: `✅ Cek Misi ${ch}`, callback_data: `cek_misi|${ch}` }]);
        });
        buttons.push([{ text: "↩️ 𝗕𝗔𝗖𝗞", callback_data: "back_to_main_menu" }]);
    }

    try {
        await ctx.editMessageMedia({ type: "photo", media: config.menuImage, caption: text, parse_mode: "HTML" }, { reply_markup: { inline_keyboard: buttons } });
    } catch (err) {
        await ctx.editMessageText(text, { parse_mode: "HTML", reply_markup: { inline_keyboard: buttons } }).catch(()=>{});
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

    // Kalau saldo kosong, langsung tolak pakai notif pop-up di tengah
    if (!user || (user.balance || 0) <= 0) {
        return ctx.answerCbQuery("❌ Saldo kamu 0 Coin!\n\nKamu tidak bisa melakukan transfer.", { show_alert: true }).catch(() => {});
    }

    await ctx.answerCbQuery().catch(() => {});
    
    // Aktifkan mode tunggu balasan
    pendingTransfer[fromId] = true;

    return ctx.reply("💸 <b>KIRIM COIN KE TEMAN</b>\n\nSilakan ketik <b>ID Telegram</b> atau <b>@Username</b> temanmu dan nominalnya.\n\n<b>Format:</b> <code>[Target] [Nominal]</code>\n<b>Contoh pakai ID:</b> <code>123456789 50000</code>\n<b>Contoh pakai Username:</b> <code>@zyntherion 50000</code>\n\n<i>Ketik <b>batal</b> untuk membatalkan proses.</i>", { parse_mode: "HTML" });
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

bot.action("profile", async (ctx) => {
    await ctx.answerCbQuery().catch(() => {});
    try { await ctx.deleteMessage(); } catch (err) { return; }

    const fromId = ctx.from.id;
    const users = loadUsers();
    const user = users.find(u => u.id === fromId);

    if (!user) return ctx.reply("❌ User tidak ditemukan");

    const firstName = user.first_name || '';
    const lastName = user.last_name || '';
    const fullName = firstName + (lastName ? ' ' + lastName : '');
    const userUsername = user.username ? '@' + user.username : 'Tidak ada';

    let lastTransactions = '<i>Belum ada transaksi</i>';
    if (user.history && user.history.length > 0) {
        lastTransactions = user.history.slice(-3).reverse().map((t, i) => {
            return `${i + 1}. ${escapeHTML(t.product)} - ${formatCoin(t.amount)} Coin (${new Date(t.timestamp).toLocaleDateString('id-ID')})`;
        }).join('\n');
    }

    const profileText = `<blockquote><b>🪪 Profile Kamu</b>\n━━━━━━━━━━━━━━━━━\n<b>📛 Nama:</b> <code>${escapeHTML(fullName)}</code>\n<b>🆔 User ID:</b> <code>${user.id}</code>\n<b>📧 Username:</b> ${escapeHTML(userUsername)}\n<b>📅 Join Date:</b> ${new Date(user.join_date).toLocaleDateString('id-ID')}\n<b>💰 Total Spent:</b> ${formatCoin(user.total_spent || 0)} Coin\n<b>📊 Total Transaksi:</b> ${user.history ? user.history.length : 0}\n━━━━━━━━━━━━━━━━━\n<b>📋 Last 3 Transactions:</b>\n\n${lastTransactions}</blockquote>`;

    ctx.reply(profileText, { parse_mode: "HTML", disable_web_page_preview: true, reply_markup: { inline_keyboard: [[{ text: "↩️ 𝐁𝐀𝐂𝐊", callback_data: "back_to_main_menu"  }]] } }).catch(() => {});
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

    ctx.reply(historyText, { parse_mode: "HTML", disable_web_page_preview: true, reply_markup: { inline_keyboard: [[{ text: "↩️ 𝐁𝐀𝐂𝐊", callback_data: "informasi_admin"  }]] } }).catch(() => {});
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
        reply_markup: { inline_keyboard: [[{ text: "🗂 List Script", callback_data: "buyscript"  }], [{ text: "↩️ 𝐁𝐀𝐂𝐊", callback_data: "back_to_main_menu"  }]] }
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

    const textTop = `
<blockquote><b>🏆 LEADERBOARD TOP PENGGUNA</b></blockquote>
Tingkatkan terus transaksi Anda dan jadilah Top Pengguna di bot kami!

🥇 <b>𝗧𝗢𝗣 𝟭 (𝗦𝘂𝗹𝘁𝗮𝗻)</b>
└ 🆔 <b>𝗜𝗗:</b> <code>${top1.id}</code>
└ 📋 <b>𝗨𝘀𝗲𝗿𝗻𝗮𝗺𝗲:</b> ${top1.name}
└ 🪙 <b>𝗖𝗼𝗶𝗻:</b> ${top1.saldo.toLocaleString('id-ID')} Coin
└ 🛒 <b>𝗧𝗿𝗮𝗻𝘀𝗮𝗸𝘀𝗶:</b> ${top1.trx}x Pembelian
└ 💵 <b>𝗧𝗼𝘁𝗮𝗹 𝗕𝗲𝗹𝗮𝗻𝗷𝗮:</b> ${top1.total.toLocaleString('id-ID')} Coin

🥈 <b>𝗧𝗢𝗣 𝟮 (𝗝𝘂𝗿𝗮𝗴𝗮𝗻)</b>
└ 🆔 <b>𝗜𝗗:</b> <code>${top2.id}</code>
└ 📋 <b>𝗨𝘀𝗲𝗿𝗻𝗮𝗺𝗲:</b> ${top2.name}
└ 🪙 <b>𝗖𝗼𝗶𝗻:</b> ${top2.saldo.toLocaleString('id-ID')} Coin
└ 🛒 <b>𝗧𝗿𝗮𝗻𝘀𝗮𝗸𝘀𝗶:</b> ${top2.trx}x Pembelian
└ 💵 <b>𝗧𝗼𝘁𝗮𝗹 𝗕𝗲𝗹𝗮𝗻𝗷𝗮:</b> ${top2.total.toLocaleString('id-ID')} Coin

🥉 <b>𝗧𝗢𝗣 𝟯 (𝗝𝗮𝘄𝗮𝗿𝗮)</b>
└ 🆔 <b>𝗜𝗗:</b> <code>${top3.id}</code>
└ 📋 <b>𝗨𝘀𝗲𝗿𝗻𝗮𝗺𝗲:</b> ${top3.name}
└ 🪙 <b>𝗖𝗼𝗶𝗻:</b> ${top3.saldo.toLocaleString('id-ID')} Coin
└ 🛒 <b>𝗧𝗿𝗮𝗻𝘀𝗮𝗸𝘀𝗶:</b> ${top3.trx}x Pembelian
└ 💵 <b>𝗧𝗼𝘁𝗮𝗹 𝗕𝗲𝗹𝗮𝗻𝗷𝗮:</b> ${top3.total.toLocaleString('id-ID')} Coin
`.trim();

    return ctx.editMessageCaption(textTop, { parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "↩️ 𝗕𝗔𝗖𝗞", callback_data: "back_to_main_menu" }]] } }).catch(err => {
        return ctx.editMessageText(textTop, { parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "↩️ 𝗕𝗔𝗖𝗞", callback_data: "back_to_main_menu" }]] } }).catch(()=> {});
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
    global.verifiedUsers.add(ctx.from.id);
    
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
                    let listText = `<blockquote>🎉 <b>DANA KAGET TELAH HABIS!</b></blockquote>\n━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
                    listText += `🔑 <b>Kode:</b> <code>${kode}</code>\n`;
                    listText += `💰 <b>Total Dibagikan:</b> ${vouchers[kode].total_pool.toLocaleString('id-ID')} Coin\n`;
                    listText += `👥 <b>Total Pemenang:</b> ${sortedWinners.length} Orang\n━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
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

                return ctx.reply(`🎉 <b>VERIFIKASI & KLAIM SUKSES!</b>\n\nTerima kasih sudah join channel. Kode <code>${kode}</code> otomatis diproses!\n💰 Coin bertambah ${dapatCoin.toLocaleString('id-ID')} Coin\n🪙 Coin sekarang: ${users[userIndex].balance.toLocaleString('id-ID')} Coin`, { parse_mode: "HTML" });
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
                
                // Berikan bonus 200.000 Coin ke pengundang
                if (inviterId && inviterId !== userId) {
                    const inviterIndex = users.findIndex(u => u.id === inviterId);
                    if (inviterIndex !== -1) {
                        const bonus = 7000000; 
                        users[inviterIndex].balance = (users[inviterIndex].balance || 0) + bonus;
                        users[inviterIndex].referrals = (users[inviterIndex].referrals || 0) + 1;
                        users[inviterIndex].ref_earnings = (users[inviterIndex].ref_earnings || 0) + bonus;
                        
                        ctx.telegram.sendMessage(inviterId, `🎉 <b>HORE!</b>\nSeseorang telah bergabung menggunakan link referral kamu!\n💰 Coin kamu bertambah ${bonus.toLocaleString('id-ID')} Coin`, { parse_mode: "HTML" }).catch(() => {});
                    }
                }
                saveUsers(users);
                
                autoBackupDB(ctx, "PENGGUNA BARU (Register)", userDB);
                
                return ctx.reply('🎉 <b>Akses Diberikan!</b>\nKamu berhasil mendaftar melalui link referral teman.\n\nSilakan ketik /menu atau /start untuk mulai menggunakan bot.', { parse_mode: 'HTML' });
            }
        }
    }

    return ctx.reply('🎉 <b>Akses Diberikan!</b>\nSilakan ketik /menu atau /start untuk mulai menggunakan bot.', { parse_mode: 'HTML' });
});

bot.action("back_to_main_menu", async (ctx) => {
  await ctx.answerCbQuery().catch(() => {});
  const captionText = menuTextBot(ctx);
  const keyboard = {
    inline_keyboard: [
                [
                    { text: "📱 List APK Mod", callback_data: "buyapk", style: "primary" },
                    { text: "🗂 List Script", callback_data: "buyscript", style: "primary" }
                ],
                [
                    { text: "🎁 Claim Harian", callback_data: "claim_harian", style: "danger" }
                ],
                [
                    { text: "🤝 Referral", callback_data: "menu_referral", style: "primary" },
                    { text: "💸 Kirim Coin", callback_data: "transfer_coin", style: "primary" }
                ],
                [
                   { text: "📦 Mystery Box", callback_data: "menu_mystery", style: "danger" }
                ],
                [
                   { text: "🎯 Misi Coin", callback_data: "misi_coin", style: "primary" },
                   { text: "👤 Cek Profil", callback_data: "profile", style: "primary" }
                ],
                [
                   { text: "🎰 Spin Gacha", callback_data: "menu_gacha", style: "danger" }
                ],
                [
                    { text: "🌟 Cek Rating", callback_data: "cek_rating", style: "primary" },
                    { text: "🏆 Top Pengguna", callback_data: "top_users", style: "primary" }
                ],
                [
                   { text: "🎧 Cs / Tiket Bantuan", callback_data: "cs_ai_start", style: "success" }
               ]
          ]
  };

  try {
    await ctx.editMessageMedia({ type: "photo", media: config.menuImage, caption: captionText, parse_mode: "HTML" }, { reply_markup: keyboard });
  } catch (err) {
    if (err.description?.includes("there is no media in the message") || err.description?.includes("message to edit not found")) {
        await ctx.deleteMessage().catch(() => {});
        await ctx.replyWithPhoto(config.menuImage, { caption: captionText, parse_mode: "HTML", reply_markup: keyboard }).catch(() => {});
    }
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
      [{ text: "↩️ 𝐁𝐀𝐂𝐊", callback_data: "back_to_main_menu" }]
    ]
  };

  if (isOwner(ctx)) {
      storeMenuKeyboard.inline_keyboard.splice(-1, 0, [
          { text: "⚙️ Pengaturan Fitur (Owner)", callback_data: "admin_features" }
      ]);
  }

  const captionText = `<blockquote>🛍️ 𝗗𝗔𝗙𝗧𝗔𝗥 𝗠𝗘𝗡𝗨 𝗟𝗔𝗬𝗔𝗡𝗔𝗡 𝗕𝗢𝗧\n━━━━━━━━━━━━━━━━━━━━━━━━━\nPilih kategori produk yang ingin dibeli:</blockquote>`;

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
  const captionText = `<blockquote>👤 <b>INFORMASI AKUN & AKTIVITAS</b></blockquote>\n━━━━━━━━━━━━━━━━━━━━━━━━━\nPusat informasi untuk memantau detail akun, riwayat transaksi, dan program afiliasi (referral) kamu.\n\n<b>📝 Detail Menu:</b>\n• <b>Cek Profil:</b> Lihat detail ID, sisa coin, dan statistik akun.\n• <b>Cek History:</b> Pantau riwayat pembelian dan transaksi terakhir.\n• <b>Code Referral:</b> Dapatkan coin gratis dengan membagikan link!\n\n👇 <i>Silakan pilih menu di bawah ini:</i>`.trim();

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
    
    // ===== AUTO TIMEOUT 1 MENIT =====
    global.csTimeouts = global.csTimeouts || {};
    if (global.csTimeouts[fromId]) clearTimeout(global.csTimeouts[fromId]);
    global.csTimeouts[fromId] = setTimeout(() => {
        if (pendingCsChat[fromId]) {
            delete pendingCsChat[fromId]; // Batalkan sesi
            ctx.telegram.sendMessage(fromId, "⏱️ <b>Sesi CS Berakhir (Timeout)</b>\n\nKarena tidak ada aktivitas/pesan selama 1 menit, sesi Tiket Bantuan otomatis ditutup. Silakan buka menu CS lagi jika masih butuh bantuan.", { parse_mode: "HTML" }).catch(()=>{});
        }
    }, 60000); // 60.000 ms = 1 Menit

    const captionText = `<blockquote>🎧 <b>LIVE CHAT / TIKET BANTUAN</b></blockquote>\n━━━━━━━━━━━━━━━━━━━━━━━━━\nHalo! Ada yang bisa kami bantu? \n\nSilakan ketik keluhan, pertanyaan, atau kirim foto/video bukti dengan membalas pesan ini. \n\nPesanmu akan langsung diteruskan ke Admin. Waktu kamu <b>1 Menit</b> (Otomatis batal jika tidak ada pesan).\n\n👇 <i>Kirim pesanmu di bawah...</i>`.trim();
    const keyboard = { inline_keyboard: [[{ text: "🛑 Akhiri Sesi Chat", callback_data: "cs_ai_stop" }]] };

    try {
        await ctx.editMessageMedia({ type: "photo", media: config.menuImage, caption: captionText, parse_mode: "HTML" }, { reply_markup: keyboard });
    } catch (err) {
        if (err.description?.includes("there is no media in the message") || err.description?.includes("message to edit not found")) {
            await ctx.deleteMessage().catch(() => {});
            await ctx.replyWithPhoto(config.menuImage, { caption: captionText, parse_mode: "HTML", reply_markup: keyboard }).catch(() => {});
        }
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
    
    const captionText = menuTextBot(ctx);
    const keyboard = {
        inline_keyboard: [
                [
                    { text: "📱 List APK Mod", callback_data: "buyapk", style: "primary" },
                    { text: "🗂 List Script", callback_data: "buyscript", style: "primary" }
                ],
                [
                    { text: "🎁 Claim Harian", callback_data: "claim_harian", style: "danger" }
                ],
                [
                    { text: "🤝 Referral", callback_data: "menu_referral", style: "primary" },
                    { text: "💸 Kirim Coin", callback_data: "transfer_coin", style: "primary" }
                ],
                [
                   { text: "📦 Mystery Box", callback_data: "menu_mystery", style: "danger" }
                ],
                [
                   { text: "🎯 Misi Coin", callback_data: "misi_coin", style: "primary" },
                   { text: "👤 Cek Profil", callback_data: "profile", style: "primary" }
                ],
                [
                   { text: "🎰 Spin Gacha", callback_data: "menu_gacha", style: "danger" }
                ],
                [
                    { text: "🌟 Cek Rating", callback_data: "cek_rating", style: "primary" },
                    { text: "🏆 Top Pengguna", callback_data: "top_users", style: "primary" }
                ],
                [
                   { text: "🎧 Cs / Tiket Bantuan", callback_data: "cs_ai_start", style: "success" }
               ]
        ]
    };

    try {
        await ctx.editMessageMedia({ type: "photo", media: config.menuImage, caption: captionText, parse_mode: "HTML" }, { reply_markup: keyboard });
    } catch (err) {
        if (err.description?.includes("there is no media in the message") || err.description?.includes("message to edit not found")) {
            await ctx.deleteMessage().catch(() => {});
            await ctx.replyWithPhoto(config.menuImage, { caption: captionText, parse_mode: "HTML", reply_markup: keyboard }).catch(() => {});
        }
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

  const referralKeyboard = { inline_keyboard: [[{ text: "↩️ 𝐁𝐀𝐂𝐊", callback_data: "back_to_main_menu" }]] };
  const captionText = `<blockquote><b>🤝 PROGRAM REFERRAL</b>\n━━━━━━━━━━━━━━━━━━━━━━━━━\nDapatkan coin gratis dengan cara mengajak temanmu menggunakan bot ini!</blockquote>\n\nSetiap teman yang mendaftar melalui link kamu, kamu akan mendapatkan bonus coin.\n\n🎁 <b>Bonus Reward:</b> 7.000.000 Coin / teman\n(Bonus otomatis masuk ke coin bot kamu)\n\n👇 <b>Link Referral Unik Kamu:</b>\n<code>${refLink}</code>\n<i>(Tap link di atas untuk menyalin)</i>\n\n📊 <b>Statistik Kamu Saat Ini:</b>\n👥 Teman diundang: <b>${myRefs} Orang</b>\n💰 Total pendapatan: <b>${myEarnings.toLocaleString('id-ID')} Coin</b>`.trim();

  try {
    await ctx.editMessageMedia({ type: "photo", media: config.menuImage, caption: captionText, parse_mode: "HTML" }, { reply_markup: referralKeyboard });
  } catch (err) {
    if (!err.description?.includes("message is not modified")) console.error("Error edit menu referral:", err);
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

    await ctx.editMessageText(`<blockquote><b>✅ Pembelian via Coin Berhasil!</b></blockquote>\n\n📦 Produk: Script ${escapeHTML(sc.name)}\n💰 Harga Dibayar: ${price.toLocaleString('id-ID')} Coin <i>(Diskon ${harga.diskonPersen}%)</i>\n💳 Sisa Coin: ${users[userIndex].balance.toLocaleString('id-ID')} Coin\n\n<i>File script dikirim secara instan...</i>`, { parse_mode: "html" }).catch(()=>{});

    try {
        const fileToSend = sc.file_id || sc.file; // Ambil File ID dari Cloud
        await ctx.telegram.sendDocument(ctx.chat.id, fileToSend, { caption: `📁 Script: ${escapeHTML(sc.name)}\n🎉 <i>Terima kasih telah menggunakan diskon ${harga.roleName}!</i>`, parse_mode: "html" });
    } catch (err) {
        await ctx.reply("❌ Gagal mengirim file script. Silakan hubungi admin.");
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


