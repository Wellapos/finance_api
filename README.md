# API Finance

API simples para gerenciar transações financeiras pessoais.

## Instalação

```bash
npm install
```

## Executar

```bash
npm start
```

O servidor estará disponível em `http://localhost:3000`

## Endpoints

### Autenticação

**Criar Conta**
```
POST /api/criar-conta
Content-Type: application/json

{
  "login": "usuario",
  "senha": "senha123"
}
```

**Login**
```
POST /api/login
Content-Type: application/json

{
  "login": "usuario",
  "senha": "senha123"
}
```

Resposta: `{ "token": "...", "usuario": {...} }`

### Transações

Para todos os endpoints de transações, inclua o token no header:
```
Authorization: Bearer SEU_TOKEN_AQUI
```

**Listar Transações (com paginação)**
```
GET /api/transacoes?pagina=1&limite=10
```

Query parameters opcionais:
- `pagina` - Número da página (padrão: 1)
- `limite` - Quantidade de itens por página (padrão: 10)

Resposta:
```json
{
  "transacoes": [...],
  "paginacao": {
    "paginaAtual": 1,
    "limite": 10,
    "total": 50,
    "totalPaginas": 5,
    "temProxima": true,
    "temAnterior": false
  }
}
```

**Criar Transação**
```
POST /api/transacoes
Content-Type: application/json

{
  "nome": "Salário",
  "valor": 250000,
  "categoria": "Trabalho",
  "tipo": "entrada"
}
```

Nota: O valor é em centavos (250000 = R$ 2.500,00)
Tipo pode ser: "entrada" ou "saida"

**Deletar Transação**
```
DELETE /api/transacoes/:id
```

## Configuração para Produção

Defina a variável de ambiente `JWT_SECRET`:

```bash
export JWT_SECRET=seu-secret-super-seguro
export PORT=3000
npm start
```

## Banco de Dados

O projeto usa SQLite e cria automaticamente o arquivo `finance.db` na primeira execução.
