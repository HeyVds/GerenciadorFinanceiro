const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

// Garante que a pasta db/ existe
const dbDir = './db';
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir);
}

const db = new sqlite3.Database('./db/banco.db');

db.serialize(() => {
  // Criação da tabela de usuários
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      senha TEXT NOT NULL
    )
  `);

  // Criação da tabela de transações financeiras
  db.run(`
    CREATE TABLE IF NOT EXISTS "transaction" (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      tipo TEXT NOT NULL CHECK(tipo IN ('entrada', 'saida')),
      valor REAL NOT NULL,
      categoria TEXT NOT NULL,
      descricao TEXT,
      data TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )
  `);
});

db.close(() => {
  console.log('Banco de dados criado com sucesso!');
});
