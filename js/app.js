// ═══════════════════════════════════════════════════
// app.js — Main app: init, login flow, semua fitur
// ═══════════════════════════════════════════════════

// ══════════════════════════════════════
// INIT
// ══════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  Auth.init();
  initRamGrids();
  initEventListeners();

  if (Auth.isLoggedIn()) {
    showApp();
  } else {
    showLogin();
  }
});

function showApp() {
  document.getElementById('login-screen').classList.remove('show');
  document.getElementById('app').style.display = 'flex';
  UI.updateUserChip();
  UI.updatePanelBadge();
  applyConfigToForm();
  applyRoleVisibility();
  showPage('dashboard');
}

// ── Sembunyikan semua menu untuk non-owner ────────
function applyRoleVisibility() {
  const isOwner = Auth.isOwner();
  const ownerOnlyPages = ['create-panel','add-panel','list-panel','create-mc','add-mc','list-mc','users','bulk-delete','config'];

  // Sembunyikan nav-item & bn-item yang owner-only
  ownerOnlyPages.forEach(page => {
    document.querySelectorAll(`.nav-item[data-page="${page}"], .bn-item[data-page="${page}"]`).forEach(el => {
      el.style.display = isOwner ? '' : 'none';
    });
  });

  // Sembunyikan nav-group-label selain Overview
  document.querySelectorAll('.nav-group-label').forEach(el => {
    el.style.display = (isOwner || el.textContent.trim() === 'Overview') ? '' : 'none';
  });

  // Tombol ⚙ di header
  const gearBtn = document.querySelector('.owner-only-header-cfg');
  if (gearBtn) gearBtn.style.display = isOwner ? '' : 'none';

  // Sidebar footer: owner → buka config, user → logout
  const userChip = document.querySelector('.sidebar-footer .user-chip');
  if (userChip) {
    userChip.setAttribute('onclick', isOwner ? "UI.showPage('config')" : 'logout()');
    let logoutHint = userChip.querySelector('.logout-hint');
    if (!isOwner) {
      if (!logoutHint) {
        logoutHint = document.createElement('div');
        logoutHint.className = 'logout-hint';
        logoutHint.style.cssText = 'font-size:10px;color:var(--red,#f44);margin-top:2px;';
        logoutHint.textContent = '⏻ Tap untuk Logout';
        const inner = userChip.querySelector('div');
        if (inner) inner.appendChild(logoutHint);
      }
    } else {
      if (logoutHint) logoutHint.remove();
    }
  }

  // Bottom nav: ganti Config → Logout untuk non-owner
  const bnConfig = document.querySelector('.bn-item[data-page="config"], .bn-item[data-page="__logout__"]');
  if (bnConfig) {
    if (!isOwner) {
      bnConfig.setAttribute('data-page', '__logout__');
      bnConfig.setAttribute('onclick', 'logout()');
      const span = bnConfig.querySelector('span');
      if (span) span.textContent = 'Logout';
      const svg = bnConfig.querySelector('svg');
      if (svg) svg.innerHTML = '<path d="M11 3H7a2 2 0 00-2 2v10a2 2 0 002 2h4M14 7l3 3-3 3M17 10H9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>';
    } else {
      bnConfig.setAttribute('data-page', 'config');
      bnConfig.setAttribute('onclick', "UI.showPage('config')");
      const span = bnConfig.querySelector('span');
      if (span) span.textContent = 'Config';
    }
  }
}

function showLogin() {
  document.getElementById('app').style.display = 'none';
  document.getElementById('login-screen').classList.add('show');
}

// ══════════════════════════════════════
// EVENT LISTENERS
// ══════════════════════════════════════
function initEventListeners() {
  // sidebar overlay click
  document.querySelector('.sidebar-overlay')?.addEventListener('click', UI.closeSidebar);

  // modal overlay click to close
  document.querySelectorAll('.modal-overlay').forEach(o => {
    o.addEventListener('click', e => { if (e.target === o) UI.closeAllModals(); });
  });

  // confirm modal
  document.getElementById('confirm-exec-btn')?.addEventListener('click', UI._execConfirm);
  document.getElementById('confirm-cancel-btn')?.addEventListener('click', UI._cancelConfirm);

  // mc software change
  document.getElementById('mc-software')?.addEventListener('change', onMcSoftwareChange);
  document.getElementById('am-software')?.addEventListener('change', () => {});

  // login form
  document.getElementById('login-send-btn')?.addEventListener('click', loginSendCode);
  document.getElementById('login-verify-btn')?.addEventListener('click', loginVerify);
  document.getElementById('login-tg-id')?.addEventListener('keydown', e => { if (e.key === 'Enter') loginSendCode(); });
  document.getElementById('login-code')?.addEventListener('keydown', e => { if (e.key === 'Enter') loginVerify(); });

  // config save
  document.getElementById('cfg-save-v1')?.addEventListener('click', () => saveConfig('v1'));
  document.getElementById('cfg-save-v2')?.addEventListener('click', () => saveConfig('v2'));
  document.getElementById('cfg-test-v1')?.addEventListener('click', () => testPanel('v1'));
  document.getElementById('cfg-test-v2')?.addEventListener('click', () => testPanel('v2'));
  document.getElementById('cfg-save-auth')?.addEventListener('click', saveAuthConfig);
}

