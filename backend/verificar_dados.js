const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'db', 'banco.db');
const db = new sqlite3.Database(dbPath);

console.log('Verificando conteúdo do banco...\n');

db.serialize(() => {
  db.all("SELECT * FROM usuarios", (err, rows) => {
    if (err) {
      console.error('Erro ao buscar usuários:', err.message);
    } else {
      console.log('Usuários cadastrados:');
      console.table(rows);
    }
  });

  db.all("SELECT * FROM lancamentos", (err, rows) => {
    if (err) {
      console.error('Erro ao buscar lançamentos:', err.message);
    } else {
      console.log('Lançamentos registrados:');
      console.table(rows);
    }
  });
});

db.close();
