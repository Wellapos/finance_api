const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'seu-secret-aqui-mude-em-producao';

app.use(express.json());

// Middleware de autenticação
const autenticar = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ erro: 'Token não fornecido' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.usuarioId = decoded.id;
    next();
  } catch (erro) {
    return res.status(401).json({ erro: 'Token inválido' });
  }
};

// ========== ENDPOINTS DE AUTENTICAÇÃO ==========

// Criar conta
app.post('/api/criar-conta', async (req, res) => {
  const { login, senha } = req.body;

  if (!login || !senha) {
    return res.status(400).json({ erro: 'Login e senha são obrigatórios' });
  }

  try {
    const senhaHash = await bcrypt.hash(senha, 10);

    db.run(
      'INSERT INTO usuarios (login, senha) VALUES (?, ?)',
      [login, senhaHash],
      function(erro) {
        if (erro) {
          if (erro.message.includes('UNIQUE')) {
            return res.status(400).json({ erro: 'Login já existe' });
          }
          return res.status(500).json({ erro: 'Erro ao criar conta' });
        }

        res.status(201).json({
          mensagem: 'Conta criada com sucesso',
          id: this.lastID
        });
      }
    );
  } catch (erro) {
    res.status(500).json({ erro: 'Erro ao processar senha' });
  }
});

// Login
app.post('/api/login', (req, res) => {
  const { login, senha } = req.body;

  if (!login || !senha) {
    return res.status(400).json({ erro: 'Login e senha são obrigatórios' });
  }

  db.get(
    'SELECT * FROM usuarios WHERE login = ?',
    [login],
    async (erro, usuario) => {
      if (erro) {
        return res.status(500).json({ erro: 'Erro ao buscar usuário' });
      }

      if (!usuario) {
        return res.status(401).json({ erro: 'Credenciais inválidas' });
      }

      const senhaValida = await bcrypt.compare(senha, usuario.senha);

      if (!senhaValida) {
        return res.status(401).json({ erro: 'Credenciais inválidas' });
      }

      const token = jwt.sign({ id: usuario.id }, JWT_SECRET, { expiresIn: '24h' });

      res.json({
        mensagem: 'Login realizado com sucesso',
        token,
        usuario: { id: usuario.id, login: usuario.login }
      });
    }
  );
});

// ========== ENDPOINTS DE TRANSAÇÕES ==========

// Listar transações
app.get('/api/transacoes', autenticar, (req, res) => {
  db.all(
    'SELECT * FROM transacoes WHERE usuario_id = ? ORDER BY data DESC',
    [req.usuarioId],
    (erro, transacoes) => {
      if (erro) {
        return res.status(500).json({ erro: 'Erro ao buscar transações' });
      }

      res.json({ transacoes });
    }
  );
});

// Criar transação
app.post('/api/transacoes', autenticar, (req, res) => {
  const { nome, valor, categoria, tipo } = req.body;

  if (!nome || valor === undefined || !categoria || !tipo) {
    return res.status(400).json({
      erro: 'Nome, valor, categoria e tipo são obrigatórios'
    });
  }

  if (!['entrada', 'saida'].includes(tipo)) {
    return res.status(400).json({
      erro: 'Tipo deve ser "entrada" ou "saida"'
    });
  }

  if (typeof valor !== 'number' || valor < 0) {
    return res.status(400).json({
      erro: 'Valor deve ser um número positivo em centavos'
    });
  }

  db.run(
    'INSERT INTO transacoes (usuario_id, nome, valor, categoria, tipo) VALUES (?, ?, ?, ?, ?)',
    [req.usuarioId, nome, valor, categoria, tipo],
    function(erro) {
      if (erro) {
        return res.status(500).json({ erro: 'Erro ao criar transação' });
      }

      res.status(201).json({
        mensagem: 'Transação criada com sucesso',
        id: this.lastID
      });
    }
  );
});

// Deletar transação
app.delete('/api/transacoes/:id', autenticar, (req, res) => {
  const { id } = req.params;

  db.run(
    'DELETE FROM transacoes WHERE id = ? AND usuario_id = ?',
    [id, req.usuarioId],
    function(erro) {
      if (erro) {
        return res.status(500).json({ erro: 'Erro ao deletar transação' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ erro: 'Transação não encontrada' });
      }

      res.json({ mensagem: 'Transação deletada com sucesso' });
    }
  );
});

// Rota raiz
app.get('/', (req, res) => {
  res.json({
    mensagem: 'API Finance - Gerenciador de Transações',
    endpoints: {
      'POST /api/criar-conta': 'Criar nova conta (login, senha)',
      'POST /api/login': 'Fazer login (login, senha)',
      'GET /api/transacoes': 'Listar transações (requer autenticação)',
      'POST /api/transacoes': 'Criar transação (requer autenticação)',
      'DELETE /api/transacoes/:id': 'Deletar transação (requer autenticação)'
    }
  });
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