// ══════════════════════════════════════
// LOGIN FLOW
// ══════════════════════════════════════
let loginStep = 1; // 1=enter id, 2=enter code

async function loginSendCode() {
  const tgId = UI.val('login-tg-id').trim();
  if (!tgId || !/^\d+$/.test(tgId)) { UI.toast('Masukkan Telegram ID yang valid (angka)!', 'error'); return; }

  UI.setBtn('login-send-btn', true, 'Mengirim...');
  UI.setHTML('login-msg', '');

  try {
    await Auth.sendLoginCode(tgId);
    UI.toast('Kode dikirim ke Telegram kamu!', 'success');
    UI.show('login-step2');
    UI.hide('login-step1');
    document.getElementById('login-code')?.focus();
    loginStep = 2;
  } catch (e) {
    let msg = e.message;
    let htmlMsg = '';

    if (msg.includes('Bot token')) {
      msg = 'Bot token belum dikonfigurasi. Hubungi admin!';
      htmlMsg = `<div class="alert alert-error" style="margin:0">${msg}</div>`;
    } else if (msg.startsWith('__BOT_NOT_STARTED__:')) {
      const botLink = msg.split('__BOT_NOT_STARTED__:')[1];
      htmlMsg = `<div class="alert alert-error" style="margin:0;line-height:1.7">
        ⚠️ Kamu belum start bot nya, silahkan start bot
        <a href="${botLink}" target="_blank" style="color:#00e5ff;font-weight:bold;text-decoration:underline">${botLink}</a>
        terlebih dahulu agar bisa menerima OTP login.
      </div>`;
      msg = 'Kamu belum start bot! Klik link di bawah untuk start bot.';
    } else {
      htmlMsg = `<div class="alert alert-error" style="margin:0">${msg}</div>`;
    }

    UI.setHTML('login-msg', htmlMsg);
    UI.toast(msg, 'error');
  }
  UI.setBtn('login-send-btn', false, 'Kirim Kode');
}

async function loginVerify() {
  const tgId = UI.val('login-tg-id').trim();
  const code = UI.val('login-code').trim();
  if (!code) { UI.toast('Masukkan kode verifikasi!', 'error'); return; }

  UI.setBtn('login-verify-btn', true, 'Verifikasi...');
  const result = Auth.verifyCode(tgId, code);
  if (!result.ok) {
    UI.toast(result.msg, 'error');
    UI.setBtn('login-verify-btn', false, 'Verifikasi & Masuk');
    return;
  }

  const sess = Auth.buildSessionFromId(tgId);
  Auth.saveSession(sess);
  UI.toast(`Selamat datang, ${sess.username}!`, 'success');
  setTimeout(showApp, 500);
}

function loginBack() {
  UI.show('login-step1');
  UI.hide('login-step2');
  loginStep = 1;
}

// Owner bypass login langsung
function ownerBypassLogin() {
  const tgId = UI.val('bypass-tg-id').trim();
  if (!tgId) { UI.toast('Masukkan Telegram ID!', 'error'); return; }
  const ok = Auth.ownerLogin(tgId);
  if (!ok) { UI.toast('ID ini bukan owner. Cek config!', 'error'); return; }
  UI.toast('Login sebagai Owner!', 'success');
  setTimeout(showApp, 400);
}

function logout() {
  Auth.logout();
  UI.toast('Berhasil logout', 'info');
  setTimeout(showLogin, 400);
}

// ══════════════════════════════════════
// RAM GRIDS INIT
// ══════════════════════════════════════
function initRamGrids() {
  UI.buildRamGrid('cp-ram-grid', CFG.PANEL_RAM, 'cp-ram-idx', updateCpPreview);
  UI.buildRamGrid('ap-ram-grid', CFG.PANEL_RAM, 'ap-ram-idx', null);
  UI.buildRamGrid('mc-ram-grid', CFG.MC_RAM, 'mc-ram-idx', updateMcPreview);
  UI.buildRamGrid('am-ram-grid', CFG.MC_RAM, 'am-ram-idx', null);
}

function updateCpPreview(idx) {
  const t = CFG.PANEL_RAM[idx];
  if (!t) return;
  const spec = t.ram === 0 ? 'Unlimited RAM / Disk / CPU' : `${t.ram/1024}GB RAM · ${t.disk/1024}GB Disk · ${t.cpu}% CPU`;
  UI.setHTML('cp-preview', `
    <div style="padding:14px;background:var(--bg4);border-radius:var(--rs);border:1px solid var(--border2)">
      <div style="font-family:var(--mono);font-size:18px;color:var(--cyan);margin-bottom:4px">${t.label}</div>
      <div style="font-size:12px;color:var(--text3)">${spec}</div>
    </div>
  `);
}

