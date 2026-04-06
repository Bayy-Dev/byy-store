// ═══════════════════════════════════════════════════
// bot.js — Konfigurasi Bot & Owner (EDIT DI SINI)
// ═══════════════════════════════════════════════════

const BOT_CONFIG = {
  // Token bot Telegram kamu (dari @BotFather)
  BOT_TOKEN: '8288736458:AAHEZR8h6LkVc9W179WrzlFghs9wyuAbEng',

  // Username bot tanpa @ (untuk link start bot di alert)
  BOT_USERNAME: 'tesscbay_bot',

  // Telegram ID owner (bisa lebih dari satu, pisah koma)
  OWNER_IDS: ['7964139865'],
};

// ── Auto-inject ke Auth config saat halaman load ──
// Ini akan otomatis set token & owner ID ke localStorage
// tanpa perlu isi manual di halaman Config
(function injectBotConfig() {
  try {
    const CFG_KEY = 'bayyz_panel_cfg';
    const raw = localStorage.getItem(CFG_KEY);
    const existing = raw ? JSON.parse(raw) : {};

    // Inject token & ownerIds dari bot.js
    existing.botToken = BOT_CONFIG.BOT_TOKEN;

    // Gabungkan owner IDs (dari bot.js + yang sudah ada di config)
    const existingOwners = existing.ownerIds || [];
    const merged = [...new Set([...BOT_CONFIG.OWNER_IDS, ...existingOwners])];
    existing.ownerIds = merged;

    localStorage.setItem(CFG_KEY, JSON.stringify(existing));
  } catch (e) {
    console.warn('[bot.js] Gagal inject config:', e.message);
  }
})();
