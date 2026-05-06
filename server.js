// ══════════════════════════════════════════════════════════════════════
// ARSAT LABO – SERVEUR CENTRALISÉ
// Réf. 25118-GE | Wise Group / Menara Global Service
// ══════════════════════════════════════════════════════════════════════
const express  = require('express');
const jwt      = require('jsonwebtoken');
const bcrypt   = require('bcryptjs');
const fs       = require('fs');
const path     = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'arsat-labo-secret-2026-wise-menara';

// ─── Résolution robuste des chemins (Render, Railway, local) ────────
// Essaie process.cwd() puis __dirname — prend le dossier qui a server.js
const ROOT = fs.existsSync(path.join(process.cwd(), 'server.js'))
  ? process.cwd()
  : __dirname;

const PUBLIC_DIR = path.join(ROOT, 'public');
const HTML_FILE  = path.join(PUBLIC_DIR, 'index.html');
const DATA_DIR   = path.join(ROOT, '.data');
const DATA_FILE  = path.join(DATA_DIR, 'arsat_data.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

app.use(express.json({ limit: '10mb' }));
app.use(express.static(PUBLIC_DIR));

// ─── Ensure data directory exists ───────────────────────────────────
function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

// ─── Load / save helpers ─────────────────────────────────────────────
function loadUsers() {
  ensureDir();
  if (!fs.existsSync(USERS_FILE)) {
    const defaults = [
      { id: 1, name: 'Chef de Projet',        role: 'admin', pin: bcrypt.hashSync('1234', 8), active: true, lastLogin: '' },
      { id: 2, name: 'Coordinateur WISE',      role: 'edit',  pin: bcrypt.hashSync('2580', 8), active: true, lastLogin: '' },
      { id: 3, name: 'ARSAT (lecture seule)',   role: 'view',  pin: bcrypt.hashSync('7410', 8), active: true, lastLogin: '' },
    ];
    fs.writeFileSync(USERS_FILE, JSON.stringify(defaults, null, 2));
    return defaults;
  }
  return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
}

function saveUsers(users) {
  ensureDir();
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

function loadData() {
  ensureDir();
  if (!fs.existsSync(DATA_FILE)) return null;
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); }
  catch (e) { return null; }
}

function saveData(data) {
  ensureDir();
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// ─── Auth middleware ──────────────────────────────────────────────────
function requireAuth(req, res, next) {
  const token = req.headers['authorization']?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Non authentifié' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    const users = loadUsers();
    const dbUser = users.find(u => u.id === req.user.id);
    if (!dbUser || !dbUser.active) {
      return res.status(403).json({ error: 'Compte désactivé – contactez l\'administrateur', revoked: true });
    }
    req.user.role = dbUser.role;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Session expirée – reconnectez-vous' });
  }
}

function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Accès réservé aux administrateurs' });
  next();
}

function requireEdit(req, res, next) {
  if (req.user.role === 'view') return res.status(403).json({ error: 'Accès en lecture seule' });
  next();
}

// ══════════════════════════════════════════════════════════════════════
// API ROUTES
// ══════════════════════════════════════════════════════════════════════

// ─── POST /api/login ─────────────────────────────────────────────────
app.post('/api/login', (req, res) => {
  const { userId, pin } = req.body;
  const users = loadUsers();
  const user  = users.find(u => u.id === +userId);
  if (!user)                              return res.status(401).json({ error: 'Utilisateur introuvable' });
  if (!user.active)                       return res.status(403).json({ error: 'Ce compte a été désactivé par l\'administrateur' });
  if (!bcrypt.compareSync(pin, user.pin)) return res.status(401).json({ error: 'Code PIN incorrect' });

  user.lastLogin = new Date().toLocaleString('fr-FR');
  saveUsers(users);

  const token = jwt.sign(
    { id: user.id, name: user.name, role: user.role },
    JWT_SECRET,
    { expiresIn: '12h' }
  );
  res.json({ token, user: { id: user.id, name: user.name, role: user.role, lastLogin: user.lastLogin } });
});

// ─── GET /api/users/list (login screen) ─────────────────────────────
app.get('/api/users/list', (req, res) => {
  const users = loadUsers();
  res.json(users.filter(u => u.active).map(u => ({ id: u.id, name: u.name, role: u.role })));
});

// ─── GET /api/check ──────────────────────────────────────────────────
app.get('/api/check', requireAuth, (req, res) => {
  res.json({ ok: true, user: { id: req.user.id, name: req.user.name, role: req.user.role } });
});

// ─── GET /api/data ───────────────────────────────────────────────────
app.get('/api/data', requireAuth, (req, res) => {
  res.json({ data: loadData(), user: req.user });
});

