# 🚀 Guia de Hospedagem no Render.com

Seu projeto já foi configurado e otimizado para funcionar perfeitamente no **Render.com** com banco de dados **Supabase**!

---

## 🛠️ Passo a Passo para Publicação

### 1️⃣ Conectar o Repositório no GitHub
1. Faça push do seu projeto para um repositório no **GitHub** ou **GitLab**.

### 2️⃣ Criar um Novo Web Service no Render
1. Acesse o painel do [Render.com](https://dashboard.render.com).
2. Clique no botão **New +** no canto superior direito e selecione **Web Service**.
3. Conecte sua conta do GitHub e selecione o repositório deste projeto.

### 3️⃣ Configurações de Deploy (Build & Start)
- **Name**: `mocinhas-app` *(ou o nome que preferir)*
- **Environment**: `Node`
- **Region**: Escolha qualquer região (ex: `Oregon` ou `Frankfurt`)
- **Branch**: `main` *(ou `master`)*
- **Build Command**: `npm run build`
- **Start Command**: `npm start`
- **Plan**: `Free`

---

## 🔑 Variáveis de Ambiente no Render (Aba "Environment")

No painel do seu Web Service no Render, clique na aba **Environment** e adicione as seguintes variáveis:

| Key (Nome da Variável) | Value (Valor) | Explicação |
| :--- | :--- | :--- |
| **`NODE_ENV`** | `production` | Otimiza o Node.js e o Express para produção |
| **`JWT_SECRET`** | `mocinhas_jwt_secret_token_2026` *(ou qualquer texto secreto)* | Usado para assinar tokens de login |
| **`SUPABASE_URL`** | `https://ucnppkymspymjiyqfjqd.supabase.co` | **Sua URL do Supabase (está 100% correta!)** |
| **`SUPABASE_ANON_KEY`** | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjbnBwa3ltc3B5bWppeXFmanFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE3MzY5NzgsImV4cCI6MjEwNzMxMjk3OH0.oYw9V7Dl1dMmjg0Jv1AWqxT0x6TSBSsDtRj9qNN-1cs` | **Chave anon public (obrigatória para o cliente e API)** |
| **`SUPABASE_SERVICE_ROLE_KEY`** | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjbnBwa3ltc3B5bWppeXFmanFkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MTczNjk3OCwiZXhwIjoyMTA3MzEyOTc4fQ.nDjuz99E50aWncY_8LVE_oL79L-9gxn9aOc4Uvi2nMc` | **Chave secreta de admin para o backend** |

---

## 💡 Dúvidas Frequentes

### E a chave `Publishable key` (`sb_publishable_...`)?
A chave que começa com `sb_publishable_...` é o formato novo que a Supabase lançou recentemente. No entanto, as bibliotecas padrão do Supabase (`@supabase/supabase-js`) e a aplicação utilizam a chave **`anon public`** (formato JWT longo). Portanto, use a **`anon public`** no campo `SUPABASE_ANON_KEY`.

---

## 🎯 Pronto!
Após clicar em **Save Changes** e depois em **Deploy Web Service**, o Render iniciará a compilação e dentro de instantes sua aplicação estará online com banco de dados conectado e HTTPS gratuito!
