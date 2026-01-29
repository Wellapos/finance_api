const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const db = require('./database');
const { swaggerUi, specs } = require('./swagger');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'seu-secret-aqui-mude-em-producao';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'refresh-secret-aqui-mude-em-producao';

// Middlewares
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

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

      const token = jwt.sign({ id: usuario.id }, JWT_SECRET, { expiresIn: '10m' });
      const refreshToken = jwt.sign({ id: usuario.id }, JWT_REFRESH_SECRET, { expiresIn: '7d' });

      // Calcular data de expiração (7 dias)
      const expiraEm = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      // Salvar refresh token no banco (uso único)
      db.run(
        'INSERT INTO refresh_tokens (usuario_id, token, expira_em) VALUES (?, ?, ?)',
        [usuario.id, refreshToken, expiraEm],
        function(erroToken) {
          if (erroToken) {
            return res.status(500).json({ erro: 'Erro ao gerar refresh token' });
          }

          res.json({
            mensagem: 'Login realizado com sucesso',
            token,
            refreshToken,
            usuario: { id: usuario.id, login: usuario.login }
          });
        }
      );
    }
  );
});

// Refresh Token (uso único)
app.post('/api/refresh-token', (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ erro: 'Refresh token é obrigatório' });
  }

  // Verificar se o token é válido (assinatura JWT)
  let decoded;
  try {
    decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
  } catch (erro) {
    return res.status(401).json({ erro: 'Refresh token inválido ou expirado' });
  }

  // Verificar se o token existe no banco e não foi usado
  db.get(
    'SELECT * FROM refresh_tokens WHERE token = ? AND usado = 0',
    [refreshToken],
    (erro, tokenDb) => {
      if (erro) {
        return res.status(500).json({ erro: 'Erro ao verificar refresh token' });
      }

      if (!tokenDb) {
        return res.status(401).json({ erro: 'Refresh token inválido, expirado ou já utilizado' });
      }

      // Marcar token como usado
      db.run(
        'UPDATE refresh_tokens SET usado = 1 WHERE id = ?',
        [tokenDb.id],
        (erroUpdate) => {
          if (erroUpdate) {
            return res.status(500).json({ erro: 'Erro ao processar refresh token' });
          }

          // Gerar novos tokens
          const novoToken = jwt.sign({ id: decoded.id }, JWT_SECRET, { expiresIn: '10m' });
          const novoRefreshToken = jwt.sign({ id: decoded.id }, JWT_REFRESH_SECRET, { expiresIn: '7d' });
          const expiraEm = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

          // Salvar novo refresh token
          db.run(
            'INSERT INTO refresh_tokens (usuario_id, token, expira_em) VALUES (?, ?, ?)',
            [decoded.id, novoRefreshToken, expiraEm],
            function(erroInsert) {
              if (erroInsert) {
                return res.status(500).json({ erro: 'Erro ao gerar novo refresh token' });
              }

              res.json({
                mensagem: 'Token atualizado com sucesso',
                token: novoToken,
                refreshToken: novoRefreshToken
              });
            }
          );
        }
      );
    }
  );
});

// ========== ENDPOINTS DE TRANSAÇÕES ==========

// Listar transações com paginação
app.get('/api/transacoes', autenticar, (req, res) => {
  const pagina = parseInt(req.query.pagina) || 1;
  const limite = parseInt(req.query.limite) || 10;
  const offset = (pagina - 1) * limite;

  // Buscar total de transações e resumo de valores
  db.get(
    `SELECT
      COUNT(*) as total,
      COALESCE(SUM(CASE WHEN tipo = 'entrada' THEN valor ELSE 0 END), 0) as entradas,
      COALESCE(SUM(CASE WHEN tipo = 'saida' THEN valor ELSE 0 END), 0) as saidas
    FROM transacoes WHERE usuario_id = ?`,
    [req.usuarioId],
    (erro, resultado) => {
      if (erro) {
        return res.status(500).json({ erro: 'Erro ao buscar transações' });
      }

      const total = resultado.total;
      const totalPaginas = Math.ceil(total / limite);
      const entradas = resultado.entradas;
      const saidas = resultado.saidas;

      // Buscar transações com paginação
      db.all(
        'SELECT * FROM transacoes WHERE usuario_id = ? ORDER BY data DESC LIMIT ? OFFSET ?',
        [req.usuarioId, limite, offset],
        (erro, transacoes) => {
          if (erro) {
            return res.status(500).json({ erro: 'Erro ao buscar transações' });
          }

          res.json({
            transacoes,
            paginacao: {
              paginaAtual: pagina,
              limite,
              total,
              totalPaginas,
              temProxima: pagina < totalPaginas,
              temAnterior: pagina > 1
            },
            resumo: {
              total: entradas - saidas,
              entradas,
              saidas
            }
          });
        }
      );
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
    documentacao: '/api-docs',
    endpoints: {
      'POST /api/criar-conta': 'Criar nova conta (login, senha)',
      'POST /api/login': 'Fazer login (login, senha)',
      'POST /api/refresh-token': 'Renovar token de acesso (refreshToken)',
      'GET /api/transacoes': 'Listar transações com paginação (requer autenticação) - Query params: pagina, limite',
      'POST /api/transacoes': 'Criar transação (requer autenticação)',
      'DELETE /api/transacoes/:id': 'Deletar transação (requer autenticação)'
    }
  });
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
