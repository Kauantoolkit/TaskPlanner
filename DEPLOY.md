# 🚀 GUIA DE DEPLOY

Este guia mostra como fazer deploy da aplicação em **Vercel** ou **Netlify**.

---

## 📋 PRÉ-REQUISITOS

Antes de fazer deploy, você precisa:

1. ✅ **Projeto no Supabase configurado**
   - Execute o SQL do arquivo `/SUPABASE_SETUP.md`
   - Tenha em mãos: URL e ANON_KEY do Supabase

2. ✅ **Conta no Vercel ou Netlify** (gratuita)

---

## 🎯 OPÇÃO 1: DEPLOY NA VERCEL (Recomendado)

A Vercel é a plataforma ideal para apps React + Vite.

### Passo 1: Instalar Vercel CLI

```bash
npm install -g vercel
```

### Passo 2: Fazer deploy

```bash
# Na raiz do projeto:
vercel
```

Siga as instruções no terminal:
- Login com GitHub/email
- Confirme as configurações padrão
- **IMPORTANTE:** Configure as variáveis de ambiente quando solicitado

### Passo 3: Configurar variáveis de ambiente

No terminal ou no [dashboard da Vercel](https://vercel.com/dashboard):

```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
```

**Ou via Dashboard:**
1. Acesse: https://vercel.com/dashboard
2. Clique no seu projeto
3. Vá em: **Settings → Environment Variables**
4. Adicione as duas variáveis acima
5. Clique em **Redeploy** após adicionar

### Passo 4: Configurar Supabase

No painel do Supabase:

1. Vá em: **Authentication → URL Configuration**
2. Adicione sua URL da Vercel em **Site URL**:
   ```
   https://seu-projeto.vercel.app
   ```
3. Em **Redirect URLs**, adicione:
   ```
   https://seu-projeto.vercel.app/**
   ```

### Passo 5: Habilitar confirmação de email (PRODUÇÃO)

⚠️ **Importante para segurança:**

1. No Supabase: **Authentication → Providers → Email**
2. **HABILITE** a opção **"Confirm email"**
3. Clique em **Save**

Agora usuários precisam confirmar o email antes de fazer login! ✅

---

## 🎯 OPÇÃO 2: DEPLOY NA NETLIFY

### Método 1: Via CLI

```bash
# Instalar Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Deploy
netlify deploy --prod
```

### Método 2: Via Interface Web

1. Acesse: https://app.netlify.com
2. Clique em **"Add new site" → "Import an existing project"**
3. Conecte com GitHub/GitLab
4. Selecione o repositório
5. Configure:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
6. Adicione as variáveis de ambiente:
   ```
   VITE_SUPABASE_URL=https://xxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGc...
   ```

### Configurar Supabase (igual à Vercel)

Siga o **Passo 4** e **Passo 5** da seção Vercel acima.

---

## 🔧 OPÇÃO 3: GitHub Pages (Apenas frontend)

⚠️ **Limitação:** GitHub Pages serve apenas arquivos estáticos. Funciona, mas:
- Não tem variáveis de ambiente secretas
- Precisa expor as credenciais do Supabase no código (não recomendado)

**Recomendamos Vercel ou Netlify para produção.**

---

## ✅ VERIFICAR SE FUNCIONOU

Depois do deploy:

1. ✅ Acesse a URL do seu app
2. ✅ Tente criar uma conta
3. ✅ Verifique o email de confirmação (se habilitado)
4. ✅ Faça login
5. ✅ Crie um workspace
6. ✅ Adicione uma tarefa

Se tudo funcionar, **parabéns! Está no ar! 🎉**

---

## 🐛 TROUBLESHOOTING

### Erro: "Failed to fetch" ao fazer login

**Causa:** Variáveis de ambiente não configuradas ou incorretas

**Solução:**
1. Verifique as variáveis no dashboard (Vercel/Netlify)
2. Certifique-se que começam com `VITE_`
3. Refaça o deploy após adicionar

### Erro: "Invalid login credentials"

**Causa:** Usuário não confirmou o email

**Solução:**
- Se confirmação está habilitada: cheque o email
- Se não recebeu: verifique spam ou desabilite confirmação no Supabase (desenvolvimento)

### Erro: "Cross-Origin Request Blocked"

**Causa:** Domínio não configurado no Supabase

**Solução:**
1. No Supabase: **Authentication → URL Configuration**
2. Adicione sua URL em **Site URL** e **Redirect URLs**

### Build falha com erro de TypeScript

**Solução:**
```bash
# Teste o build localmente primeiro:
npm run build

# Se der erro, corrija os erros de tipo
# Se funcionar, faça commit e push
```

---

## 📊 MONITORAMENTO (Opcional)

### Analytics

Adicione Google Analytics ou Plausible:

```html
<!-- Em /index.html antes de </head> -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
```

### Error Tracking

Considere adicionar Sentry para tracking de erros:

```bash
npm install @sentry/react
```

---

## 🔐 SEGURANÇA EM PRODUÇÃO

### ✅ Checklist antes de lançar:

- [ ] Confirmação de email habilitada no Supabase
- [ ] Rate limits configurados no Supabase
- [ ] CORS configurado corretamente
- [ ] Variáveis de ambiente NÃO expostas no código
- [ ] RLS (Row Level Security) ativo em todas as tabelas
- [ ] Políticas de autenticação revisadas
- [ ] URLs de redirect configuradas no Supabase

---

## 🔄 ATUALIZAÇÕES FUTURAS

### Vercel
```bash
# Simplesmente faça push no git:
git add .
git commit -m "Update"
git push

# Vercel faz redeploy automático!
```

### Netlify
```bash
# Mesmo processo:
git push

# Ou manualmente:
netlify deploy --prod
```

---

## 📚 RECURSOS ADICIONAIS

- [Documentação Vercel](https://vercel.com/docs)
- [Documentação Netlify](https://docs.netlify.com)
- [Documentação Supabase](https://supabase.com/docs)
- [Vite Deployment](https://vitejs.dev/guide/static-deploy.html)

---

## 💰 CUSTOS

### Tier Gratuito:

- **Vercel:** Ilimitado para projetos pessoais
- **Netlify:** 100GB bandwidth/mês
- **Supabase:** 500MB database, 50MB storage, 2GB bandwidth

**Suficiente para maioria dos casos!** ✅

---

**Dúvidas?** Abra uma issue no GitHub ou consulte a documentação acima.