function updateMcPreview(idx) {
  const t = CFG.MC_RAM[idx];
  if (!t) return;
  UI.setHTML('mc-preview', `
    <div style="padding:14px;background:var(--bg4);border-radius:var(--rs);border:1px solid var(--border2)">
      <div style="font-family:var(--mono);font-size:16px;color:var(--cyan);margin-bottom:8px">${t.label} RAM</div>
      <div class="flex-b mb-8" style="font-size:12px"><span class="text-muted">Disk</span><span class="text-mono">${t.disk/1024}GB</span></div>
      <div class="flex-b" style="font-size:12px"><span class="text-muted">CPU</span><span class="text-mono">${t.cpu}%</span></div>
    </div>
  `);
}

function onMcSoftwareChange() {
  const idx = parseInt(UI.val('mc-software'));
  const sw = CFG.MC_SOFTWARE[idx];
  const grp = document.getElementById('mc-version-group');
  if (grp) grp.style.display = sw?.autoLatest ? 'none' : '';
  if (sw?.autoLatest) UI.setVal('mc-version', 'latest');
}

// ══════════════════════════════════════
// CONFIG
// ══════════════════════════════════════
function applyConfigToForm() {
  const cfg = Auth.getPanelCfg() || {};
  ['v1','v2'].forEach(v => {
    const p = cfg[v] || {};
    UI.setVal(`cfg-${v}-domain`, p.domain || '');
    UI.setVal(`cfg-${v}-plta`,   p.plta   || '');
    UI.setVal(`cfg-${v}-pltc`,   p.pltc   || '');
    UI.setVal(`cfg-${v}-loc`,    p.loc    || '1');
    UI.setVal(`cfg-${v}-egg`,    p.egg    || (v==='v1' ? '16' : '15'));
    UI.setVal(`cfg-${v}-nest`,   p.nest   || '5');
    UI.setVal(`cfg-${v}-mcegg`,  p.mcEgg  || '1');
  });
  UI.setVal('cfg-bot-token', cfg.botToken || '');
  UI.setVal('cfg-owner-ids', (cfg.ownerIds || []).join(','));
  UI.setVal('cfg-reseller-ids', (cfg.resellerIds || []).join(','));
  UI.setVal('cfg-seller-ids', (cfg.sellerIds || []).join(','));
}

function saveConfig(ver) {
  const existing = Auth.getPanelCfg() || {};
  existing[ver] = {
    domain: UI.val(`cfg-${ver}-domain`).replace(/\/+$/, ''),
    plta:   UI.val(`cfg-${ver}-plta`),
    pltc:   UI.val(`cfg-${ver}-pltc`),
    loc:    UI.val(`cfg-${ver}-loc`)  || '1',
    egg:    UI.val(`cfg-${ver}-egg`)  || (ver==='v1' ? '16' : '15'),
    nest:   UI.val(`cfg-${ver}-nest`) || '5',
    mcEgg:  UI.val(`cfg-${ver}-mcegg`)|| '1',
  };
  Auth.savePanelCfg(existing);
  UI.toast(`Config Panel ${ver.toUpperCase()} tersimpan!`, 'success');
  UI.updatePanelBadge();
}

function saveAuthConfig() {
  const existing = Auth.getPanelCfg() || {};
  existing.botToken    = UI.val('cfg-bot-token').trim();
  existing.ownerIds    = UI.val('cfg-owner-ids').split(',').map(s=>s.trim()).filter(Boolean);
  existing.resellerIds = UI.val('cfg-reseller-ids').split(',').map(s=>s.trim()).filter(Boolean);
  existing.sellerIds   = UI.val('cfg-seller-ids').split(',').map(s=>s.trim()).filter(Boolean);
  Auth.savePanelCfg(existing);
  UI.toast('Auth config tersimpan!', 'success');
}

async function testPanel(ver) {
  UI.toast(`Testing Panel ${ver.toUpperCase()}...`, 'info');
  const el = document.getElementById(`cfg-${ver}-status`);

  const result = await PteroAPI.pingPanel(ver);
  if (result === 'ok') {
    UI.toast(`Panel ${ver.toUpperCase()} Online ✓`, 'success');
    if (el) { el.className = 'badge b-green'; el.textContent = 'Online'; }
  } else if (result === 'cors') {
    // CORS = domain hidup, API key tidak bisa diverifikasi dari browser
    // Ini normal untuk panel yang tidak punya CORS header
    UI.toast(`Panel ${ver.toUpperCase()} aktif (CORS terbatas — coba langsung deploy)`, 'info');
    if (el) { el.className = 'badge b-amber'; el.textContent = 'CORS'; }
  } else if (result === 'auth') {
    UI.toast(`Panel ${ver.toUpperCase()} online tapi API key salah!`, 'error');
    if (el) { el.className = 'badge b-red'; el.textContent = 'Auth Error'; }
  } else {
    UI.toast(`Panel ${ver.toUpperCase()} tidak bisa dijangkau — cek domain!`, 'error');
    if (el) { el.className = 'badge b-red'; el.textContent = 'Error'; }
  }
}

