# 🎪 Festa Junina — Sistema de Pedidos

## Como rodar

### 1. Instalar dependências
```bash
cd festa-junina
npm install
```

### 2. Configurar o e-mail (Gmail)
crie o arquivo `.env` e coloque
```
EMAIL_USER: "seuemail@gmail.com",
EMAIL_PASS: "sua_senha_de_app_aqui",
```

> ⚠️ A senha NÃO é sua senha normal do Gmail.
> Você precisa gerar uma **Senha de App**:
> 1. Acesse: https://myaccount.google.com/security
> 2. Ative a verificação em duas etapas
> 3. Vá em "Senhas de app" → gere uma para "Aplicativo de e-mail"
> 4. Use a senha gerada (16 caracteres, sem espaços)

Ou use variáveis de ambiente criando um `.env`:
```
EMAIL_USER=seuemail@gmail.com
EMAIL_PASS=abcd efgh ijkl mnop
```

### 3. Rodar o servidor
```bash
npm start
# ou, com recarregamento automático:
npm run dev
```

### 4. Acessar no navegador
- **Comprar ticket:** http://localhost:3000/
- **Painel de pedidos:** http://localhost:3000/painel.html

---

## Estrutura de arquivos
```
festa-junina/
├── server.js          # Servidor Express (rotas da API)
├── db.js              # Banco de dados (leitura/escrita em JSON)
├── email.js           # Envio de e-mail com Nodemailer
├── package.json       # Dependências do projeto
├── data/
│   └── db.json        # Arquivo que armazena os pedidos
└── public/
    ├── index.html     # Página de compra (frontend)
    └── painel.html    # Painel de pedidos (frontend)
```

## Endpoints da API
| Método | Rota | Descrição |
|--------|------|-----------|
| POST | /api/pedidos | Criar pedido + enviar e-mail |
| GET | /api/pedidos | Listar todos os pedidos |
| PATCH | /api/pedidos/:ticket/item | Marcar item como feito |
| PATCH | /api/pedidos/:ticket/finalizar | Finalizar pedido inteiro |
