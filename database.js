const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'finance.db');
const db = new sqlite3.Database(dbPath);

// Criar tabelas
db.serialize(() => {
  // Tabela de usuários
  db.run(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      login TEXT UNIQUE NOT NULL,
      senha TEXT NOT NULL,
      criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tabela de transações
  db.run(`
    CREATE TABLE IF NOT EXISTS transacoes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id INTEGER NOT NULL,
      nome TEXT NOT NULL,
      valor INTEGER NOT NULL,
      categoria TEXT NOT NULL,
      tipo TEXT NOT NULL CHECK(tipo IN ('entrada', 'saida')),
      data DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
    )
  `);
});

module.exports = db;
