const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Cria a pasta 'db' se não existir
const dbPath = path.join(__dirname, 'db');
if (!fs.existsSync(dbPath)) {
  fs.mkdirSync(dbPath);
}

// Cria ou abre o banco
const db = new sqlite3.Database(path.join(dbPath, 'banco.db'), (err) => {
  if (err) {
    console.error('Erro ao conectar ao banco:', err.message);
  } else {
    console.log('Banco criado/conectado com sucesso!');
  }
});

// Cria tabela de usuários
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      senha TEXT NOT NULL
    )
  `, (err) => {
    if (err) {
      console.error('Erro ao criar tabela de usuários:', err.message);
    } else {
      console.log('Tabela "usuarios" criada com sucesso.');
    }
  });
  // Cria tabela de transações
  db.run(`
    CREATE TABLE IF NOT EXISTS transaction (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      tipo TEXT NOT NULL CHECK(tipo IN ('entrada', 'saida')),
      valor REAL NOT NULL CHECK(valor > 0),
      categoria TEXT NOT NULL,
      descricao TEXT,
      data TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES usuarios(id)
    )
  `, (err) => {
    if (err) {
      console.error('Erro ao criar tabela de transações:', err.message);
    } else {
      console.log('Tabela "transaction" criada com sucesso.');
    }
  });
});

db.close();