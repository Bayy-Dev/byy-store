// ═══════════════════════════════════════════════════
// ui.js — UI helpers: toast, modal, nav, log, ram grid
// ═══════════════════════════════════════════════════

const UI = (() => {

  // ── TOAST ─────────────────────────────────────
  function toast(msg, type = 'info', duration = 4000) {
    const icons = { success: '✓', error: '✕', info: 'ℹ', warn: '⚠' };
    const el = document.createElement('div');
    el.className = `toast toast-${type === 'warn' ? 'warn' : type}`;
    el.innerHTML = `<span>${icons[type] || 'ℹ'}</span><span>${msg}</span>`;
    const container = document.getElementById('toast-container');
    container.appendChild(el);
    setTimeout(() => {
      el.style.animation = 'none';
      el.style.opacity = '0';
      el.style.transform = 'translateX(60px)';
      el.style.transition = '.3s';
      setTimeout(() => el.remove(), 300);
    }, duration);
  }

  // ── MODAL ─────────────────────────────────────
  function openModal(id) {
    const el = document.getElementById(id);
    if (el) { el.classList.add('show'); document.body.style.overflow = 'hidden'; }
  }
  function closeModal(id) {
    const el = document.getElementById(id);
    if (el) { el.classList.remove('show'); document.body.style.overflow = ''; }
  }
  function closeAllModals() {
    document.querySelectorAll('.modal-overlay.show').forEach(m => {
      m.classList.remove('show');
    });
    document.body.style.overflow = '';
  }

  // ── LOG BOX ───────────────────────────────────
  function setLog(id, text, type = 'info') {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = `<span class="log-line-${type}">${esc(text)}</span>`;
    el.scrollTop = el.scrollHeight;
  }
  function appendLog(id, text, type = '') {
    const el = document.getElementById(id);
    if (!el) return;
    const span = document.createElement('span');
    if (type) span.className = `log-line-${type}`;
    span.textContent = text;
    if (el.children.length) el.appendChild(document.createTextNode('\n'));
    el.appendChild(span);
    el.scrollTop = el.scrollHeight;
  }
  function clearLog(id) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = '<span class="log-line-muted">Menunggu...</span>';
  }

  // ── FORM HELPERS ──────────────────────────────
  function val(id)       { const e = document.getElementById(id); return e ? e.value : ''; }
  function setVal(id, v) { const e = document.getElementById(id); if (e) e.value = v; }
  function show(id)      { const e = document.getElementById(id); if (e) e.style.display = ''; }
  function hide(id)      { const e = document.getElementById(id); if (e) e.style.display = 'none'; }
  function setHTML(id, h){ const e = document.getElementById(id); if (e) e.innerHTML = h; }
  function setBtn(id, loading, txt) {
    const e = document.getElementById(id);
    if (!e) return;
    e.disabled = loading;
    e.innerHTML = loading ? `<span class="spin">⟳</span> ${txt || 'Loading...'}` : txt;
  }
  function esc(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  // ── RAM GRID ──────────────────────────────────
  function buildRamGrid(containerId, tiers, hiddenId, onSelect) {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = tiers.map((t, i) => `
      <div class="ram-card" data-idx="${i}" onclick="UI._selectRam('${containerId}','${hiddenId}',${i})">
        <div class="ram-name">${t.label}</div>
        <div class="ram-spec">${t.sub || (t.ram === 0 ? 'Unlimited' : `${t.disk/1024}GB disk · ${t.cpu}%`)}</div>
      </div>
    `).join('');
    if (hiddenId) {
      const inp = document.getElementById(hiddenId);
      if (inp) inp.value = '';
    }
    el._onSelect = onSelect;
  }

  function _selectRam(gridId, hiddenId, idx) {
    const grid = document.getElementById(gridId);
    if (!grid) return;
    grid.querySelectorAll('.ram-card').forEach((c, i) => c.classList.toggle('sel', i === idx));
    const inp = document.getElementById(hiddenId);
    if (inp) inp.value = idx;
    if (grid._onSelect) grid._onSelect(idx);
  }

  // ── NAVIGATION ────────────────────────────────
  function showPage(name) {
    // Block non-owner dari halaman owner-only
    const ownerOnlyPages = ['create-panel','add-panel','list-panel','create-mc','add-mc','list-mc','users','bulk-delete','config'];
    if (ownerOnlyPages.includes(name) && typeof Auth !== 'undefined' && Auth.isLoggedIn() && !Auth.isOwner()) {
      return; // tolak diam-diam
    }

    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item, .bn-item').forEach(n => n.classList.remove('active'));

    const page = document.getElementById(`page-${name}`);
    if (page) page.classList.add('active');

    // highlight sidebar nav
    document.querySelectorAll(`[data-page="${name}"]`).forEach(n => n.classList.add('active'));

    // close sidebar on mobile after nav
    if (window.innerWidth <= 768) closeSidebar();

    // scroll to top
    const main = document.querySelector('.main-content');
    if (main) main.scrollTop = 0;
  }

  // ── SIDEBAR (MOBILE) ──────────────────────────
  function openSidebar() {
    document.querySelector('.sidebar').classList.add('open');
    document.querySelector('.sidebar-overlay').classList.add('show');
    document.querySelector('.hamburger').classList.add('open');
  }
  function closeSidebar() {
    document.querySelector('.sidebar').classList.remove('open');
    document.querySelector('.sidebar-overlay').classList.remove('show');
    document.querySelector('.hamburger').classList.remove('open');
  }
  function toggleSidebar() {
    const sb = document.querySelector('.sidebar');
    sb.classList.contains('open') ? closeSidebar() : openSidebar();
  }

  // ── TABLE BUILDER ─────────────────────────────
  function buildTable(cols, rows) {
    const ths = cols.map(c => `<th>${c}</th>`).join('');
    const trs = rows.length
      ? rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')
      : `<tr><td colspan="${cols.length}" class="text-muted text-sm" style="padding:20px;text-align:center">Tidak ada data</td></tr>`;
    return `<div class="table-wrap"><table class="table"><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table></div>`;
  }

  function loadingTable(cols) {
    return `<div class="table-wrap"><table class="table"><thead><tr>${cols.map(c=>`<th>${c}</th>`).join('')}</tr></thead>
    <tbody><tr><td colspan="${cols.length}" style="padding:20px;text-align:center;color:var(--text3)"><span class="spin">⟳</span> Loading...</td></tr></tbody></table></div>`;
  }

  // ── STATUS BADGE ──────────────────────────────
  function statusBadge(state) {
    const map = {
      running: ['b-green','● Online'],
      starting: ['b-amber','⟳ Starting'],
      stopping: ['b-amber','⟳ Stopping'],
      offline:  ['b-red','○ Offline'],
      stopped:  ['b-red','○ Offline'],
    };
    const [cls, txt] = map[state] || ['b-cyan', '— Unknown'];
    return `<span class="badge ${cls}">${txt}</span>`;
  }

  // ── CONFIRM DIALOG ────────────────────────────
  let _confirmResolve = null;
  function confirm(msg, keyword = 'HAPUS') {
    return new Promise(resolve => {
      _confirmResolve = resolve;
      document.getElementById('confirm-msg').textContent = msg;
      document.getElementById('confirm-keyword').textContent = keyword;
      document.getElementById('confirm-input').value = '';
      openModal('modal-confirm');
    });
  }
  function _execConfirm() {
    const kw = document.getElementById('confirm-keyword').textContent;
    const input = document.getElementById('confirm-input').value.trim();
    if (input !== kw) { toast(`Ketik ${kw} untuk konfirmasi!`, 'warn'); return; }
    closeModal('modal-confirm');
    if (_confirmResolve) { _confirmResolve(true); _confirmResolve = null; }
  }
  function _cancelConfirm() {
    closeModal('modal-confirm');
    if (_confirmResolve) { _confirmResolve(false); _confirmResolve = null; }
  }

  // ── USER CHIP ─────────────────────────────────
  function updateUserChip() {
    const sess = Auth.getSession();
    if (!sess) return;
    const initials = sess.username.slice(0, 2).toUpperCase();
    setHTML('user-avatar', initials);
    setHTML('user-name', sess.username);
    setHTML('user-role', sess.role);
  }

  // ── PANEL BADGE ───────────────────────────────
  function updatePanelBadge() {
    const cfg = Auth.getPanelCfg();
    const el = document.getElementById('panel-badge');
    if (!el) return;
    const v1ok = !!(cfg?.v1?.domain);
    const v2ok = !!(cfg?.v2?.domain);
    el.textContent = v1ok && v2ok ? 'V1+V2' : v1ok ? 'V1' : v2ok ? 'V2' : '—';
  }

  return {
    toast, openModal, closeModal, closeAllModals,
    setLog, appendLog, clearLog,
    val, setVal, show, hide, setHTML, setBtn, esc,
    buildRamGrid, _selectRam,
    showPage, openSidebar, closeSidebar, toggleSidebar,
    buildTable, loadingTable, statusBadge,
    confirm, _execConfirm, _cancelConfirm,
    updateUserChip, updatePanelBadge,
  };
})();

// Global aliases
const toast    = (m, t, d) => UI.toast(m, t, d);
const showPage = (n)       => UI.showPage(n);
