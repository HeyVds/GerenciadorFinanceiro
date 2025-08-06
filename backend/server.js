const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const db = new sqlite3.Database(path.join(__dirname, 'db', 'banco.db'));

// Middlewares
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'frontend')));

app.use(session({
  secret: 'segredo123',
  resave: false,
  saveUninitialized: false
}));

// Middleware de autenticação
function requireAuth(req, res, next) {
  if (!req.session.usuarioId) {
    return res.status(401).json({ erro: 'Não autorizado' });
  }
  next();
}

// ===== ROTAS DE AUTENTICAÇÃO =====
app.post('/register', (req, res) => {
  const { nome, email, senha } = req.body;

  if (!nome || !email || !senha) {
    return res.status(400).json({ erro: 'Preencha todos os campos.' });
  }

  const senhaHash = bcrypt.hashSync(senha, 10);
  db.run('INSERT INTO usuarios (nome, email, senha) VALUES (?, ?, ?)', [nome, email, senhaHash], (err) => {
    if (err) {
      console.error('Erro ao registrar:', err.message);
      return res.status(500).json({ erro: 'Erro ao registrar usuário' });
    }
    res.status(200).json({ mensagem: 'Usuário cadastrado com sucesso' });
  });
});

app.post('/login', (req, res) => {
  const { email, senha } = req.body;

  db.get('SELECT * FROM usuarios WHERE email = ?', [email], (err, usuario) => {
    if (err) return res.status(500).json({ erro: 'Erro ao buscar usuário' });
    if (!usuario || !bcrypt.compareSync(senha, usuario.senha)) {
      return res.status(401).json({ erro: 'Credenciais inválidas' });
    }

    req.session.usuarioId = usuario.id;
    res.json({ mensagem: 'Login bem-sucedido' });
  });
});

app.post('/logout', (req, res) => {
  req.session.destroy();
  res.json({ mensagem: 'Logout realizado com sucesso' });
});

// ===== ROTAS DE LANÇAMENTOS =====
app.get('/api/lancamentos', requireAuth, (req, res) => {
  const usuario_id = req.session.usuarioId;
  db.all('SELECT * FROM lancamentos WHERE usuario_id = ? ORDER BY data DESC', [usuario_id], (err, rows) => {
    if (err) return res.status(500).json({ erro: err.message });
    res.json(rows);
  });
});

app.post('/api/lancamentos', requireAuth, (req, res) => {
  const usuario_id = req.session.usuarioId;
  const { tipo, valor, categoria, descricao, data } = req.body;

  if (!tipo || !valor || !categoria || !descricao || !data) {
    return res.status(400).json({ erro: 'Preencha todos os campos corretamente.' });
  }

  // Verifica saldo atual se for saída
  if (tipo === 'saida') {
    const sqlSaldo = `
      SELECT 
        (SELECT IFNULL(SUM(valor), 0) FROM lancamentos WHERE usuario_id = ? AND tipo = 'entrada') AS total_entradas,
        (SELECT IFNULL(SUM(valor), 0) FROM lancamentos WHERE usuario_id = ? AND tipo = 'saida') AS total_saidas
    `;
    db.get(sqlSaldo, [usuario_id, usuario_id], (err, row) => {
      if (err) return res.status(500).json({ erro: err.message });

      const saldoAtual = row.total_entradas - row.total_saidas;
      if (valor > saldoAtual) {
        return res.status(400).json({ erro: 'Saldo insuficiente para esta saída.' });
      }

      // Continua inserção se tiver saldo
      inserirLancamento();
    });
  } else {
    inserirLancamento();
  }

  function inserirLancamento() {
    const sql = 'INSERT INTO lancamentos (usuario_id, tipo, valor, categoria, descricao, data) VALUES (?, ?, ?, ?, ?, ?)';
    db.run(sql, [usuario_id, tipo, valor, categoria, descricao, data], function(err) {
      if (err) return res.status(500).json({ erro: err.message });
      res.status(201).json({ id: this.lastID, mensagem: 'Lançamento adicionado com sucesso' });
    });
  }
});

app.delete('/api/lancamentos/:id', requireAuth, (req, res) => {
  const usuario_id = req.session.usuarioId;
  const lancamento_id = req.params.id;

  const sql = 'DELETE FROM lancamentos WHERE id = ? AND usuario_id = ?';
  db.run(sql, [lancamento_id, usuario_id], function(err) {
    if (err) return res.status(500).json({ erro: err.message });
    if (this.changes === 0) {
      return res.status(404).json({ erro: 'Lançamento não encontrado ou não pertence ao usuário' });
    }
    res.json({ mensagem: 'Lançamento excluído com sucesso' });
  });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'login.html'));
});

// Inicia o servidor
app.listen(3000, () => {
  console.log('Servidor rodando em http://localhost:3000');
});