// ══════════════════════════════════════
// DASHBOARD
// ══════════════════════════════════════
async function refreshDashboard() {
  UI.setBtn('btn-refresh-dash', true, 'Loading...');
  UI.setHTML('dash-status-list', '<div class="text-muted text-sm"><span class="spin">⟳</span> Cek status panel...</div>');
  UI.setHTML('dash-recent', UI.loadingTable(['Nama','Type','RAM']));

  let totalPanel=0, totalMc=0, totalUsers=0, recentServers=[];

  for (const ver of ['v1','v2']) {
    try {
      const all = await PteroAPI.getAllServers(ver);
      const users = await PteroAPI.getAllUsers(ver);
      const panels = all.filter(s => CFG.PANEL_EGG_IDS.includes(s.attributes.egg));
      const mcs    = all.filter(s => CFG.MC_EGG_IDS.includes(s.attributes.egg));
      totalPanel += panels.length;
      totalMc    += mcs.length;
      totalUsers += users.length;
      recentServers = recentServers.concat(all.slice(0,5).map(s => ({...s, _ver:ver})));

      appendDashStatus(ver, `${panels.length} Panel · ${mcs.length} MC · ${users.length} User`, true);
    } catch (e) {
      appendDashStatus(ver, e.message, false);
    }
  }

  UI.setHTML('stat-panel', totalPanel);
  UI.setHTML('stat-mc', totalMc);
  UI.setHTML('stat-users', totalUsers);
  UI.setHTML('stat-offline', '—');

  const rows = recentServers.slice(0,8).map(s => {
    const a = s.attributes;
    const isPanel = CFG.PANEL_EGG_IDS.includes(a.egg);
    const type = isPanel ? `<span class="badge b-cyan">Panel</span>` : `<span class="badge b-green">MC</span>`;
    return [`<span class="td-name">${UI.esc(a.name)}</span>`, type, fmtRam(a.limits.memory)];
  });
  UI.setHTML('dash-recent', UI.buildTable(['Nama','Type','RAM'], rows));
  UI.setBtn('btn-refresh-dash', false, '↻ Refresh');
}

function appendDashStatus(ver, info, online) {
  const el = document.getElementById('dash-status-list');
  if (!el) return;
  if (el.querySelector('.text-muted')) el.innerHTML = '';
  el.innerHTML += `
    <div class="cfg-row">
      <div><div class="cfg-title">Panel ${ver.toUpperCase()}</div><div class="cfg-sub">${UI.esc(info)}</div></div>
      <span class="badge ${online?'b-green':'b-red'}">${online?'✓ Online':'✗ Error'}</span>
    </div>`;
}

// ══════════════════════════════════════
// CREATE PANEL
// ══════════════════════════════════════
async function createPanel() {
  const ver      = UI.val('cp-ver');
  const username = UI.val('cp-username').trim().toLowerCase().replace(/[^a-z0-9_]/g,'');
  const target   = UI.val('cp-target').trim();
  const ramIdx   = parseInt(UI.val('cp-ram-idx'));

  if (!username)       return UI.toast('Username tidak valid!','error');
  if (isNaN(ramIdx))   return UI.toast('Pilih RAM tier!','error');

  const tier = CFG.PANEL_RAM[ramIdx];
  UI.clearLog('cp-log');
  UI.setBtn('cp-btn', true, 'Deploying...');

  try {
    const cfg = PteroAPI.getCfg(ver);
    UI.appendLog('cp-log', `⏳ Membuat user "${username}"...`, 'info');
    const { user, password, email } = await PteroAPI.createUser(ver, username);
    UI.appendLog('cp-log', `✅ User dibuat (ID: ${user.id})`, 'ok');

    UI.appendLog('cp-log', '⏳ Ambil egg config...', 'info');
    const eggData = await PteroAPI.getEgg(ver, cfg.nest || '5', cfg.egg || '16');

    UI.appendLog('cp-log', '⏳ Membuat server...', 'info');
    const payload = PteroAPI.buildPanelServerPayload(ver, user.id, username, tier);
    payload.startup = eggData.attributes.startup || '{{CMD_RUN}}';
    const srv = await PteroAPI.createServer(ver, payload);

    const spec = tier.ram === 0 ? 'Unlimited' : `${fmtRam(tier.ram)} RAM`;
    UI.appendLog('cp-log', `✅ Server dibuat (ID: ${srv.id})`, 'ok');
    UI.appendLog('cp-log', `━━━━━━━━━━━━━━━━`, 'muted');
    UI.appendLog('cp-log', `📧 Email: ${email}`);
    UI.appendLog('cp-log', `🔑 Pass:  ${password}`);
    UI.appendLog('cp-log', `💾 Spek:  ${spec}`);
    UI.appendLog('cp-log', `🌐 Panel: ${cfg.domain}`);

    // Kirim notif via bot
    const notifTarget = target || Auth.getSession()?.telegramId;
    if (notifTarget) {
      const msg = `🎉 <b>Panel Berhasil Dibuat!</b>\n\n<pre>SERVER ${ver.toUpperCase()}</pre>\n\n• <b>Email:</b> ${email}\n• <b>Password:</b> <code>${password}</code>\n• <b>Link:</b> <a href="${cfg.domain}">${cfg.domain}</a>\n\n• <b>Spek:</b> ${spec}\n• <b>Server ID:</b> <code>${srv.id}</code>\n\n<pre>Ganti password setelah login!</pre>`;
      await Auth.sendNotif(notifTarget, msg);
      UI.appendLog('cp-log', `📨 Notif terkirim ke ${notifTarget}`, 'ok');
    }

    UI.toast(`Panel "${username}" berhasil dibuat!`, 'success');
  } catch (e) {
    UI.appendLog('cp-log', `❌ Error: ${e.message}`, 'err');
    UI.toast('Gagal: ' + e.message, 'error');
  }
  UI.setBtn('cp-btn', false, '🚀 Deploy Panel');
}

