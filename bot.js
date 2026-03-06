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
if (!fs.existsSync(voucherDB)) fs.writeFileSync(voucherDB, "{}");
if (!fs.existsSync(settingsDB)) fs.writeFileSync(settingsDB, JSON.stringify({
    script: true
}, null, 2));

// Load database
const loadScripts = () => JSON.parse(fs.readFileSync(scriptDB));
const saveScripts = (d) => fs.writeFileSync(scriptDB, JSON.stringify(d, null, 2));
const loadUsers = () => JSON.parse(fs.readFileSync(userDB));
const saveUsers = (d) => fs.writeFileSync(userDB, JSON.stringify(d, null, 2));
const loadVouchers = () => JSON.parse(fs.readFileSync(voucherDB));
const saveVouchers = (d) => fs.writeFileSync(voucherDB, JSON.stringify(d, null, 2));
const loadRatings = () => JSON.parse(fs.readFileSync(ratingDB));
const saveRatings = (d) => fs.writeFileSync(ratingDB, JSON.stringify(d, null, 2));
const loadSettings = () => JSON.parse(fs.readFileSync(settingsDB));
const saveSettings = (d) => fs.writeFileSync(settingsDB, JSON.stringify(d, null, 2));
const loadMissions = () => JSON.parse(fs.readFileSync(missionDB));
const saveMissions = (d) => fs.writeFileSync(missionDB, JSON.stringify(d, null, 2));


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
    text += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `📊 <b>Total Coin Sistem:</b> ${totalCoinSystem.toLocaleString('id-ID')} Coin\n`;
    text += `👥 <b>Total User:</b> ${users.length}\n`;
    text += `📄 <b>Halaman:</b> ${page + 1} / ${totalPages}\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

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
━━━━━━━━━━━━━━━━━━━━━━━━━━
<b>🪪 PROFILE KAMU</b>
<b>🆔 User ID:</b> <code>${userId}</code>
<b>📧 Username:</b> ${escapeHTML(userUsername)}
<b>📛 Nama:</b> <code>${escapeHTML(fullName)}</code>
<b>🪙 Coin:</b> ${saldo.toLocaleString("id-ID")} Coin
<b>👥 Refferal: </b>${myRefs} Orang
━━━━━━━━━━━━━━━━━━━━━━━━━━
<b>📊 STATISTIK BOT</b>
<b>👥 Total User Bot:</b> ${totalUser}
<b>🛒 Total Transaksi:</b> ${totalTransaksi}
<b>💰 Total Pemasukan:</b> ${escapeHTML(totalPemasukan.toLocaleString("id-ID"))} Coin
━━━━━━━━━━━━━━━━━━━━━━━━━━━</blockquote>
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
    }

    const buyerUsername = buyerInfo.username ? escapeHTML(buyerInfo.username) : "Tidak ada";
    const buyerName = escapeHTML(buyerInfo.name);

    const notificationText = `
