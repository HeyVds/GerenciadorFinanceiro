const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Garante que a pasta db existe
const dbPath = path.join(__dirname, 'db');
if (!fs.existsSync(dbPath)) {
  fs.mkdirSync(dbPath);
}

const db = new sqlite3.Database(path.join(dbPath, 'banco.db'), (err) => {
  if (err) {
    console.error('Erro ao abrir o banco:', err.message);
  } else {
    console.log('Conectado ao banco de dados');
  }
});

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      senha TEXT NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS lancamentos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id INTEGER NOT NULL,
      tipo TEXT NOT NULL,
      valor REAL NOT NULL,
      categoria TEXT NOT NULL,
      descricao TEXT,
      data TEXT NOT NULL,
      FOREIGN KEY(usuario_id) REFERENCES usuarios(id)
    )
  `);
});

db.close();