// ══════════════════════════════════════
// ADD SERVER PANEL
// ══════════════════════════════════════
async function addServerPanel() {
  const ver      = UI.val('ap-ver');
  const pteroId  = UI.val('ap-ptero-id').trim();
  const srvName  = UI.val('ap-server-name').trim();
  const target   = UI.val('ap-target').trim();
  const ramIdx   = parseInt(UI.val('ap-ram-idx'));

  if (!pteroId || !/^\d+$/.test(pteroId)) return UI.toast('User ID Pterodactyl tidak valid!','error');
  if (!srvName)  return UI.toast('Nama server kosong!','error');
  if (isNaN(ramIdx)) return UI.toast('Pilih RAM tier!','error');

  const tier = CFG.PANEL_RAM[ramIdx];
  UI.clearLog('ap-log');

  try {
    UI.appendLog('ap-log','⏳ Cek user...','info');
    const user = await PteroAPI.getUser(ver, pteroId);
    UI.appendLog('ap-log', `✅ User: ${user.username}`, 'ok');

    const cfg = PteroAPI.getCfg(ver);
    const eggData = await PteroAPI.getEgg(ver, cfg.nest||'5', cfg.egg||'16');
    const payload  = PteroAPI.buildPanelServerPayload(ver, parseInt(pteroId), srvName, tier);
    payload.startup = eggData.attributes.startup || '{{CMD_RUN}}';
    payload.name = srvName;
    const srv = await PteroAPI.createServer(ver, payload);

    UI.appendLog('ap-log', `✅ Server "${srvName}" (ID: ${srv.id})`, 'ok');
    UI.appendLog('ap-log', `💾 ${fmtRam(tier.ram)} RAM`, '');

    const notifTarget = target || Auth.getSession()?.telegramId;
    if (notifTarget) {
      await Auth.sendNotif(notifTarget, `🎉 Server <b>${srvName}</b> berhasil ditambahkan!\n\n• <b>ID Server:</b> <code>${srv.id}</code>\n• <b>Spek:</b> ${fmtRam(tier.ram)} RAM · ${fmtRam(tier.disk)} Disk\n• <b>Panel:</b> <a href="${cfg.domain}">${cfg.domain}</a>`);
      UI.appendLog('ap-log', `📨 Notif terkirim`, 'ok');
    }
    UI.toast('Server berhasil ditambahkan!', 'success');
  } catch (e) {
    UI.appendLog('ap-log', `❌ ${e.message}`, 'err');
    UI.toast('Gagal: '+e.message,'error');
  }
}