// ─── POST /api/data ──────────────────────────────────────────────────
app.post('/api/data', requireAuth, requireEdit, (req, res) => {
  const { data, description } = req.body;
  if (!data) return res.status(400).json({ error: 'Données manquantes' });
  if (!data.meta) data.meta = {};
  if (!data.meta.auditLog) data.meta.auditLog = [];
  data.meta.auditLog.unshift({
    user: req.user.name, role: req.user.role,
    action: description || 'Sauvegarde',
    timestamp: new Date().toISOString(),
    date: new Date().toLocaleString('fr-FR'),
  });
  data.meta.auditLog     = data.meta.auditLog.slice(0, 50);
  data.meta.lastUpdatedBy = req.user.name;
  data.meta.lastUpdated   = new Date().toLocaleDateString('fr-FR');
  saveData(data);
  res.json({ ok: true, meta: data.meta });
});

// ─── GET /api/users (admin) ──────────────────────────────────────────
app.get('/api/users', requireAuth, requireAdmin, (req, res) => {
  res.json(loadUsers().map(u => ({ ...u, pin: undefined })));
});

// ─── POST /api/users ─────────────────────────────────────────────────
app.post('/api/users', requireAuth, requireAdmin, (req, res) => {
  const { name, role, pin } = req.body;
  if (!name || !pin || pin.length < 4) return res.status(400).json({ error: 'Nom et PIN (4+ chiffres) requis' });
  const users = loadUsers();
  const newUser = {
    id: Math.max(0, ...users.map(u => u.id)) + 1,
    name, role: role || 'edit',
    pin: bcrypt.hashSync(pin, 8),
    active: true, lastLogin: '',
  };
  users.push(newUser);
  saveUsers(users);
  res.json({ ok: true, user: { ...newUser, pin: undefined } });
});

// ─── PUT /api/users/:id ──────────────────────────────────────────────
app.put('/api/users/:id', requireAuth, requireAdmin, (req, res) => {
  const users = loadUsers();
  const idx   = users.findIndex(u => u.id === +req.params.id);
  if (idx < 0) return res.status(404).json({ error: 'Utilisateur introuvable' });
  const u = users[idx];
  if (req.body.name)                       u.name   = req.body.name;
  if (req.body.role)                       u.role   = req.body.role;
  if (req.body.pin)                        u.pin    = bcrypt.hashSync(req.body.pin, 8);
  if (typeof req.body.active === 'boolean') u.active = req.body.active;
  saveUsers(users);
  res.json({ ok: true, user: { ...u, pin: undefined } });
});

// ─── DELETE /api/users/:id ───────────────────────────────────────────
app.delete('/api/users/:id', requireAuth, requireAdmin, (req, res) => {
  if (+req.params.id === req.user.id) return res.status(400).json({ error: 'Impossible de supprimer votre propre compte' });
  saveUsers(loadUsers().filter(u => u.id !== +req.params.id));
  res.json({ ok: true });
});

// ─── GET /api/audit ──────────────────────────────────────────────────
app.get('/api/audit', requireAuth, requireAdmin, (req, res) => {
  res.json(loadData()?.meta?.auditLog || []);
});

// ─── Catch-all : sert index.html pour toutes les routes SPA ─────────
app.get('*', (req, res) => {
  if (!fs.existsSync(HTML_FILE)) {
    // Diagnostic détaillé si le fichier est introuvable
    return res.status(500).send(
      `<h2>Fichier index.html introuvable</h2>
       <pre>ROOT       : ${ROOT}\n` +
      `PUBLIC_DIR : ${PUBLIC_DIR}\n` +
      `HTML_FILE  : ${HTML_FILE}\n` +
      `Existe     : ${fs.existsSync(HTML_FILE)}\n` +
      `cwd        : ${process.cwd()}\n` +
      `__dirname  : ${__dirname}\n` +
      `Contenu ROOT:\n${fs.readdirSync(ROOT).join('\n')}</pre>`
    );
  }
  res.sendFile(HTML_FILE);
});

// ─── Démarrage ────────────────────────────────────────────────────────
app.listen(PORT, () => {
  ensureDir();
  const users = loadUsers();
  console.log(`✅ ARSAT Labo Server démarré sur le port ${PORT}`);
  console.log(`   ROOT       : ${ROOT}`);
  console.log(`   PUBLIC_DIR : ${PUBLIC_DIR}`);
  console.log(`   HTML_FILE  : ${HTML_FILE} (existe: ${fs.existsSync(HTML_FILE)})`);
  console.log(`   Utilisateurs chargés : ${users.length}`);
});    req.user = jwt.verify(token, JWT_SECRET);
    // Check user is still active in real-time
    const users = loadUsers();
    const dbUser = users.find(u => u.id === req.user.id);
    if (!dbUser || !dbUser.active) {
      return res.status(403).json({ error: 'Compte désactivé – contactez l\'administrateur', revoked: true });
    }
    req.user.role = dbUser.role; // always use server-side role
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Session expirée – reconnectez-vous' });
  }
}

function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Accès réservé aux administrateurs' });
  next();
}

function requireEdit(req, res, next) {
  if (req.user.role === 'view') return res.status(403).json({ error: 'Accès en lecture seule' });
  next();
}

// ══════════════════════════════════════════════════════════════════════
// API ROUTES
// ══════════════════════════════════════════════════════════════════════

