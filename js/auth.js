// ═══════════════════════════════════════════════════
// auth.js — Login via Telegram Bot (tanpa register)
// Akun dibuat lewat bot, web tinggal login pake
// Telegram ID + password yang dikirim bot
// ═══════════════════════════════════════════════════

const Auth = (() => {
  const STORAGE_KEY = 'bayyz_session';
  const CFG_KEY     = 'bayyz_panel_cfg';

  // ── State ─────────────────────────────────────
  let _session = null;   // { telegramId, username, role, panels, token }
  let _panelCfg = null;  // { botToken, v1:{...}, v2:{...} }

  // ── Load dari localStorage ─────────────────────
  function loadSession() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) _session = JSON.parse(raw);
    } catch { _session = null; }
  }

  function loadPanelCfg() {
    try {
      const raw = localStorage.getItem(CFG_KEY);
      if (raw) _panelCfg = JSON.parse(raw);
    } catch { _panelCfg = null; }
  }

  function saveSession(s) {
    _session = s;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  }

  function savePanelCfg(cfg) {
    _panelCfg = cfg;
    localStorage.setItem(CFG_KEY, JSON.stringify(cfg));
  }

  // ── Telegram Bot API helper ────────────────────
  // Dipakai untuk:
  // 1. Verifikasi login (kirim code ke user)
  // 2. Kirim notif hasil create server
  async function tgAPI(method, params = {}) {
    const token = getPanelCfg()?.botToken;
    if (!token) throw new Error('Bot token belum diisi di Config!');
    const url = `https://api.telegram.org/bot${token}/${method}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const data = await res.json();
    if (!data.ok) {
      const desc = data.description || 'Telegram API error';
      // Deteksi user belum start bot
      if (
        desc.includes('bot was blocked') ||
        desc.includes('user is deactivated') ||
        desc.includes('chat not found') ||
        desc.includes('Forbidden') ||
        data.error_code === 403
      ) {
        const botUser = (typeof BOT_CONFIG !== 'undefined' && BOT_CONFIG.BOT_USERNAME)
          ? BOT_CONFIG.BOT_USERNAME
          : 'bot';
        throw new Error(`__BOT_NOT_STARTED__:https://t.me/${botUser}`);
      }
      throw new Error(desc);
    }
    return data.result;
  }

  // ── LOGIN FLOW ─────────────────────────────────
  // Cara kerja:
  // 1. User masukkan Telegram ID mereka
  // 2. Web kirim code 6-digit ke Telegram user via bot
  // 3. User masukkan code di web → verified
  // 4. Role (owner/reseller/seller) dibaca dari panel cfg
  //
  // Akun dibuat via /adduser di bot → botToken sudah ada

  let _pendingCode = null;
  let _pendingTeleId = null;
  let _codeExpiry = null;

  async function sendLoginCode(telegramId) {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    _pendingCode   = code;
    _pendingTeleId = String(telegramId);
    _codeExpiry    = Date.now() + 5 * 60 * 1000; // 5 menit

    const msg =
      `🔐 <b>BAYYZ PANEL — Login Code</b>\n\n` +
      `Kode verifikasi kamu:\n` +
      `<code>${code}</code>\n\n` +
      `<i>Berlaku 5 menit. Jangan kasih ke siapa pun!</i>`;

    await tgAPI('sendMessage', {
      chat_id: telegramId,
      text: msg,
      parse_mode: 'HTML',
    });

    return true;
  }

  function verifyCode(telegramId, inputCode) {
    if (!_pendingCode) return { ok: false, msg: 'Belum ada kode yang dikirim.' };
    if (String(telegramId) !== String(_pendingTeleId)) return { ok: false, msg: 'Telegram ID tidak cocok.' };
    if (Date.now() > _codeExpiry) {
      _pendingCode = null;
      return { ok: false, msg: 'Kode sudah expired. Request lagi.' };
    }
    if (inputCode.trim() !== _pendingCode) return { ok: false, msg: 'Kode salah.' };

    _pendingCode = null;
    return { ok: true };
  }

  function buildSessionFromId(telegramId) {
    // Determine role dari panel config
    const cfg = getPanelCfg();
    let role = 'user';
    const id = String(telegramId);
    if (cfg) {
      if (cfg.ownerIds && cfg.ownerIds.includes(id)) role = 'owner';
      else if (cfg.partnerIds && cfg.partnerIds.includes(id)) role = 'partner';
      else if (cfg.resellerIds && cfg.resellerIds.includes(id)) role = 'reseller';
      else if (cfg.sellerIds && cfg.sellerIds.includes(id)) role = 'seller';
    }
    return {
      telegramId: id,
      username: cfg?.usernames?.[id] || `user_${id}`,
      role,
      loginAt: Date.now(),
    };
  }

  // ── OWNER BYPASS ───────────────────────────────
  // Owner bisa login langsung dari Config page tanpa OTP
  // karena mereka yang setup panel ini
  function ownerLogin(telegramId) {
    const cfg = getPanelCfg();
    if (!cfg) return false;
    const ids = cfg.ownerIds || [];
    if (!ids.includes(String(telegramId))) return false;
    const sess = buildSessionFromId(telegramId);
    sess.role = 'owner';
    saveSession(sess);
    return true;
  }

  // ── PUBLIC ────────────────────────────────────
  function getSession()  { return _session; }
  function getPanelCfg() { return _panelCfg; }
  function isLoggedIn()  { return !!_session; }

  function canCreate(ver) {
    if (!_session) return false;
    const allowed = ['owner', 'partner', 'reseller', 'seller'];
    return allowed.includes(_session.role);
  }

  function isOwner()   { return _session?.role === 'owner'; }
  function isPartner() { return ['owner','partner'].includes(_session?.role); }

  function logout() {
    _session = null;
    localStorage.removeItem(STORAGE_KEY);
  }

  // ── Kirim notif via bot setelah create server ──
  async function sendNotif(telegramId, message) {
    try {
      await tgAPI('sendMessage', {
        chat_id: telegramId,
        text: message,
        parse_mode: 'HTML',
      });
    } catch (e) {
      console.warn('Notif gagal:', e.message);
    }
  }

  // ── Init ──────────────────────────────────────
  function init() {
    loadSession();
    loadPanelCfg();
  }

  return {
    init,
    // config
    getPanelCfg, savePanelCfg,
    // session
    getSession, isLoggedIn, isOwner, isPartner, canCreate, logout, saveSession,
    // login flow
    sendLoginCode, verifyCode, buildSessionFromId, ownerLogin,
    // notif
    tgAPI, sendNotif,
  };
})();