// ══════════════════════════════════════
// CREATE MC SERVER
// ══════════════════════════════════════
async function createMcServer() {
  const ver      = UI.val('mc-ver');
  const username = UI.val('mc-username').trim().toLowerCase().replace(/[^a-z0-9_]/g,'');
  const swIdx    = parseInt(UI.val('mc-software'));
  const version  = UI.val('mc-version').trim() || 'latest';
  const target   = UI.val('mc-target').trim();
  const ramIdx   = parseInt(UI.val('mc-ram-idx'));

  if (!username)     return UI.toast('Username tidak valid!','error');
  if (isNaN(ramIdx)) return UI.toast('Pilih RAM tier!','error');

  const sw   = CFG.MC_SOFTWARE[swIdx];
  const tier = CFG.MC_RAM[ramIdx];
  UI.clearLog('mc-log');
  UI.setBtn('mc-btn', true, 'Deploying...');

  try {
    UI.appendLog('mc-log', `⏳ Buat user "${username}"...`,'info');
    const { user, password, email } = await PteroAPI.createUser(ver, username);
    UI.appendLog('mc-log', `✅ User dibuat (ID: ${user.id})`, 'ok');

    const cfg = PteroAPI.getCfg(ver);
    let eggStartup = '';
    try {
      const eggData = await PteroAPI.getEgg(ver, cfg.nest||'5', String(sw.eggId));
      eggStartup = eggData.attributes.startup || '';
    } catch {}

    UI.appendLog('mc-log', `⏳ Buat server MC (${sw.label})...`, 'info');
    const payload = PteroAPI.buildMcServerPayload(ver, user.id, username, sw, tier, version, eggStartup);
    const srv = await PteroAPI.createServer(ver, payload);

    UI.appendLog('mc-log', `✅ Server dibuat (ID: ${srv.id})`, 'ok');
    UI.appendLog('mc-log', `━━━━━━━━━━━━━━━━`, 'muted');
    UI.appendLog('mc-log', `📧 Email: ${email}`);
    UI.appendLog('mc-log', `🔑 Pass:  ${password}`);
    UI.appendLog('mc-log', `🎮 SW:    ${sw.label}`);
    UI.appendLog('mc-log', `💾 RAM:   ${fmtRam(tier.ram)}`);

    const notifTarget = target || Auth.getSession()?.telegramId;
    if (notifTarget) {
      const msg = `🎮 <b>Server MC Berhasil Dibuat!</b>\n\n<pre>SERVER ${ver.toUpperCase()}</pre>\n\n• <b>Email:</b> ${email}\n• <b>Password:</b> <code>${password}</code>\n• <b>Link:</b> <a href="${cfg.domain}">${cfg.domain}</a>\n\n• <b>Software:</b> ${sw.label}\n• <b>RAM:</b> ${fmtRam(tier.ram)} | <b>Disk:</b> ${fmtRam(tier.disk)}\n• <b>Server ID:</b> <code>${srv.id}</code>`;
      await Auth.sendNotif(notifTarget, msg);
      UI.appendLog('mc-log', `📨 Notif terkirim`, 'ok');
    }
    UI.toast(`Server MC "${username}" berhasil dibuat!`,'success');
  } catch(e) {
    UI.appendLog('mc-log', `❌ ${e.message}`, 'err');
    UI.toast('Gagal: '+e.message,'error');
  }
  UI.setBtn('mc-btn', false, '🎮 Deploy MC Server');
}

// ══════════════════════════════════════
// ADD SERVER MC
// ══════════════════════════════════════
async function addServerMc() {
  const ver     = UI.val('am-ver');
  const pteroId = UI.val('am-ptero-id').trim();
  const srvName = UI.val('am-server-name').trim();
  const swIdx   = parseInt(UI.val('am-software'));
  const version = UI.val('am-version').trim() || 'latest';
  const target  = UI.val('am-target').trim();
  const ramIdx  = parseInt(UI.val('am-ram-idx'));

  if (!pteroId || !/^\d+$/.test(pteroId)) return UI.toast('User ID tidak valid!','error');
  if (!srvName)  return UI.toast('Nama server kosong!','error');
  if (isNaN(ramIdx)) return UI.toast('Pilih RAM tier!','error');

  const sw   = CFG.MC_SOFTWARE[swIdx];
  const tier = CFG.MC_RAM[ramIdx];
  UI.clearLog('am-log');

  try {
    const user = await PteroAPI.getUser(ver, pteroId);
    UI.appendLog('am-log', `✅ User: ${user.username}`, 'ok');

    const cfg = PteroAPI.getCfg(ver);
    let eggStartup = '';
    try { const ed = await PteroAPI.getEgg(ver, cfg.nest||'5', String(sw.eggId)); eggStartup = ed.attributes.startup||''; } catch {}

    const payload = PteroAPI.buildMcServerPayload(ver, parseInt(pteroId), srvName, sw, tier, version, eggStartup);
    const srv = await PteroAPI.createServer(ver, payload);
    UI.appendLog('am-log', `✅ Server "${srvName}" (ID: ${srv.id})`, 'ok');

    const notifTarget = target || Auth.getSession()?.telegramId;
    if (notifTarget) {
      await Auth.sendNotif(notifTarget, `🎮 Server MC <b>${srvName}</b> ditambahkan!\n\n• <b>Software:</b> ${sw.label}\n• <b>RAM:</b> ${fmtRam(tier.ram)}\n• <b>ID:</b> <code>${srv.id}</code>\n• <b>Panel:</b> <a href="${cfg.domain}">${cfg.domain}</a>`);
    }
    UI.toast('Server MC berhasil ditambahkan!', 'success');
  } catch(e) {
    UI.appendLog('am-log', `❌ ${e.message}`, 'err');
    UI.toast('Gagal: '+e.message,'error');
  }
}

