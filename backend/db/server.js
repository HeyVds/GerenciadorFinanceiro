const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = 3000;

// Inicializa o banco de dados
const db = new sqlite3.Database('./db/banco.db', (err) => {
  if (err) {
    console.error('Erro ao abrir o banco:', err.message);
  } else {
    console.log('Banco de dados conectado.');
  }
});

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: 'segredo123',
  resave: false,
  saveUninitialized: false
}));

// === Servir arquivos estáticos da pasta frontend ===
app.use('/styles', express.static(path.join(__dirname, '../frontend/styles')));
app.use('/scripts', express.static(path.join(__dirname, '../frontend/scripts')));
app.use('/images', express.static(path.join(__dirname, '../frontend/images'))); // se usar imagens

// === Rotas de páginas ===
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/login.html'));
});

app.get('/login.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/login.html'));
});

app.get('/index.html', (req, res) => {
  if (!req.session.usuarioId) {
    return res.redirect('/login.html');
  }
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// === Cadastro de usuário ===
app.post('/register', (req, res) => {
  const { nome, email, senha } = req.body;

  const senhaCriptografada = bcrypt.hashSync(senha, 10);

  db.run('INSERT INTO usuarios (nome, email, senha) VALUES (?, ?, ?)', [nome, email, senhaCriptografada], (err) => {
    if (err) {
      console.error(err.message);
      return res.status(500).json({ erro: 'Erro ao registrar usuário' });
    }
    res.status(200).json({ mensagem: 'Usuário cadastrado com sucesso' });
  });
});

// === Login do usuário ===
app.post('/login', (req, res) => {
  const { email, senha } = req.body;

  db.get('SELECT * FROM usuarios WHERE email = ?', [email], (err, usuario) => {
    if (err) {
      return res.status(500).json({ erro: 'Erro no login' });
    }

    if (!usuario || !bcrypt.compareSync(senha, usuario.senha)) {
      return res.status(401).json({ erro: 'Credenciais inválidas' });
    }

    req.session.usuarioId = usuario.id;
    res.status(200).json({ mensagem: 'Login bem-sucedido' });
  });
});

// === Logout ===
app.post('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

// === Iniciar servidor ===
app.listen(PORT, () => {
  console.log(`Servidor rodando em: http://localhost:${PORT}`);
});
