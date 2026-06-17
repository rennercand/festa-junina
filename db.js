// db.js — Camada de acesso ao banco de dados (SQLite via better-sqlite3)

const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

const isRailway = !!process.env.RAILWAY_ENVIRONMENT;
const DB_DIR = isRailway ? "/data" : path.join(__dirname, "data");
const DB_PATH = path.join(DB_DIR, "db.sqlite");

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS contador (
    id    INTEGER PRIMARY KEY CHECK (id = 1),
    valor INTEGER NOT NULL DEFAULT 0
  );
  INSERT OR IGNORE INTO contador (id, valor) VALUES (1, 0);

  -- Contador separado para pré-vendas de hot dog (tickets PV-XXXX)
  CREATE TABLE IF NOT EXISTS contador_pv (
    id    INTEGER PRIMARY KEY CHECK (id = 1),
    valor INTEGER NOT NULL DEFAULT 0
  );
  INSERT OR IGNORE INTO contador_pv (id, valor) VALUES (1, 0);

  CREATE TABLE IF NOT EXISTS pedidos (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_numero     TEXT NOT NULL UNIQUE,
    nome              TEXT NOT NULL,
    email             TEXT NOT NULL,
    itens             TEXT NOT NULL,
    itens_finalizados TEXT NOT NULL DEFAULT '[]',
    status            TEXT NOT NULL DEFAULT 'pendente',
    tipo              TEXT NOT NULL DEFAULT 'normal',   -- 'normal' | 'prevenda_hotdog'
    criado_em         TEXT NOT NULL
  );

  -- Configurações gerais (ex: pré-venda ativa/inativa)
  CREATE TABLE IF NOT EXISTS config (
    chave TEXT PRIMARY KEY,
    valor TEXT NOT NULL
  );
  INSERT OR IGNORE INTO config (chave, valor) VALUES ('prevenda_ativa', 'true');
`);

// Migração: adiciona coluna 'tipo' se já existia a tabela sem ela
try {
  db.exec(`ALTER TABLE pedidos ADD COLUMN tipo TEXT NOT NULL DEFAULT 'normal'`);
} catch (_) { /* coluna já existe, ignora */ }

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function parsePedido(row) {
  if (!row) return null;
  return {
    id:               row.id,
    ticketNumero:     row.ticket_numero,
    nome:             row.nome,
    email:            row.email,
    itens:            JSON.parse(row.itens),
    itensFinalizados: JSON.parse(row.itens_finalizados),
    status:           row.status,
    tipo:             row.tipo || "normal",
    criadoEm:         row.criado_em,
  };
}

// ─── CONFIG ───────────────────────────────────────────────────────────────────
function getConfig(chave) {
  const row = db.prepare("SELECT valor FROM config WHERE chave = ?").get(chave);
  return row ? row.valor : null;
}

function setConfig(chave, valor) {
  db.prepare("INSERT OR REPLACE INTO config (chave, valor) VALUES (?, ?)").run(chave, String(valor));
}

function isPrevendaAtiva() {
  return getConfig("prevenda_ativa") === "true";
}

// ─── PEDIDOS NORMAIS ──────────────────────────────────────────────────────────
function criarPedido({ nome, email, itens }) {
  db.prepare("UPDATE contador SET valor = valor + 1 WHERE id = 1").run();
  const { valor: numeroTicket } = db.prepare("SELECT valor FROM contador WHERE id = 1").get();

  const ticketNumero = `FJ-${String(numeroTicket).padStart(4, "0")}`;
  const criadoEm = new Date().toISOString();

  db.prepare(`
    INSERT INTO pedidos (ticket_numero, nome, email, itens, itens_finalizados, status, tipo, criado_em)
    VALUES (?, ?, ?, ?, ?, 'pendente', 'normal', ?)
  `).run(ticketNumero, nome, email, JSON.stringify(itens), "[]", criadoEm);

  return { id: numeroTicket, ticketNumero, nome, email, itens, itensFinalizados: [], status: "pendente", tipo: "normal", criadoEm };
}

// ─── PRÉ-VENDA HOT DOG ────────────────────────────────────────────────────────
// itens esperados: array de strings, ex: ["Hot Dog Completo", "+Cheddar", "+Bacon"]
// total: valor calculado no backend
function criarPrevendaHotdog({ nome, email, itens, total }) {
  db.prepare("UPDATE contador_pv SET valor = valor + 1 WHERE id = 1").run();
  const { valor: numeroTicket } = db.prepare("SELECT valor FROM contador_pv WHERE id = 1").get();

  const ticketNumero = `PV-${String(numeroTicket).padStart(4, "0")}`;
  const criadoEm = new Date().toISOString();

  // Guarda o total como último "item" serializado para fácil acesso
  const payload = JSON.stringify({ itens, total });

  db.prepare(`
    INSERT INTO pedidos (ticket_numero, nome, email, itens, itens_finalizados, status, tipo, criado_em)
    VALUES (?, ?, ?, ?, ?, 'pendente', 'prevenda_hotdog', ?)
  `).run(ticketNumero, nome, email, payload, "[]", criadoEm);

  return { id: numeroTicket, ticketNumero, nome, email, itens, total, itensFinalizados: [], status: "pendente", tipo: "prevenda_hotdog", criadoEm };
}

// ─── LISTAGEM ─────────────────────────────────────────────────────────────────
function listarPedidos() {
  const rows = db.prepare("SELECT * FROM pedidos ORDER BY id ASC").all();
  return rows.map((row) => {
    const p = parsePedido(row);
    // Para pré-vendas, itens estão em JSON { itens, total }
    if (p.tipo === "prevenda_hotdog") {
      try {
        const parsed = JSON.parse(row.itens);
        p.itens = parsed.itens;
        p.total = parsed.total;
      } catch (_) {}
    }
    return p;
  });
}

// ─── FINALIZAÇÃO ─────────────────────────────────────────────────────────────
function finalizarItem(ticketNumero, item) {
  const row = db.prepare("SELECT * FROM pedidos WHERE ticket_numero = ?").get(ticketNumero);
  if (!row) return null;

  const pedido = parsePedido(row);
  let itens = pedido.itens;
  if (pedido.tipo === "prevenda_hotdog") {
    try { itens = JSON.parse(row.itens).itens; } catch (_) {}
  }

  if (!pedido.itensFinalizados.includes(item)) pedido.itensFinalizados.push(item);
  if (pedido.itensFinalizados.length >= itens.length) pedido.status = "finalizado";

  db.prepare(`UPDATE pedidos SET itens_finalizados = ?, status = ? WHERE ticket_numero = ?`)
    .run(JSON.stringify(pedido.itensFinalizados), pedido.status, ticketNumero);

  return pedido;
}

function finalizarPedido(ticketNumero) {
  const row = db.prepare("SELECT * FROM pedidos WHERE ticket_numero = ?").get(ticketNumero);
  if (!row) return null;

  const pedido = parsePedido(row);
  let itens = pedido.itens;
  if (pedido.tipo === "prevenda_hotdog") {
    try { itens = JSON.parse(row.itens).itens; } catch (_) {}
  }

  pedido.itensFinalizados = [...itens];
  pedido.status = "finalizado";

  db.prepare(`UPDATE pedidos SET itens_finalizados = ?, status = 'finalizado' WHERE ticket_numero = ?`)
    .run(JSON.stringify(pedido.itensFinalizados), ticketNumero);

  return pedido;
}

module.exports = {
  criarPedido,
  criarPrevendaHotdog,
  listarPedidos,
  finalizarItem,
  finalizarPedido,
  isPrevendaAtiva,
  setConfig,
};