// ══════════════════════════════════════
// LIST PANEL
// ══════════════════════════════════════
async function loadListPanel() {
  const ver = UI.val('lp-ver');
  UI.setHTML('lp-table', UI.loadingTable(['ID','Nama','Owner','RAM','Aksi']));
  try {
    const all  = await PteroAPI.getAllServers(ver);
    const cfg  = PteroAPI.getCfg(ver);
    const list = all.filter(s => CFG.PANEL_EGG_IDS.includes(s.attributes.egg));
    const rows = list.map(s => {
      const a = s.attributes;
      return [
        `<span class="td-mono">${a.id}</span>`,
        `<span class="td-name">${UI.esc(a.name)}</span>`,
        `<span class="td-mono">${a.user||'—'}</span>`,
        `<span class="td-mono">${fmtRam(a.limits.memory)}</span>`,
        `<div class="td-act">
          <a href="${cfg.domain}/admin/servers/view/${a.id}" target="_blank" class="btn btn-ghost btn-sm">Manage</a>
          <button class="btn btn-red btn-sm" onclick="promptDelete('${ver}','server','${a.id}','${UI.esc(a.name)}')">Del</button>
        </div>`,
      ];
    });
    UI.setHTML('lp-table', UI.buildTable(['ID','Nama','Owner ID','RAM','Aksi'], rows));
    UI.toast(`${list.length} server panel ditemukan`, 'success');
  } catch(e) {
    UI.setHTML('lp-table', `<div style="padding:16px" class="text-muted text-sm">❌ ${e.message}</div>`);
    UI.toast(e.message,'error');
  }
}

// ══════════════════════════════════════
// LIST MC
// ══════════════════════════════════════
async function loadListMc() {
  const ver = UI.val('lm-ver');
  UI.setHTML('lm-table', UI.loadingTable(['ID','Nama','Software','RAM','Aksi']));
  try {
    const all  = await PteroAPI.getAllServers(ver);
    const cfg  = PteroAPI.getCfg(ver);
    const list = all.filter(s => CFG.MC_EGG_IDS.includes(s.attributes.egg));
    const rows = list.map(s => {
      const a  = s.attributes;
      const sw = CFG.EGG_SOFTWARE_MAP[a.egg] || `Egg#${a.egg}`;
      return [
        `<span class="td-mono">${a.id}</span>`,
        `<span class="td-name">${UI.esc(a.name)}</span>`,
        `<span class="badge b-green" style="font-size:10px">${sw}</span>`,
        `<span class="td-mono">${fmtRam(a.limits.memory)}</span>`,
        `<div class="td-act">
          <a href="${cfg.domain}/admin/servers/view/${a.id}" target="_blank" class="btn btn-ghost btn-sm">Manage</a>
          <button class="btn btn-red btn-sm" onclick="promptDelete('${ver}','server','${a.id}','${UI.esc(a.name)}')">Del</button>
        </div>`,
      ];
    });
    UI.setHTML('lm-table', UI.buildTable(['ID','Nama','Software','RAM','Aksi'], rows));
    UI.toast(`${list.length} server MC ditemukan`, 'success');
  } catch(e) {
    UI.setHTML('lm-table', `<div style="padding:16px" class="text-muted text-sm">❌ ${e.message}</div>`);
    UI.toast(e.message,'error');
  }
}

// ══════════════════════════════════════
// USERS
// ══════════════════════════════════════
let _allUsers = [];

async function loadUsers() {
  const ver = UI.val('usr-ver');
  UI.setHTML('usr-table', UI.loadingTable(['ID','Username','Email','Role','Servers','Aksi']));
  try {
    _allUsers = await PteroAPI.getAllUsers(ver);
    renderUsersTable(ver, _allUsers);
    UI.toast(`${_allUsers.length} user ditemukan`, 'success');
  } catch(e) {
    UI.setHTML('usr-table', `<div style="padding:16px" class="text-muted text-sm">❌ ${e.message}</div>`);
    UI.toast(e.message,'error');
  }
}

function filterUsers() {
  const q   = UI.val('usr-search').toLowerCase();
  const ver = UI.val('usr-ver');
  renderUsersTable(ver, _allUsers.filter(u => u.attributes.username.toLowerCase().includes(q) || u.attributes.email.toLowerCase().includes(q)));
}

function renderUsersTable(ver, users) {
  const cfg = PteroAPI.getCfg(ver);
  const rows = users.map(u => {
    const a = u.attributes;
    const srvCount = a.relationships?.servers?.data?.length ?? '—';
    const role = a.root_admin ? `<span class="badge b-amber">Admin</span>` : `<span class="badge b-cyan">User</span>`;
    return [
      `<span class="td-mono">${a.id}</span>`,
      `<span class="td-name">${UI.esc(a.username)}</span>`,
      `<span class="td-mono">${UI.esc(a.email)}</span>`,
      role,
      `<span class="td-mono">${srvCount}</span>`,
      `<div class="td-act">
        <a href="${cfg.domain}/admin/users/view/${a.id}" target="_blank" class="btn btn-ghost btn-sm">Edit</a>
        <button class="btn btn-red btn-sm" onclick="promptDelete('${ver}','user','${a.id}','${UI.esc(a.username)}')">Del</button>
      </div>`,
    ];
  });
  UI.setHTML('usr-table', UI.buildTable(['ID','Username','Email','Role','Servers','Aksi'], rows));
}

