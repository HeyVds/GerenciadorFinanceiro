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
app.use(express.static(path.join(__dirname, "..", "frontend")));

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

  if (!nome || !email || !senha) {
    return res.status(400).json({ erro: "Preencha todos os campos." });
  }

  const senhaHash = bcrypt.hashSync(senha, 10);
  db.run(
    "INSERT INTO usuarios (nome, email, senha) VALUES (?, ?, ?)",
    [nome, email, senhaHash],
    function (err) {
      if (err) {
        console.error("Erro ao registrar:", err.message);

        if (err.message.includes("UNIQUE constraint failed")) {
          return res.status(409).json({ erro: "Email já cadastrado." });
        }

        return res.status(500).json({ erro: "Erro ao registrar usuário." });
      }

      res
        .status(201)
        .json({
          mensagem: "Usuário cadastrado com sucesso.",
          usuarioId: this.lastID,
        });
    }
  );
});

// Middleware de autenticação
function requireAuth(req, res, next) {
  if (!req.session.usuarioId) {
    return res.status(401).json({ erro: "Não autorizado" });
  }
  next();
}

app.post("/register", (req, res) => {
  const { nome, email, senha } = req.body;

  if (!nome || !email || !senha) {
    return res.status(400).json({ erro: "Preencha todos os campos." });
  }

  const senhaHash = bcrypt.hashSync(senha, 10);
  db.run(
    "INSERT INTO usuarios (nome, email, senha) VALUES (?, ?, ?)",
    [nome, email, senhaHash],
    function (err) {
      if (err) {
        console.error("Erro ao registrar:", err.message);

        // Caso o email já exista (erro de chave única)
        if (err.message.includes("UNIQUE constraint failed")) {
          return res.status(409).json({ erro: "Email já cadastrado." });
        }

        return res.status(500).json({ erro: "Erro ao registrar usuário." });
      }

      // Sucesso
      res
        .status(201)
        .json({
          mensagem: "Usuário cadastrado com sucesso.",
          usuarioId: this.lastID,
        });
    }
  );
});

// === Login do usuário ===
app.post("/login", (req, res) => {
  const { email, senha } = req.body;

  db.get("SELECT * FROM usuarios WHERE email = ?", [email], (err, usuario) => {
    if (err) return res.status(500).json({ erro: "Erro ao buscar usuário" });

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
  res.json({ mensagem: "Logout realizado com sucesso" });
});

// === Middleware de autenticação ===
function verificarAutenticado(req, res, next) {
  if (!req.session.usuarioId) {
    return res.status(401).json({ erro: "Usuário não autenticado" });
  }
  next();
}

// === Cadastrar transação ===
app.post("/transacoes", verificarAutenticado, (req, res) => {
  const { tipo, valor, categoria, descricao, data } = req.body;
  const user_id = req.session.usuarioId;

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

// ===== ROTAS DE LANÇAMENTOS =====
app.get("/api/lancamentos", requireAuth, (req, res) => {
  const usuario_id = req.session.usuarioId;
  db.all(
    "SELECT * FROM lancamentos WHERE usuario_id = ? ORDER BY data DESC",
    [usuario_id],
    (err, rows) => {
      if (err) return res.status(500).json({ erro: err.message });
      res.json(rows);
    }
  );
});

app.post("/api/lancamentos", requireAuth, (req, res) => {
  const usuario_id = req.session.usuarioId;
  const { tipo, valor, categoria, descricao, data } = req.body;

  const sql =
    "INSERT INTO lancamentos (usuario_id, tipo, valor, categoria, descricao, data) VALUES (?, ?, ?, ?, ?, ?)";
  db.run(
    sql,
    [usuario_id, tipo, valor, categoria, descricao, data],
    function (err) {
      if (err) return res.status(500).json({ erro: err.message });
      res
        .status(201)
        .json({
          id: this.lastID,
          mensagem: "Lançamento adicionado com sucesso",
        });
    }
  );
});

app.delete("/api/lancamentos/:id", requireAuth, (req, res) => {
  const usuario_id = req.session.usuarioId;
  const lancamento_id = req.params.id;

  const sql = "DELETE FROM lancamentos WHERE id = ? AND usuario_id = ?";
  db.run(sql, [lancamento_id, usuario_id], function (err) {
    if (err) return res.status(500).json({ erro: err.message });
    if (this.changes === 0) {
      return res
        .status(404)
        .json({ erro: "Lançamento não encontrado ou não pertence ao usuário" });
    }
    res.json({ mensagem: "Lançamento excluído com sucesso" });
  });
});

// Rota fallback para login.html (opcional)
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "frontend", "login.html"));
});

// Inicia o servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
