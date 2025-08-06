// Middleware para verificar autenticação
function requireAuth(req, res, next) {
  if (!req.session.usuarioId) {
    return res.status(401).json({ erro: 'Não autorizado' });
  }
  next();
}

// === Rotas da API para Lançamentos (Novas) ===
// GET: Lista todos os lançamentos do usuário logado
app.get('/api/lancamentos', requireAuth, (req, res) => {
  const usuario_id = req.session.usuarioId;
  db.all('SELECT * FROM lancamentos WHERE usuario_id = ? ORDER BY data DESC', [usuario_id], (err, rows) => {
    if (err) {
      return res.status(500).json({ erro: err.message });
    }
    res.json(rows);
  });
});

// POST: Adiciona um novo lançamento
app.post('/api/lancamentos', requireAuth, (req, res) => {
  const usuario_id = req.session.usuarioId;
  const { tipo, valor, categoria, descricao, data } = req.body;
  const sql = 'INSERT INTO lancamentos (usuario_id, tipo, valor, categoria, descricao, data) VALUES (?, ?, ?, ?, ?, ?)';
  db.run(sql, [usuario_id, tipo, valor, categoria, descricao, data], function(err) {
    if (err) {
      return res.status(500).json({ erro: err.message });
    }
    res.status(201).json({ id: this.lastID, mensagem: 'Lançamento adicionado com sucesso' });
  });
});

// DELETE: Exclui um lançamento
app.delete('/api/lancamentos/:id', requireAuth, (req, res) => {
  const usuario_id = req.session.usuarioId;
  const lancamento_id = req.params.id;
  const sql = 'DELETE FROM lancamentos WHERE id = ? AND usuario_id = ?';
  db.run(sql, [lancamento_id, usuario_id], function(err) {
    if (err) {
      return res.status(500).json({ erro: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ erro: 'Lançamento não encontrado ou não pertence a este usuário' });
    }
    res.json({ mensagem: 'Lançamento excluído com sucesso' });
  });
});