// ══════════════════════════════════════
// DELETE (single)
// ══════════════════════════════════════
let _pendingDel = null;

function promptDelete(ver, type, id, name) {
  _pendingDel = { ver, type, id, name };
  UI.setHTML('del-msg', `Hapus ${type} "<b>${name}</b>" (ID: ${id}) dari panel ${ver.toUpperCase()}?`);
  UI.openModal('modal-delete');
}

async function executeDelete() {
  if (!_pendingDel) return;
  const { ver, type, id } = _pendingDel;
  UI.setBtn('del-exec-btn', true, 'Menghapus...');
  try {
    if (type === 'user') await PteroAPI.deleteUser(ver, id);
    else await PteroAPI.deleteServer(ver, id);
    UI.toast(`${type} ID ${id} berhasil dihapus!`, 'success');
    UI.closeModal('modal-delete');
  } catch(e) { UI.toast('Gagal hapus: '+e.message, 'error'); }
  UI.setBtn('del-exec-btn', false, 'Hapus');
  _pendingDel = null;
}

// ══════════════════════════════════════
// BULK DELETE
// ══════════════════════════════════════
async function doBulkDelete(type) {
  const confirmed = await UI.confirm(`Hapus semua ${type}? Tidak bisa di-undo!`, 'HAPUS');
  if (!confirmed) return;

  const ver    = UI.val(`bd-${type === 'panel' ? 'panel' : type === 'mc' ? 'mc' : 'usr'}-ver`);
  const exclRaw= UI.val(`bd-excl-${type === 'panel' ? 'panel' : type === 'mc' ? 'mc' : 'usr'}`);
  const excl   = exclRaw.split(',').map(s=>s.trim()).filter(Boolean);

  UI.clearLog('bd-log');
  UI.appendLog('bd-log', `⏳ Mengambil data...`, 'info');

  try {
    let toDelete = [];
    if (type === 'panel' || type === 'mc') {
      const all = await PteroAPI.getAllServers(ver);
      const eggIds = type === 'panel' ? CFG.PANEL_EGG_IDS : CFG.MC_EGG_IDS;
      toDelete = all.filter(s => eggIds.includes(s.attributes.egg) && !excl.includes(String(s.attributes.id)));
    } else {
      const all = await PteroAPI.getAllUsers(ver);
      toDelete = all.filter(u => !excl.includes(String(u.attributes.id)) && (u.attributes.relationships?.servers?.data?.length||0) === 0);
    }

    UI.appendLog('bd-log', `📋 Total yang akan dihapus: ${toDelete.length}`, 'info');
    let done=0, fail=0;

    for (const item of toDelete) {
      const a = item.attributes;
      try {
        if (type === 'user') await PteroAPI.deleteUser(ver, a.id);
        else await PteroAPI.deleteServer(ver, a.id);
        done++;
        UI.appendLog('bd-log', `✅ ${a.name || a.username} (ID:${a.id})`, 'ok');
      } catch(e) {
        fail++;
        UI.appendLog('bd-log', `❌ ${a.name || a.username} — ${e.message}`, 'err');
      }
    }

    UI.appendLog('bd-log', `━━━━━━━━━━━━━━━━`, 'muted');
    UI.appendLog('bd-log', `Selesai! Dihapus: ${done} | Gagal: ${fail}`, done > 0 ? 'ok' : 'err');
    UI.toast(`Selesai! ${done} dihapus, ${fail} gagal.`, done > 0 ? 'success' : 'error');
  } catch(e) {
    UI.appendLog('bd-log', `❌ ${e.message}`, 'err');
    UI.toast(e.message,'error');
  }
}

// ══════════════════════════════════════
// CREATE ADMIN (CADP)
// ══════════════════════════════════════
async function createAdminPanel() {
  const ver      = UI.val('cadp-ver');
  const username = UI.val('cadp-username').trim();
  const target   = UI.val('cadp-target').trim();
  if (!username) return UI.toast('Username kosong!','error');
  try {
    const { user, password, email } = await PteroAPI.createUser(ver, username, true);
    const cfg = PteroAPI.getCfg(ver);
    UI.toast(`Admin ${username} berhasil dibuat!`, 'success');
    const notifTarget = target || Auth.getSession()?.telegramId;
    if (notifTarget) {
      await Auth.sendNotif(notifTarget, `👑 <b>Admin Panel Dibuat!</b>\n\n• <b>Email:</b> ${email}\n• <b>Password:</b> <code>${password}</code>\n• <b>Login:</b> <a href="${cfg.domain}">${cfg.domain}</a>`);
    }
    UI.closeModal('modal-cadp');
  } catch(e) { UI.toast('Gagal: '+e.message,'error'); }
}
