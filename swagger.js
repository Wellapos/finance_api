const swaggerJsdoc = require('swagger-jsdoc')
const swaggerUi = require('swagger-ui-express')

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API Finance',
      version: '1.0.0',
      description: 'API para gerenciamento de transações financeiras pessoais',
      contact: {
        name: 'Suporte'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Servidor de desenvolvimento'
      },
      {
        url: 'http://72.60.54.143:3000',
        description: 'Servidor de produção'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Token JWT obtido no login'
        }
      },
      schemas: {
        Usuario: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'ID do usuário',
              example: 1
            },
            login: {
              type: 'string',
              description: 'Login do usuário',
              example: 'usuario123'
            },
            criado_em: {
              type: 'string',
              format: 'date-time',
              description: 'Data de criação da conta'
            }
          }
        },
        Transacao: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'ID da transação',
              example: 1
            },
            usuario_id: {
              type: 'integer',
              description: 'ID do usuário proprietário',
              example: 1
            },
            nome: {
              type: 'string',
              description: 'Nome/descrição da transação',
              example: 'Salário'
            },
            valor: {
              type: 'integer',
              description: 'Valor em centavos',
              example: 250000
            },
            categoria: {
              type: 'string',
              description: 'Categoria da transação',
              example: 'Trabalho'
            },
            tipo: {
              type: 'string',
              enum: ['entrada', 'saida'],
              description: 'Tipo da transação',
              example: 'entrada'
            },
            data: {
              type: 'string',
              format: 'date-time',
              description: 'Data da transação'
            }
          }
        },
        CriarConta: {
          type: 'object',
          required: ['login', 'senha'],
          properties: {
            login: {
              type: 'string',
              description: 'Login único do usuário',
              example: 'usuario123'
            },
            senha: {
              type: 'string',
              description: 'Senha do usuário',
              example: 'senha123'
            }
          }
        },
        Login: {
          type: 'object',
          required: ['login', 'senha'],
          properties: {
            login: {
              type: 'string',
              description: 'Login do usuário',
              example: 'usuario123'
            },
            senha: {
              type: 'string',
              description: 'Senha do usuário',
              example: 'senha123'
            }
          }
        },
        CriarTransacao: {
          type: 'object',
          required: ['nome', 'valor', 'categoria', 'tipo'],
          properties: {
            nome: {
              type: 'string',
              description: 'Nome/descrição da transação',
              example: 'Salário'
            },
            valor: {
              type: 'integer',
              description: 'Valor em centavos (ex: 250000 = R$ 2500,00)',
              example: 250000
            },
            categoria: {
              type: 'string',
              description: 'Categoria da transação',
              example: 'Trabalho'
            },
            tipo: {
              type: 'string',
              enum: ['entrada', 'saida'],
              description: 'Tipo: entrada (receita) ou saida (despesa)',
              example: 'entrada'
            }
          }
        },
        Paginacao: {
          type: 'object',
          properties: {
            paginaAtual: {
              type: 'integer',
              description: 'Página atual',
              example: 1
            },
            limite: {
              type: 'integer',
              description: 'Itens por página',
              example: 10
            },
            total: {
              type: 'integer',
              description: 'Total de itens',
              example: 50
            },
            totalPaginas: {
              type: 'integer',
              description: 'Total de páginas',
              example: 5
            },
            temProxima: {
              type: 'boolean',
              description: 'Indica se há próxima página',
              example: true
            },
            temAnterior: {
              type: 'boolean',
              description: 'Indica se há página anterior',
              example: false
            }
          }
        },
        Erro: {
          type: 'object',
          properties: {
            erro: {
              type: 'string',
              description: 'Mensagem de erro',
              example: 'Erro ao processar requisição'
            }
          }
        }
      }
    },
    paths: {
      '/': {
        get: {
          tags: ['Info'],
          summary: 'Informações da API',
          description:
            'Retorna informações sobre a API e endpoints disponíveis',
          responses: {
            200: {
              description: 'Informações da API',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      mensagem: {
                        type: 'string',
                        example: 'API Finance - Gerenciador de Transações'
                      },
                      endpoints: {
                        type: 'object'
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/api/criar-conta': {
        post: {
          tags: ['Autenticação'],
          summary: 'Criar nova conta',
          description: 'Cria uma nova conta de usuário com login e senha',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/CriarConta'
                }
              }
            }
          },
          responses: {
            201: {
              description: 'Conta criada com sucesso',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      mensagem: {
                        type: 'string',
                        example: 'Conta criada com sucesso'
                      },
                      id: {
                        type: 'integer',
                        example: 1
                      }
                    }
                  }
                }
              }
            },
            400: {
              description: 'Dados inválidos ou login já existe',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Erro'
                  },
                  examples: {
                    camposObrigatorios: {
                      summary: 'Campos obrigatórios',
                      value: { erro: 'Login e senha são obrigatórios' }
                    },
                    loginExiste: {
                      summary: 'Login já existe',
                      value: { erro: 'Login já existe' }
                    }
                  }
                }
              }
            },
            500: {
              description: 'Erro interno do servidor',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Erro'
                  }
                }
              }
            }
          }
        }
      },
      '/api/login': {
        post: {
          tags: ['Autenticação'],
          summary: 'Fazer login',
          description: 'Autentica o usuário e retorna um token JWT',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Login'
                }
              }
            }
          },
          responses: {
            200: {
              description: 'Login realizado com sucesso',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      mensagem: {
                        type: 'string',
                        example: 'Login realizado com sucesso'
                      },
                      token: {
                        type: 'string',
                        description: 'Token JWT para autenticação',
                        example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
                      },
                      usuario: {
                        type: 'object',
                        properties: {
                          id: {
                            type: 'integer',
                            example: 1
                          },
                          login: {
                            type: 'string',
                            example: 'usuario123'
                          }
                        }
                      }
                    }
                  }
                }
              }
            },
            400: {
              description: 'Campos obrigatórios não fornecidos',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Erro'
                  },
                  example: { erro: 'Login e senha são obrigatórios' }
                }
              }
            },
            401: {
              description: 'Credenciais inválidas',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Erro'
                  },
                  example: { erro: 'Credenciais inválidas' }
                }
              }
            },
            500: {
              description: 'Erro interno do servidor',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Erro'
                  }
                }
              }
            }
          }
        }
      },
      '/api/transacoes': {
        get: {
          tags: ['Transações'],
          summary: 'Listar transações',
          description:
            'Lista todas as transações do usuário autenticado com paginação',
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'pagina',
              in: 'query',
              description: 'Número da página',
              schema: {
                type: 'integer',
                default: 1,
                minimum: 1
              }
            },
            {
              name: 'limite',
              in: 'query',
              description: 'Quantidade de itens por página',
              schema: {
                type: 'integer',
                default: 10,
                minimum: 1,
                maximum: 100
              }
            }
          ],
          responses: {
            200: {
              description: 'Lista de transações',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      transacoes: {
                        type: 'array',
                        items: {
                          $ref: '#/components/schemas/Transacao'
                        }
                      },
                      paginacao: {
                        $ref: '#/components/schemas/Paginacao'
                      }
                    }
                  }
                }
              }
            },
            401: {
              description: 'Não autorizado',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Erro'
                  },
                  examples: {
                    tokenNaoFornecido: {
                      summary: 'Token não fornecido',
                      value: { erro: 'Token não fornecido' }
                    },
                    tokenInvalido: {
                      summary: 'Token inválido',
                      value: { erro: 'Token inválido' }
                    }
                  }
                }
              }
            },
            500: {
              description: 'Erro interno do servidor',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Erro'
                  }
                }
              }
            }
          }
        },
        post: {
          tags: ['Transações'],
          summary: 'Criar transação',
          description: 'Cria uma nova transação para o usuário autenticado',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/CriarTransacao'
                }
              }
            }
          },
          responses: {
            201: {
              description: 'Transação criada com sucesso',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      mensagem: {
                        type: 'string',
                        example: 'Transação criada com sucesso'
                      },
                      id: {
                        type: 'integer',
                        example: 1
                      }
                    }
                  }
                }
              }
            },
            400: {
              description: 'Dados inválidos',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Erro'
                  },
                  examples: {
                    camposObrigatorios: {
                      summary: 'Campos obrigatórios',
                      value: {
                        erro: 'Nome, valor, categoria e tipo são obrigatórios'
                      }
                    },
                    tipoInvalido: {
                      summary: 'Tipo inválido',
                      value: { erro: 'Tipo deve ser "entrada" ou "saida"' }
                    },
                    valorInvalido: {
                      summary: 'Valor inválido',
                      value: {
                        erro: 'Valor deve ser um número positivo em centavos'
                      }
                    }
                  }
                }
              }
            },
            401: {
              description: 'Não autorizado',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Erro'
                  }
                }
              }
            },
            500: {
              description: 'Erro interno do servidor',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Erro'
                  }
                }
              }
            }
          }
        }
      },
      '/api/transacoes/{id}': {
        delete: {
          tags: ['Transações'],
          summary: 'Deletar transação',
          description: 'Remove uma transação do usuário autenticado',
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              description: 'ID da transação',
              schema: {
                type: 'integer'
              }
            }
          ],
          responses: {
            200: {
              description: 'Transação deletada com sucesso',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      mensagem: {
                        type: 'string',
                        example: 'Transação deletada com sucesso'
                      }
                    }
                  }
                }
              }
            },
            401: {
              description: 'Não autorizado',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Erro'
                  }
                }
              }
            },
            404: {
              description: 'Transação não encontrada',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Erro'
                  },
                  example: { erro: 'Transação não encontrada' }
                }
              }
            },
            500: {
              description: 'Erro interno do servidor',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Erro'
                  }
                }
              }
            }
          }
        }
      }
    },
    tags: [
      {
        name: 'Info',
        description: 'Informações gerais da API'
      },
      {
        name: 'Autenticação',
        description: 'Endpoints de autenticação e registro'
      },
      {
        name: 'Transações',
        description: 'Gerenciamento de transações financeiras'
      }
    ]
  },
  apis: []
}

const specs = swaggerJsdoc(options)

module.exports = { swaggerUi, specs }
