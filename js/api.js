// ═══════════════════════════════════════════════════
// api.js — Pterodactyl API wrapper
// ═══════════════════════════════════════════════════

const PteroAPI = (() => {

  function getPanelCfg(ver) {
    const cfg = Auth.getPanelCfg();
    if (!cfg) throw new Error('Panel config belum diisi!');
    const p = cfg[ver];
    if (!p || !p.domain) throw new Error(`Config Panel ${ver.toUpperCase()} belum diisi!`);
    return p;
  }

  async function _fetch(ver, path, opts = {}) {
    const p = getPanelCfg(ver);
    const isClient = path.includes('/api/client');
    const key = isClient ? p.pltc : p.plta;
    if (!key) throw new Error(`API key ${isClient ? 'client' : 'application'} Panel ${ver.toUpperCase()} kosong!`);

    const res = await fetch(p.domain + path, {
      ...opts,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
        ...(opts.headers || {}),
      },
    });

    // 204 No Content (delete success)
    if (res.status === 204) return { _status: 204 };

    let json;
    try { json = await res.json(); } catch { json = {}; }

    if (!res.ok) {
      const msg = json?.errors?.[0]?.detail || json?.error || `HTTP ${res.status}`;
      throw new Error(msg);
    }
    return json;
  }

  // ── USER ──────────────────────────────────────
  async function checkUser(ver, email) {
    const p = getPanelCfg(ver);
    const res = await fetch(`${p.domain}/api/application/users/external/${email}`, {
      headers: { Accept: 'application/json', Authorization: `Bearer ${p.plta}` },
    });
    if (res.status === 404) return null;
    if (!res.ok) return null;
    return (await res.json()).attributes;
  }

  async function createUser(ver, username, isAdmin = false) {
    const email = `${username}@bayyz.id`;
    const pass  = username + genRand(6);
    const body  = {
      email, username,
      first_name: username, last_name: username,
      language: 'en', password: pass,
    };
    if (isAdmin) body.root_admin = true;

    const data = await _fetch(ver, '/api/application/users', {
      method: 'POST', body: JSON.stringify(body),
    });
    if (data.errors) throw new Error(data.errors[0].detail);
    return { user: data.attributes, password: pass, email };
  }

  async function getUser(ver, pteroId) {
    const data = await _fetch(ver, `/api/application/users/${pteroId}`);
    return data.attributes;
  }

  async function deleteUser(ver, pteroId) {
    return await _fetch(ver, `/api/application/users/${pteroId}`, { method: 'DELETE' });
  }

  async function listUsers(ver, page = 1) {
    return await _fetch(ver, `/api/application/users?page=${page}&per_page=50&include=servers`);
  }

  async function getAllUsers(ver) {
    let all = [], page = 1;
    while (true) {
      const r = await _fetch(ver, `/api/application/users?page=${page}&per_page=50&include=servers`);
      all = all.concat(r.data || []);
      if (!r.meta || r.meta.pagination.current_page >= r.meta.pagination.total_pages) break;
      page++;
    }
    return all;
  }

  // ── SERVER ────────────────────────────────────
  async function getEgg(ver, nestId, eggId) {
    return await _fetch(ver, `/api/application/nests/${nestId}/eggs/${eggId}`);
  }

  async function createServer(ver, payload) {
    const data = await _fetch(ver, '/api/application/servers', {
      method: 'POST', body: JSON.stringify(payload),
    });
    if (data.errors) throw new Error(data.errors[0].detail);
    return data.attributes;
  }

  async function deleteServer(ver, serverId) {
    return await _fetch(ver, `/api/application/servers/${serverId}`, { method: 'DELETE' });
  }

  async function getAllServers(ver) {
    let all = [], page = 1;
    while (true) {
      const r = await _fetch(ver, `/api/application/servers?page=${page}&per_page=50`);
      all = all.concat(r.data || []);
      if (!r.meta || r.meta.pagination.current_page >= r.meta.pagination.total_pages) break;
      page++;
    }
    return all;
  }

  async function getServerResources(ver, uuid) {
    try {
      const r = await _fetch(ver, `/api/client/servers/${uuid}/resources`);
      return r.attributes;
    } catch { return null; }
  }

  // ── PANEL STATUS CHECK ────────────────────────
  // Return: 'ok' | 'cors' | 'auth' | 'down'
  async function pingPanel(ver) {
    try {
      const p = getPanelCfg(ver);
      const res = await fetch(`${p.domain}/api/application/servers?per_page=1`, {
        headers: { Accept: 'application/json', Authorization: `Bearer ${p.plta}` },
      });
      if (res.ok) return 'ok';
      if (res.status === 401 || res.status === 403) return 'auth';
      return 'down';
    } catch (e) {
      // Kemungkinan CORS block — cek apakah domain bisa dijangkau sama sekali
      try {
        const p = getPanelCfg(ver);
        await fetch(`${p.domain}`, { method: 'HEAD', mode: 'no-cors' });
        return 'cors'; // domain hidup tapi kena CORS dari browser
      } catch {
        return 'down';
      }
    }
  }

  // ── BUILD SERVER PAYLOADS ─────────────────────
  function buildPanelServerPayload(ver, userId, username, tier) {
    const p = getPanelCfg(ver);
    return {
      name: username, description: 'panel pterodactyl', user: userId,
      egg: parseInt(p.egg || 16),
      docker_image: CFG.PANEL_DOCKER,
      startup: '{{CMD_RUN}}',
      environment: CFG.PANEL_ENV,
      limits: { memory: tier.ram, swap: 0, disk: tier.disk, io: 500, cpu: tier.cpu },
      feature_limits: CFG.FEATURE_LIMITS,
      deploy: { locations: [parseInt(p.loc || 1)], dedicated_ip: false, port_range: [] },
    };
  }

  function buildMcServerPayload(ver, userId, name, sw, tier, version, eggStartup) {
    const p = getPanelCfg(ver);
    const env = buildMcEnv(sw, version);
    return {
      name, description: 'minecraft server', user: userId,
      egg: sw.eggId,
      docker_image: sw.docker || 'ghcr.io/parkervcp/yolks:java_21',
      startup: sw.startup || eggStartup || '{{SERVER_JARFILE}}',
      environment: env,
      limits: { memory: tier.ram, swap: 0, disk: tier.disk, io: 500, cpu: tier.cpu },
      feature_limits: CFG.FEATURE_LIMITS,
      deploy: { locations: [parseInt(p.loc || 1)], dedicated_ip: false, port_range: [] },
    };
  }

  return {
    // user
    checkUser, createUser, getUser, deleteUser, listUsers, getAllUsers,
    // server
    getEgg, createServer, deleteServer, getAllServers, getServerResources,
    // util
    pingPanel, buildPanelServerPayload, buildMcServerPayload,
    getCfg: getPanelCfg,
  };
})();
