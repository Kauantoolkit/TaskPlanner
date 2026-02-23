# ⚡ DEPLOY EM 5 MINUTOS

**Guia ultra-rápido para colocar seu app no ar AGORA!**

---

## 🚀 VERCEL (Recomendado - Mais fácil)

### Passo 1: Criar conta
1. Acesse: https://vercel.com
2. Faça login com GitHub

### Passo 2: Deploy
```bash
npm install -g vercel
vercel
```

Aperte ENTER em tudo! ✅

### Passo 3: Adicionar variáveis de ambiente

No dashboard da Vercel (https://vercel.com/dashboard):

1. Clique no seu projeto
2. **Settings → Environment Variables**
3. Adicione:

```
VITE_SUPABASE_URL
https://xxxxx.supabase.co

VITE_SUPABASE_ANON_KEY
eyJhbGc...
```

4. Clique em **Redeploy**

### Passo 4: Configurar Supabase

No painel do Supabase:

1. **Authentication → URL Configuration**
2. **Site URL:** `https://seu-projeto.vercel.app`
3. **Redirect URLs:** `https://seu-projeto.vercel.app/**`
4. **Authentication → Providers → Email**
5. ✅ **Habilite "Confirm email"**

**PRONTO! Está no ar! 🎉**

---

## 🎯 NETLIFY (Alternativa)

### Via Interface Web:

1. Acesse: https://app.netlify.com
2. **Add new site → Import an existing project**
3. Conecte com GitHub
4. Selecione o repositório
5. Build command: `npm run build`
6. Publish directory: `dist`
7. **Environment variables:**
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
8. **Deploy**

### Via CLI:

```bash
npm install -g netlify-cli
netlify login
netlify deploy --prod
```

**Configure o Supabase igual ao Passo 4 da Vercel acima!**

---

## ✅ CHECKLIST ANTES DE LANÇAR

- [ ] Variáveis de ambiente configuradas na Vercel/Netlify
- [ ] Site URL configurada no Supabase
- [ ] Redirect URLs configuradas no Supabase
- [ ] Confirmação de email HABILITADA no Supabase
- [ ] Testou criar conta
- [ ] Testou fazer login
- [ ] Testou criar tarefa

---

## 🐛 ERROS COMUNS

**Erro: "Failed to fetch"**
→ Variáveis de ambiente não configuradas. Vá em Settings → Environment Variables

**Erro: "Invalid login credentials"**
→ Habilite confirmação de email no Supabase ou desabilite para testes

**Erro: "CORS"**
→ Configure Site URL e Redirect URLs no Supabase

---

**Mais detalhes?** Veja `/DEPLOY.md`
