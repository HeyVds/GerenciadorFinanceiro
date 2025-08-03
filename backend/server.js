const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const db = new sqlite3.Database('./db/banco.db');

app.use(express.json());
app.use(express.static('public'));

app.use(session({
  secret: 'segredo123',
  resave: false,
  saveUninitialized: false
}));

// Middleware de proteção de rota
function auth(req, res, next) {
  if (req.session.userId) return next();
  res.status(401).json({ erro: 'Não autorizado' });
}

// Rota principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Registro de usuário
app.post('/register', (req, res) => {
  const { nome, email, senha } = req.body;
  const hash = bcrypt.hashSync(senha, 10);

  const query = `INSERT INTO users (nome, email, senha) VALUES (?, ?, ?)`;
  db.run(query, [nome, email, hash], function (err) {
    if (err) return res.status(400).json({ erro: 'Email já registrado' });
    res.status(200).end();
  });
});

// Login
app.post('/login', (req, res) => {
  const { email, senha } = req.body;

  db.get(`SELECT * FROM users WHERE email = ?`, [email], (err, user) => {
    if (!user || !bcrypt.compareSync(senha, user.senha)) {
      return res.status(401).json({ erro: 'Credenciais inválidas' });
    }

    req.session.userId = user.id;
    res.status(200).end();
  });
});

// Logout
app.post('/logout', (req, res) => {
  req.session.destroy();
  res.status(200).end();
});

// Obter lançamentos com filtros
app.get('/transacoes', auth, (req, res) => {
  const { tipo, categoria, mes } = req.query;

  const filtros = [`user_id = ?`];
  const params = [req.session.userId];

  if (tipo) {
    filtros.push(`tipo = ?`);
    params.push(tipo);
  }

  if (categoria) {
    filtros.push(`categoria LIKE ?`);
    params.push(`%${categoria}%`);
  }

  if (mes) {
    filtros.push(`strftime('%Y-%m', data) = ?`);
    params.push(mes);
  }

  const where = `WHERE ${filtros.join(' AND ')}`;
  const query = `SELECT * FROM "transaction" ${where} ORDER BY data DESC`;

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ erro: 'Erro ao buscar transações' });
    res.json(rows);
  });
});

// Inserir lançamento
app.post('/transacoes', auth, (req, res) => {
  const { tipo, valor, categoria, descricao, data } = req.body;

  const query = `
    INSERT INTO "transaction" (user_id, tipo, valor, categoria, descricao, data)
    VALUES (?, ?, ?, ?, ?, ?)`;

  db.run(query, [req.session.userId, tipo, valor, categoria, descricao, data], function (err) {
    if (err) return res.status(500).json({ erro: 'Erro ao inserir transação' });
    res.status(200).end();
  });
});

// Excluir lançamento
app.delete('/transacoes/:id', auth, (req, res) => {
  const query = `DELETE FROM "transaction" WHERE id = ? AND user_id = ?`;

  db.run(query, [req.params.id, req.session.userId], function (err) {
    if (err) return res.status(500).json({ erro: 'Erro ao excluir transação' });
    res.status(this.changes ? 200 : 404).end();
  });
});

// Iniciar servidor
app.listen(3000, () => {
  console.log('Servidor rodando em http://localhost:3000');
});
