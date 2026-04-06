// ═══════════════════════════════════════════════════
// config.js — Data dari bot CPANEL_X_MC_BYY_V5
// ═══════════════════════════════════════════════════

const CFG = {
  // Panel RAM tiers (sesuai panel.js & addserver.js)
  PANEL_RAM: [
    { label: '1GB',   ram: 1024,  disk: 1024,  cpu: 40  },
    { label: '2GB',   ram: 2048,  disk: 2048,  cpu: 60  },
    { label: '3GB',   ram: 3072,  disk: 3072,  cpu: 80  },
    { label: '4GB',   ram: 4096,  disk: 4096,  cpu: 100 },
    { label: '5GB',   ram: 5120,  disk: 5120,  cpu: 120 },
    { label: '6GB',   ram: 6144,  disk: 6144,  cpu: 140 },
    { label: '7GB',   ram: 7168,  disk: 7168,  cpu: 160 },
    { label: '8GB',   ram: 8192,  disk: 8192,  cpu: 180 },
    { label: '9GB',   ram: 9216,  disk: 9216,  cpu: 200 },
    { label: '10GB',  ram: 10240, disk: 10240, cpu: 220 },
    { label: 'UNLI',  ram: 0,     disk: 0,     cpu: 0   },
  ],

  // MC RAM tiers (sesuai minecraft.js & addserver.js)
  MC_RAM: [
    { label: '2GB',  sub: '5GB | 300%',  ram: 2048,  disk: 5120,  cpu: 300 },
    { label: '4GB',  sub: '6GB | 350%',  ram: 4096,  disk: 6144,  cpu: 350 },
    { label: '6GB',  sub: '8GB | 400%',  ram: 6144,  disk: 8192,  cpu: 400 },
    { label: '8GB',  sub: '10GB | 450%', ram: 8192,  disk: 10240, cpu: 450 },
    { label: '10GB', sub: '12GB | 500%', ram: 10240, disk: 12288, cpu: 500 },
    { label: '12GB', sub: '15GB | 600%', ram: 12288, disk: 15360, cpu: 600 },
    { label: '15GB', sub: '18GB | 700%', ram: 15360, disk: 18432, cpu: 700 },
    { label: '20GB', sub: '25GB | 800%', ram: 20480, disk: 25600, cpu: 800 },
    { label: '25GB', sub: '28GB | 800%', ram: 25600, disk: 28672, cpu: 800 },
    { label: '30GB', sub: '30GB | 800%', ram: 30720, disk: 30720, cpu: 800 },
  ],

  // Software list MC (sesuai minecraft.js)
  MC_SOFTWARE: [
    { label: 'Forge',           eggId: 1,  autoLatest: false, docker: 'ghcr.io/parkervcp/yolks:java_21' },
    { label: 'Paper',           eggId: 2,  autoLatest: false, docker: 'ghcr.io/parkervcp/yolks:java_21' },
    { label: 'Vanilla',         eggId: 3,  autoLatest: false, docker: 'ghcr.io/parkervcp/yolks:java_21' },
    { label: 'Bungeecord',      eggId: 4,  autoLatest: false, docker: 'ghcr.io/parkervcp/yolks:java_21' },
    { label: 'Fabric',          eggId: 16, autoLatest: false, docker: 'ghcr.io/parkervcp/yolks:java_21' },
    { label: 'NeoForge',        eggId: 18, autoLatest: false, docker: 'ghcr.io/parkervcp/yolks:java_21' },
    { label: 'MohistMC',        eggId: 19, autoLatest: false, docker: 'ghcr.io/parkervcp/yolks:java_21' },
    { label: 'GoMint',          eggId: 21, autoLatest: true,  docker: 'ghcr.io/ptero-eggs/yolks:java_21',  startup: 'java --add-opens java.base/java.nio=io.netty.common --add-exports java.base/jdk.internal.misc=io.netty.common -p modules -m gomint.server/io.gomint.server.Bootstrap' },
    { label: 'Vanilla Bedrock', eggId: 22, autoLatest: true,  docker: 'ghcr.io/ptero-eggs/yolks:debian',  env: { BEDROCK_VERSION: 'latest', LD_LIBRARY_PATH: '.', SERVERNAME: 'Bedrock Server', GAMEMODE: 'survival', DIFFICULTY: 'easy', CHEATS: 'false' } },
    { label: 'PocketmineMP',    eggId: 23, autoLatest: true,  docker: 'ghcr.io/ptero-eggs/yolks:debian',  env: { VERSION: 'PM5' }, startup: './bin/php7/bin/php ./PocketMine-MP.phar --no-wizard' },
  ],

  // Egg ID grouping (sesuai manage.js)
  PANEL_EGG_IDS: [15, 16],
  MC_EGG_IDS:    [1, 2, 3, 4, 5, 16, 17, 18, 19, 21, 22, 23],

  EGG_SOFTWARE_MAP: {
    1: 'Forge', 2: 'Paper', 3: 'Vanilla', 4: 'Bungeecord', 5: 'Spigot',
    16: 'Fabric', 17: 'Quilt', 18: 'NeoForge', 19: 'MohistMC',
    21: 'GoMint', 22: 'Bedrock', 23: 'PocketmineMP',
  },

  // Default env untuk panel bot
  PANEL_ENV: {
    INST: 'npm', USER_UPLOAD: '0', AUTO_UPDATE: '0',
    CMD_RUN: 'npm start', STARTUP_CMD: 'pip install -r requirements.txt',
  },
  PANEL_DOCKER: 'ghcr.io/parkervcp/yolks:nodejs_23',

  // Feature limits default
  FEATURE_LIMITS: { databases: 5, backups: 5, allocations: 5 },
};

// Build MC env dari eggId dan versi
function buildMcEnv(sw, version) {
  if (sw.env) return sw.env;
  const v = sw.autoLatest ? 'latest' : (version || 'latest');
  const id = sw.eggId;
  if (id === 1)  return { SERVER_JARFILE: 'server.jar', BUILD_NUMBER: v, MINECRAFT_VERSION: v };
  if (id === 2)  return { SERVER_JARFILE: 'server.jar', BUILD_NUMBER: v, MINECRAFT_VERSION: v };
  if (id === 3)  return { SERVER_JARFILE: 'server.jar', VANILLA_VERSION: v };
  if (id === 4)  return { SERVER_JARFILE: 'server.jar', MINECRAFT_VERSION: v };
  if (id === 16) return { SERVER_JARFILE: 'server.jar', MINECRAFT_VERSION: v, LOADER_VERSION: 'latest' };
  if (id === 18) return { SERVER_JARFILE: 'server.jar', MC_VERSION: v, BUILD_NUMBER: 'latest' };
  if (id === 19) return { SERVER_JARFILE: 'server.jar', MINECRAFT_VERSION: v };
  return {};
}

// Generate random string (kayak di bot)
function genRand(n) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

// Format RAM label
function fmtRam(mb) { return mb === 0 ? 'Unli' : `${(mb / 1024).toFixed(mb % 1024 === 0 ? 0 : 1)}GB`; }