// ─── POST /api/login ─────────────────────────────────────────────────
app.post('/api/login', (req, res) => {
  const { userId, pin } = req.body;
  const users = loadUsers();
  const user = users.find(u => u.id === +userId);

  if (!user)           return res.status(401).json({ error: 'Utilisateur introuvable' });
  if (!user.active)    return res.status(403).json({ error: 'Ce compte a été désactivé par l\'administrateur' });
  if (!bcrypt.compareSync(pin, user.pin))
                       return res.status(401).json({ error: 'Code PIN incorrect' });

  user.lastLogin = new Date().toLocaleString('fr-FR');
  saveUsers(users);

  const token = jwt.sign(
    { id: user.id, name: user.name, role: user.role },
    JWT_SECRET,
    { expiresIn: '12h' }
  );

  res.json({
    token,
    user: { id: user.id, name: user.name, role: user.role, lastLogin: user.lastLogin }
  });
});

// ─── GET /api/users (list for login screen) ─────────────────────────
app.get('/api/users/list', (req, res) => {
  const users = loadUsers();
  // Return only active users + public info (no PINs)
  res.json(users.filter(u => u.active).map(u => ({ id: u.id, name: u.name, role: u.role })));
});

// ─── GET /api/check – verify token still valid ───────────────────────
app.get('/api/check', requireAuth, (req, res) => {
  res.json({ ok: true, user: { id: req.user.id, name: req.user.name, role: req.user.role } });
});

// ─── GET /api/data ───────────────────────────────────────────────────
app.get('/api/data', requireAuth, (req, res) => {
  const data = loadData();
  res.json({ data, user: req.user });
});

// ─── POST /api/data ──────────────────────────────────────────────────
app.post('/api/data', requireAuth, requireEdit, (req, res) => {
  const { data, description } = req.body;
  if (!data) return res.status(400).json({ error: 'Données manquantes' });

  // Add server-side audit log
  if (!data.meta) data.meta = {};
  if (!data.meta.auditLog) data.meta.auditLog = [];
  data.meta.auditLog.unshift({
    user: req.user.name,
    role: req.user.role,
    action: description || 'Sauvegarde',
    timestamp: new Date().toISOString(),
    date: new Date().toLocaleString('fr-FR'),
  });
  data.meta.auditLog = data.meta.auditLog.slice(0, 50); // keep last 50
  data.meta.lastUpdatedBy = req.user.name;
  data.meta.lastUpdated = new Date().toLocaleDateString('fr-FR');

  saveData(data);
  res.json({ ok: true, meta: data.meta });
});

// ─── GET /api/users (admin) ──────────────────────────────────────────
app.get('/api/users', requireAuth, requireAdmin, (req, res) => {
  const users = loadUsers().map(u => ({ ...u, pin: undefined })); // never send PIN
  res.json(users);
});

// ─── POST /api/users (admin: add user) ───────────────────────────────
app.post('/api/users', requireAuth, requireAdmin, (req, res) => {
  const { name, role, pin } = req.body;
  if (!name || !pin || pin.length < 4) return res.status(400).json({ error: 'Nom et PIN (4+ chiffres) requis' });
  const users = loadUsers();
  const newUser = {
    id: Math.max(0, ...users.map(u => u.id)) + 1,
    name, role: role || 'edit',
    pin: bcrypt.hashSync(pin, 8),
    active: true,
    lastLogin: '',
  };
  users.push(newUser);
  saveUsers(users);
  res.json({ ok: true, user: { ...newUser, pin: undefined } });
});

// ─── PUT /api/users/:id (admin: update user) ─────────────────────────
app.put('/api/users/:id', requireAuth, requireAdmin, (req, res) => {
  const users = loadUsers();
  const idx = users.findIndex(u => u.id === +req.params.id);
  if (idx < 0) return res.status(404).json({ error: 'Utilisateur introuvable' });

  const u = users[idx];
  if (req.body.name)   u.name   = req.body.name;
  if (req.body.role)   u.role   = req.body.role;
  if (req.body.pin)    u.pin    = bcrypt.hashSync(req.body.pin, 8);
  if (typeof req.body.active === 'boolean') u.active = req.body.active;

  saveUsers(users);
  res.json({ ok: true, user: { ...u, pin: undefined } });
});

// ─── DELETE /api/users/:id ───────────────────────────────────────────
app.delete('/api/users/:id', requireAuth, requireAdmin, (req, res) => {
  if (+req.params.id === req.user.id) return res.status(400).json({ error: 'Vous ne pouvez pas supprimer votre propre compte' });
  let users = loadUsers();
  users = users.filter(u => u.id !== +req.params.id);
  saveUsers(users);
  res.json({ ok: true });
});

// ─── GET /api/audit (admin: audit log) ───────────────────────────────
app.get('/api/audit', requireAuth, requireAdmin, (req, res) => {
  const data = loadData();
  res.json(data?.meta?.auditLog || []);
});

// ─── Catch-all: serve the app ────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`✅ ARSAT Labo Server démarré sur le port ${PORT}`);
  console.log(`   URL locale : http://localhost:${PORT}`);
  ensureDir();
  loadUsers(); // Initialize default users if needed
  console.log(`   Utilisateurs chargés : ${loadUsers().length}`);
});
