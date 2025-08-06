const express = require("express");
const session = require("express-session");
const bcrypt = require("bcrypt");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const app = express();
const PORT = 3000;

// Inicializa o banco de dados
const db = new sqlite3.Database(
  path.join(__dirname, "db", "banco.db"),
  (err) => {
    if (err) {
      console.error("Erro ao abrir o banco:", err.message);
    } else {
      console.log("Banco de dados conectado.");
    }
  }
);

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: "segredo123",
    resave: false,
    saveUninitialized: false,
  })
);

// === Servir arquivos estáticos da pasta frontend ===
app.use("/styles", express.static(path.join(__dirname, "../frontend/styles")));
app.use(
  "/scripts",
  express.static(path.join(__dirname, "../frontend/scripts"))
);
app.use("/images", express.static(path.join(__dirname, "../frontend/images"))); // se usar imagens

// === Rotas de páginas ===
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/login.html"));
});

app.get("/login.html", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/login.html"));
});

app.get("/index.html", (req, res) => {
  if (!req.session.usuarioId) {
    return res.redirect("/login.html");
  }
  res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

// === Cadastro de usuário ===
app.post("/register", (req, res) => {
  const { nome, email, senha } = req.body;

  const senhaCriptografada = bcrypt.hashSync(senha, 10);

  db.run(
    "INSERT INTO usuarios (nome, email, senha) VALUES (?, ?, ?)",
    [nome, email, senhaCriptografada],
    (err) => {
      if (err) {
        console.error(err.message);
        return res.status(500).json({ erro: "Erro ao registrar usuário" });
      }
      res.status(200).json({ mensagem: "Usuário cadastrado com sucesso" });
    }
  );
});

// === Login do usuário ===
app.post("/login", (req, res) => {
  const { email, senha } = req.body;

  db.get("SELECT * FROM usuarios WHERE email = ?", [email], (err, usuario) => {
    if (err) {
      return res.status(500).json({ erro: "Erro no login" });
    }

    if (!usuario || !bcrypt.compareSync(senha, usuario.senha)) {
      return res.status(401).json({ erro: "Credenciais inválidas" });
    }

    req.session.usuarioId = usuario.id;
    res.status(200).json({ mensagem: "Login bem-sucedido" });
  });
});

// === Logout ===
app.post("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/");
});

// Middleware para proteger rotas
function verificarAutenticado(req, res, next) {
  if (!req.session.usuarioId) {
    return res.status(401).json({ erro: "Usuário não autenticado" });
  }
  next();
}

// === Rota para obter transações do usuário autenticado ===

app.post("/transacoes", verificarAutenticado, (req, res) => {
  const { tipo, valor, categoria, descricao, data } = req.body;
  const user_id = req.session.usuarioId;

  // Validação básica
  if (!tipo || !valor || !categoria || !data) {
    return res.status(400).json({ erro: "Campos obrigatórios faltando" });
  }

  if (tipo !== "entrada" && tipo !== "saida") {
    return res.status(400).json({ erro: 'Tipo deve ser "entrada" ou "saida"' });
  }

  if (isNaN(valor) || Number(valor) <= 0) {
    return res.status(400).json({ erro: "Valor deve ser um número positivo" });
  }

  const sql = `
    INSERT INTO transacoes (user_id, tipo, valor, categoria, descricao, data)
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  db.run(
    sql,
    [user_id, tipo, valor, categoria, descricao || "", data],
    function (err) {
      if (err) {
        console.error(err.message);
        return res.status(500).json({ erro: "Erro ao registrar transação" });
      }

      res.status(201).json({
        mensagem: "Transação registrada com sucesso",
        transacaoId: this.lastID,
      });
    }
  );
});

// === Listar transações do usuário ===
app.get("/transacoes", verificarAutenticado, (req, res) => {
  const user_id = req.session.usuarioId;

  const sql = `
    SELECT * FROM transacoes
    WHERE user_id = ?
    ORDER BY data DESC
  `;

  db.all(sql, [user_id], (err, linhas) => {
    if (err) {
      console.error(err.message);
      return res.status(500).json({ erro: "Erro ao buscar transações" });
    }

    res.status(200).json(linhas);
  });
});

// === Iniciar servidor ===
app.listen(PORT, () => {
  console.log(`Servidor rodando em: http://localhost:${PORT}`);
});
