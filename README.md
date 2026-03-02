# 🎵 MúsicoWeb - Sistema de Pedido de Materiais

Sistema web para músicos fazerem pedidos de materiais (cordas, palhetas, baquetas, cabos, etc.), com autenticação de usuário e hospedado gratuitamente.

## 📁 Estrutura do Projeto

```
musico-web/
├── index.html              # Página principal
├── css/
│   └── styles.css          # Estilos da aplicação
├── js/
│   ├── supabase-config.js  # Configuração do Supabase
│   ├── auth.js             # Autenticação (login/cadastro)
│   └── app.js              # Lógica principal (pedidos)
├── supabase-setup.sql      # SQL para criar tabelas
└── README.md               # Este arquivo
```

## 🚀 Como Configurar

### Passo 1: Criar projeto no Supabase

1. Acesse [supabase.com](https://supabase.com) e crie uma conta gratuita
2. Clique em **"New Project"**
3. Escolha um nome (ex: `musico-web`) e defina uma senha para o banco
4. Aguarde o projeto ser criado (~2 minutos)

### Passo 2: Criar as tabelas do banco de dados

1. No Supabase Dashboard, vá em **SQL Editor** (menu lateral)
2. Clique em **"New Query"**
3. Copie e cole **todo o conteúdo** do arquivo `supabase-setup.sql`
4. Clique em **"Run"** para executar
5. Verifique que as tabelas foram criadas em **Table Editor**

### Passo 3: Configurar a URL e chave do Supabase

1. No Supabase Dashboard, vá em **Settings** > **API**
2. Copie a **Project URL** (ex: `https://xyzcompany.supabase.co`)
3. Copie a **anon/public key** (começa com `eyJ...`)
4. Abra o arquivo `js/supabase-config.js` e substitua:

```javascript
const SUPABASE_URL = 'https://SEU-PROJETO.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOi...SUA_CHAVE_AQUI';
```

### Passo 4: (Opcional) Desabilitar confirmação por e-mail

Para facilitar testes, você pode desabilitar a confirmação de e-mail:
1. Supabase Dashboard > **Authentication** > **Providers**
2. Em **Email**, desabilite **"Confirm email"**

---

## 🌐 Como Hospedar no GitHub Pages

### Passo 1: Criar repositório no GitHub

1. Acesse [github.com](https://github.com) e faça login
2. Clique em **"New repository"** (botão verde)
3. Nome: `musico-web` (ou o nome que preferir)
4. Marque **"Public"**
5. **NÃO** marque "Add a README" (já temos um)
6. Clique em **"Create repository"**

### Passo 2: Enviar o código para o GitHub

Abra o terminal na pasta do projeto e execute:

```bash
git init
git add .
git commit -m "Primeira versão do MúsicoWeb"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/musico-web.git
git push -u origin main
```

### Passo 3: Ativar GitHub Pages

1. No GitHub, vá no repositório > **Settings** > **Pages**
2. Em **Source**, selecione **"Deploy from a branch"**
3. Em **Branch**, selecione **"main"** e pasta **"/ (root)"**
4. Clique em **"Save"**
5. Aguarde alguns minutos e o site estará disponível em:
   ```
   https://SEU-USUARIO.github.io/musico-web/
   ```

---

## 🎯 Funcionalidades

- ✅ **Cadastro e Login** com Supabase Auth
- ✅ **Criar pedidos** de materiais com múltiplos itens
- ✅ **Categorias**: Cordas, Palhetas, Baquetas, Cabos, Peles, Acessórios, Peças
- ✅ **Níveis de urgência**: Normal, Urgente, Muito Urgente
- ✅ **Painel** com estatísticas dos pedidos
- ✅ **Filtros** por status (Pendente, Aprovado, Entregue, Cancelado)
- ✅ **Detalhes** de cada pedido em modal
- ✅ **Responsivo** - funciona no celular e desktop
- ✅ **Segurança** - cada usuário só vê seus próprios pedidos (RLS)
- ✅ **Tema escuro** moderno

## 🛠️ Tecnologias

- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Backend/DB**: Supabase (PostgreSQL + Auth + API REST)
- **Hospedagem**: GitHub Pages
- **Ícones**: Font Awesome 6
- **Fonte**: Inter (Google Fonts)

## 📝 Licença

Projeto livre para uso pessoal e educacional.
