const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Verifica se a pasta db existe, se não, cria
const dbPath = path.join(__dirname, 'db');
if (!fs.existsSync(dbPath)) {
  fs.mkdirSync(dbPath);
}

// Conecta/cria o banco
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

  // Se quiser criar outras tabelas no futuro, adicione aqui
});

db.close();