<blockquote>💰 <b>ORDER BERHASIL DIPROSES!</b></blockquote>
<blockquote>━━━━━━━━━━━━━━━━━━━━━━━━━━
🕒 Waktu: ${waktu}
📦 Produk: ${escapeHTML(orderData.name)}
💰 Total: ${formatCoin(orderData.amount)} Coin
👤 Buyer: ${buyerName}
🆔 User ID: <code>${buyerInfo.id}</code>
📱 Username: ${buyerInfo.username ? "@" + buyerUsername : "Tidak ada"}
━━━━━━━━━━━━━━━━━━━━━━━━━━</blockquote>
<blockquote>📋 Detail Produk:
${productDetails}
━━━━━━━━━━━━━━━</blockquote>
<blockquote>📊 Total Pembelian User: ${formatCoin(buyerInfo.totalSpent)} Coin</blockquote>`.trim();

    const contactButton = {
      text: "📞 BELANJA PRODUK",
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

bot.use(async (ctx, next) => {
    // TAMBAHKAN BARIS INI: Abaikan pengecekan jika bot sedang berada di grup
    if (ctx.chat && ctx.chat.type !== 'private') return next();

    // Kode asli kamu di bawahnya tetap sama
    if (ctx.from && String(ctx.from.id) === String(config.ownerId)) return next();

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
    bot.on("text", async (ctx) => {
        const msg = ctx.message;
        const prefix = config.prefix;

        const body = (msg.text || "").trim();
        const isCmd = body.startsWith(prefix);
        const args = body.split(/ +/).slice(1);
        const text = args.join(" ");
        const command = isCmd
            ? body.slice(prefix.length).trim().split(" ")[0].toLowerCase()
            : body.toLowerCase();
            
        const fromId = ctx.from.id;
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
                        const bonus = 200000; 
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
━━━━━━━━━━━━━━━━━━━━━━━━━━
Proses <i>reset</i> coin (Sapu Jagat) telah selesai dilakukan.

📊 <b>Statistik Reset:</b>
👥 Total User Direset: <b>${totalUserDireset} Orang</b>
💰 Total Coin Dihanguskan: <b>${totalCoinDihapus.toLocaleString('id-ID')} Coin</b>
━━━━━━━━━━━━━━━━━━━━━━━━━━
`.trim();
                return ctx.reply(resetText, { parse_mode: "HTML" });
            }
            return ctx.reply("❌ <b>Input tidak valid.</b>\n👇 Balas dengan mengetik <code>oke</code> untuk lanjut, atau <code>batal</code> untuk membatalkan.", { parse_mode: "HTML" });
        }
        
        // ===== TANGKAP BALASAN OWNER KE USER =====
        if (isOwner(ctx) && ctx.message.reply_to_message) {
            const repMsg = ctx.message.reply_to_message;
            let targetId = null;

            if (global.csHistory && global.csHistory[repMsg.message_id]) {
                targetId = global.csHistory[repMsg.message_id];
            } 
            else if (repMsg.text) {
                const match = repMsg.text.match(/ID:\s*(\d+)/);
                if (match) targetId = match[1];
            }

            if (targetId) {
                ctx.telegram.sendMessage(targetId, `👨‍💻 <b>Balasan dari Admin:</b>\n\n${escapeHTML(body)}`, { parse_mode: "HTML" })
                    .then(() => ctx.reply("✅ Balasan berhasil dikirim ke user."))
                    .catch(() => ctx.reply("❌ Gagal mengirim balasan. User mungkin telah memblokir bot."));
                return; 
            }
        }

        // ===== TANGKAP CHAT DARI USER KE CS (OWNER) =====
        if (pendingCsChat[fromId]) {
            global.csHistory = global.csHistory || {}; 
            
            try {
                const fwdMsg = await ctx.telegram.forwardMessage(config.ownerId, ctx.chat.id, ctx.message.message_id);
                global.csHistory[fwdMsg.message_id] = fromId; 

                const infoMsg = await ctx.telegram.sendMessage(config.ownerId, `☝️ <b>Tiket Bantuan (CS)</b>\n👤 Dari: ${escapeHTML(ctx.from.first_name)}\n🆔 ID: <code>${fromId}</code>\n\n<i>*Silakan Reply (Balas) pesan yang diteruskan di atas, atau balas pesan ini untuk menjawab user.</i>`, { parse_mode: "HTML" });
                global.csHistory[infoMsg.message_id] = fromId;

                ctx.reply("✅ <i>Pesan berhasil dikirim ke Admin. Mohon tunggu balasannya...</i>", { parse_mode: "HTML" });
            } catch (err) {
                ctx.reply("❌ <i>Gagal mengirim pesan ke Admin.</i>", { parse_mode: "HTML" });
            }
            return; 
        }
        
        switch (command) {
// ===== MENU / START =====
case "menu":
case "start": {
    if (args[0] && args[0].startsWith("redeem_")) {
        const kode = args[0].replace("redeem_", "").toUpperCase();

        global.redeemLock = global.redeemLock || new Set();
        if (global.redeemLock.has(fromId)) return; 
        global.redeemLock.add(fromId);

        try {
            const vouchers = loadVouchers();

            if (!vouchers[kode])
                return ctx.reply("❌ Kode voucher tidak ditemukan atau salah.");

            if (vouchers[kode].kuota <= 0)
                return ctx.reply("❌ Maaf, kuota voucher ini sudah habis (Siapa cepat dia dapat!).");

            if (vouchers[kode].claimedBy.includes(fromId))
                return ctx.reply("❌ Kamu sudah pernah klaim voucher ini!");

            const users = loadUsers();
            const userIndex = users.findIndex(u => u.id === fromId);

            if (userIndex === -1)
                return ctx.reply("❌ Error: Akun belum terdaftar. Silakan ketik /start kembali.");

            users[userIndex].balance = (users[userIndex].balance || 0) + vouchers[kode].nominal;
            vouchers[kode].kuota -= 1; 
            vouchers[kode].claimedBy.push(fromId);

            saveUsers(users);
            saveVouchers(vouchers);

            return ctx.reply(
                `🎉 <b>SELAMAT!</b>\n\n` +
                `Kamu berhasil menukarkan kode voucher <code>${kode}</code> dari link!\n` +
                `💰 Coin bertambah ${vouchers[kode].nominal.toLocaleString('id-ID')} Coin\n` +
                `🪙 Coin sekarang: ${users[userIndex].balance.toLocaleString('id-ID')} Coin`,
                { parse_mode: "HTML" }
            );
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
                   { text: "🎁 Claim Harian", callback_data: "claim_harian" },
                   { text: "🗂 List Script", callback_data: "buyscript" }
                ],
                [
                    { text: "🤝 Referral", callback_data: "menu_referral" },
                    { text: "💸 Kirim Coin", callback_data: "transfer_coin" }
                ],
                [
                   { text: "🎯 Misi Coin", callback_data: "misi_coin" },
                   { text: "👤 Cek Profil", callback_data: "profile" }
                ],
                [
                    { text: "🌟 Cek Rating", callback_data: "cek_rating" },
                    { text: "🏆 Top Pengguna", callback_data: "top_users" }
                ],
                [
                   { text: "🎧 Cs / Tiket Bantuan", callback_data: "cs_ai_start" }
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
    
    // Hapus titik/koma dari input nominal sebelum diubah jadi angka
    const nominal = parseInt(args[1].replace(/[^0-9]/g, ''));
    const kuota = parseInt(args[2]);

    if (isNaN(nominal) || isNaN(kuota)) {
        return ctx.reply("❌ Nominal dan kuota harus berupa angka!");
    }

    const vouchers = loadVouchers();
    if (vouchers[kode]) {
        return ctx.reply("❌ Kode voucher sudah terdaftar!");
    }

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
`🎉 <b>FREE COIN UNTUK MEMBELI PRODUK YANG KAMU BUTUHKAN</b>
SEPERTI SCRIPT BOT
━━━━━━━━━━━━━━━━━━━━━━
💰 Coin: <b>${nominal.toLocaleString('id-ID')} Coin</b>
🎁 Hadiah Untuk: <b>${kuota}</b> orang
━━━━━━━━━━━━━━━━━━━━━━

🔑 Kode Voucher:
<code>${kode}</code>

🚀 Klaim Sekarang:
${redeemLink}`,
        { parse_mode: "HTML" }
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
        if (!vouchers[kode]) return ctx.reply("❌ Kode voucher tidak ditemukan atau salah.");
        
        if (vouchers[kode].kuota <= 0) return ctx.reply("❌ Maaf, kuota voucher ini sudah habis.");
        if (vouchers[kode].claimedBy.includes(fromId)) return ctx.reply("❌ Kamu sudah pernah klaim voucher ini!");
        
        const users = loadUsers();
        const userIndex = users.findIndex(u => u.id === fromId);
        if (userIndex === -1) return ctx.reply("❌ Error: User tidak ditemukan."); 
        
        users[userIndex].balance = (users[userIndex].balance || 0) + vouchers[kode].nominal;
        vouchers[kode].kuota -= 1;
        vouchers[kode].claimedBy.push(fromId);
        
        saveUsers(users);
        saveVouchers(vouchers);
        
        return ctx.reply(`🎉 <b>SELAMAT!</b>\n\nKamu berhasil menukarkan kode voucher <code>${kode}</code>.\n💰 Coin bertambah ${vouchers[kode].nominal.toLocaleString('id-ID')} Coin\n🪙 Coin sekarang: ${users[userIndex].balance.toLocaleString('id-ID')} Coin`, { parse_mode: "HTML" });
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
━━━━━━━━━━━━━━━━━━━━━━━━━━
<b>📛 Nama:</b> <code>${escapeHTML(fullName)}</code>
<b>👤 Nama Depan:</b> <code>${escapeHTML(firstName)}</code>
<b>👥 Nama Belakang:</b> <code>${escapeHTML(lastName)}</code>
<b>🆔 User ID:</b> <code>${user.id}</code>
<b>📧 Username:</b> ${escapeHTML(userUsername)}
<b>📅 Join Date:</b> ${new Date(user.join_date).toLocaleDateString('id-ID')}
<b>💰 Total Spent:</b> ${formatCoin(user.total_spent || 0)} Coin
<b>📊 Total Transaksi:</b> ${user.history ? user.history.length : 0}
━━━━━━━━━━━━━━━━━━━━━━━━━━
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
    const allScripts = loadScripts();
    if (!allScripts.length) return ctx.reply("📭 Belum ada script.");

    const buttons = allScripts.map((s, i) => ([
        { text: `📂 ${escapeHTML(s.name)} - ${s.price} Coin`, callback_data: `getscript_detail|${i}` }
    ]));

    return ctx.reply(`<b>📦 DAFTAR SCRIPT</b>\n\nPilih Script untuk melihat detail:`, { parse_mode: "HTML", reply_markup: { inline_keyboard: buttons } });
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

    const confirmText = `⚠️ <b>PERINGATAN BAHAYA (SAPU JAGAT)</b> ⚠️\n━━━━━━━━━━━━━━━━━━━━━━━━━━\nApakah Anda yakin ingin <b>MENGHAPUS SEMUA COIN USER</b> menjadi 0 Coin?\nTindakan ini tidak dapat dibatalkan dan coin user akan hangus!\n\n👇 <b>Silakan balas pesan ini:</b>\nKetik <code>oke</code> untuk melanjutkan penghapusan.\nKetik <code>batal</code> untuk membatalkan.`;
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
}
}); // End of bot.on("text")

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

    const profileText = `<blockquote><b>🪪 Profile Kamu</b>\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n<b>📛 Nama:</b> <code>${escapeHTML(fullName)}</code>\n<b>🆔 User ID:</b> <code>${user.id}</code>\n<b>📧 Username:</b> ${escapeHTML(userUsername)}\n<b>📅 Join Date:</b> ${new Date(user.join_date).toLocaleDateString('id-ID')}\n<b>💰 Total Spent:</b> ${formatCoin(user.total_spent || 0)} Coin\n<b>📊 Total Transaksi:</b> ${user.history ? user.history.length : 0}\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n<b>📋 Last 3 Transactions:</b>\n\n${lastTransactions}</blockquote>`;

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
    
    if (pendingStartArgs[userId]) {
        const arg = pendingStartArgs[userId];
        delete pendingStartArgs[userId]; 

        // ===== 1. LOGIC REDEEM VOUCHER =====
        if (arg.startsWith("redeem_")) {
            const kode = arg.replace("redeem_", "").toUpperCase();
            global.redeemLock = global.redeemLock || new Set();
            if (global.redeemLock.has(userId)) return;
            global.redeemLock.add(userId);

            try {
                const vouchers = loadVouchers();
                if (!vouchers[kode]) return ctx.reply("❌ Akses diberikan, tapi Kode voucher dari link tidak ditemukan/salah.", {parse_mode:"HTML"});
                if (vouchers[kode].kuota <= 0) return ctx.reply("❌ Akses diberikan, tapi kuota voucher link ini sudah habis.", {parse_mode:"HTML"});
                if (vouchers[kode].claimedBy.includes(userId)) return ctx.reply("❌ Akses diberikan. Kamu sudah pernah klaim voucher link ini!", {parse_mode:"HTML"});

                const users = loadUsers();
                const userIndex = users.findIndex(u => u.id === userId);
                
                if (userIndex === -1) {
                    return ctx.reply("✅ <b>Akses Diberikan!</b>\n\nKarena kamu pengguna baru, silakan ketik /start atau klik link vouchernya sekali lagi untuk mengaktifkan akun & menerima coin.", { parse_mode: "HTML" });
                }

                users[userIndex].balance = (users[userIndex].balance || 0) + vouchers[kode].nominal;
                vouchers[kode].kuota -= 1;
                vouchers[kode].claimedBy.push(userId);
                saveUsers(users); saveVouchers(vouchers);

                return ctx.reply(`🎉 <b>VERIFIKASI & KLAIM SUKSES!</b>\n\nTerima kasih sudah join channel. Kode voucher <code>${kode}</code> otomatis diproses!\n💰 Coin bertambah ${vouchers[kode].nominal.toLocaleString('id-ID')} Coin\n🪙 Coin sekarang: ${users[userIndex].balance.toLocaleString('id-ID')} Coin`, { parse_mode: "HTML" });
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
                        const bonus = 200000; 
                        users[inviterIndex].balance = (users[inviterIndex].balance || 0) + bonus;
                        users[inviterIndex].referrals = (users[inviterIndex].referrals || 0) + 1;
                        users[inviterIndex].ref_earnings = (users[inviterIndex].ref_earnings || 0) + bonus;
                        
                        ctx.telegram.sendMessage(inviterId, `🎉 <b>HORE!</b>\nSeseorang telah bergabung menggunakan link referral kamu!\n💰 Coin kamu bertambah ${bonus.toLocaleString('id-ID')} Coin`, { parse_mode: "HTML" }).catch(() => {});
                    }
                }
                saveUsers(users);
                
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
                   { text: "🎁 Claim Harian", callback_data: "claim_harian" },
                   { text: "🗂 List Script", callback_data: "buyscript" }
                ],
                [
                    { text: "🤝 Referral", callback_data: "menu_referral" },
                    { text: "💸 Kirim Coin", callback_data: "transfer_coin" }
                ],
                [
                   { text: "🎯 Misi Coin", callback_data: "misi_coin" },
                   { text: "👤 Cek Profil", callback_data: "profile" }
                ],
                [
                    { text: "🌟 Cek Rating", callback_data: "cek_rating" },
                    { text: "🏆 Top Pengguna", callback_data: "top_users" }
                ],
                [
                   { text: "🎧 Cs / Tiket Bantuan", callback_data: "cs_ai_start" }
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
    
    const captionText = `<blockquote>🎧 <b>LIVE CHAT / TIKET BANTUAN</b></blockquote>\n━━━━━━━━━━━━━━━━━━━━━━━━━\nHalo! Ada yang bisa kami bantu? \n\nSilakan ketik keluhan, pertanyaan, atau kendala kamu (misal: topup nyangkut, pesanan error, dll) dengan membalas pesan ini. \n\nPesanmu akan langsung diteruskan ke Admin / Owner. Admin akan membalas secepat mungkin.\n\n👇 <i>Ketik pesanmu di bawah...</i>`.trim();
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
    
    const captionText = menuTextBot(ctx);
    const keyboard = {
        inline_keyboard: [
                [
                   { text: "🎁 Claim Harian", callback_data: "claim_harian" },
                   { text: "🗂 List Script", callback_data: "buyscript" }
                ],
                [
                    { text: "🤝 Referral", callback_data: "menu_referral" },
                    { text: "💸 Kirim Coin", callback_data: "transfer_coin" }
                ],
                [
                   { text: "🎯 Misi Coin", callback_data: "misi_coin" },
                   { text: "👤 Cek Profil", callback_data: "profile" }
                ],
                [
                    { text: "🌟 Cek Rating", callback_data: "cek_rating" },
                    { text: "🏆 Top Pengguna", callback_data: "top_users" }
                ],
                [
                   { text: "🎧 Cs / Tiket Bantuan", callback_data: "cs_ai_start" }
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
  const captionText = `<blockquote><b>🤝 PROGRAM REFERRAL</b>\n━━━━━━━━━━━━━━━━━━━━━━━━━\nDapatkan coin gratis dengan cara mengajak temanmu menggunakan bot ini!</blockquote>\n\nSetiap teman yang mendaftar melalui link kamu, kamu akan mendapatkan bonus coin.\n\n🎁 <b>Bonus Reward:</b> 1.000.000 Coin / teman\n(Bonus otomatis masuk ke coin bot kamu)\n\n👇 <b>Link Referral Unik Kamu:</b>\n<code>${refLink}</code>\n<i>(Tap link di atas untuk menyalin)</i>\n\n📊 <b>Statistik Kamu Saat Ini:</b>\n👥 Teman diundang: <b>${myRefs} Orang</b>\n💰 Total pendapatan: <b>${myEarnings.toLocaleString('id-ID')} Coin</b>`.trim();

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

    const allScripts = loadScripts();
    if (!allScripts.length) return ctx.editMessageText("📭 Belum ada script.");

    const buttons = allScripts.map((s, i) => ([{ text: `📂 ${escapeHTML(s.name)} - ${formatCoin(s.price)} Coin`, callback_data: `getscript_detail|${i}` }]));

    return ctx.editMessageText("<b>📦 DAFTAR SCRIPT</b>\n\nPilih Script untuk melihat detail:", { parse_mode: "HTML", reply_markup: { inline_keyboard: buttons } });
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

    const text = `<blockquote><b>📝 Konfirmasi Pemesanan</b></blockquote>\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n📦 Produk: Script ${escapeHTML(sc.name)}\n\n💰 Harga: ${Number(sc.price).toLocaleString("id-ID")} Coin\n🕒 Waktu: ${waktu}\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n<blockquote><b>📝 Deskripsi:</b></blockquote>\n${escapeHTML(sc.desk || "-")}\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n⚠️ Apakah Anda yakin ingin melanjutkan pembayaran?`.trim();

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


