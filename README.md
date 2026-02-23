# 📅 Planner Colaborativo

Sistema de planejamento colaborativo para famílias e empresas, construído com **React + TypeScript + Tailwind CSS + Supabase**.

**✅ Funciona em modo LOCAL (sem configuração) ou com SUPABASE (autenticação real)**

**🚀 Pronto para deploy em Vercel/Netlify** - Veja `/DEPLOY.md`

---

## ✨ Funcionalidades

### 📋 Gestão de Tarefas
- ✅ **Tarefas diárias** - Tarefas específicas por data
- ✅ **Rotinas permanentes** - Hábitos que resetam todo dia
- ✅ **Entregas** - Tarefas com deadline que aparecem até a data limite
- ✅ **Categorias** - Organize com cores personalizadas
- ✅ **Busca em tempo real**
- ✅ **Barra de progresso** - Visualize seu dia
- ✅ **Calendário** - Visão mensal completa

### 👥 Colaboração
- ✅ **Workspaces** - Para famílias/empresas
- ✅ **Membros ilimitados** - Adicione quantos precisar
- ✅ **Roles (Dono/Membro)** - Permissões diferenciadas
- ✅ **Atribuição de tarefas** - Dono pode criar tarefas para outros

### 🔐 Autenticação (Supabase)
- ✅ **Login com email/senha**
- ✅ **Cadastro de nova conta**
- ✅ **Login com Google OAuth** (opcional)
- ✅ **Sessão persistente**
- ✅ **Dados isolados por usuário**

### 📱 Interface
- ✅ **Design moderno** - Interface limpa e polida
- ✅ **Animações suaves** - Motion (Framer Motion)
- ✅ **Responsivo** - Funciona em qualquer dispositivo
- ✅ **Modo escuro** - Dark mode completo

---

## 🚀 Instalação

### 1. Clonar e instalar
```bash
git clone <seu-repo>
cd planner-colaborativo
npm install
```

**⚠️ IMPORTANTE:** Se você baixou o ZIP, ignore a pasta `/backend` - ela contém código legado do Spring Boot que não é mais usado. A aplicação agora usa **apenas Supabase** como backend.

### 2. Rodar localmente
```bash
npm run dev
```

Abra [http://localhost:5173](http://localhost:5173)

**Pronto! O app funciona em modo LOCAL sem configuração.**

---

## 🔧 Configurar Supabase (Opcional)

Para ativar **autenticação real** e **sincronização na nuvem**:

### Passo 1: Criar projeto no Supabase
1. Acesse [supabase.com](https://supabase.com)
2. Crie uma conta gratuita
3. Crie um novo projeto

### Passo 2: Executar SQL
No painel do Supabase, vá em **SQL Editor** e execute o script em `/SUPABASE_SETUP.md`

### Passo 3: Configurar credenciais
1. No Supabase, vá em **Settings → API**
2. Copie:
   - **Project URL** (exemplo: `https://xxxxx.supabase.co`)
   - **anon/public key** (começa com `eyJhbGc...`)

3. Crie o arquivo `.env` na raiz do projeto:
```env
VITE_SUPABASE_URL=sua_url_aqui
VITE_SUPABASE_ANON_KEY=sua_chave_aqui
```

### Passo 4: Reiniciar servidor
```bash
# Pare o servidor (Ctrl+C)
npm run dev
```

**Pronto! Agora você tem autenticação real com Supabase! 🎉**

---

## 🏗️ Stack Tecnológica

```
Frontend:
├─ React 18 + TypeScript
├─ Tailwind CSS v4
├─ Motion (Framer Motion)
├─ date-fns
└─ Sonner (toasts)

Backend:
└─ Supabase (PostgreSQL + Auth + Real-time)

Deployment:
└─ Vercel (frontend)
```

---

## 📂 Estrutura do Projeto

```
/src/app
├── /components          # Componentes React
│   ├── AddTaskModal.tsx
│   ├── AuthProvider.tsx
│   ├── LoginScreen.tsx
│   ├── MembersModal.tsx
│   ├── Sidebar.tsx
│   ├── TaskItem.tsx
│   └── ...
├── /context            # Contextos React
│   └── WorkspaceContext.tsx
├── /hooks              # Custom hooks
│   └── useLocalStorage.ts
├── /lib                # Configurações
│   └── supabase.ts
├── /services           # Repositórios
│   └── SupabaseRepository.ts
├── types.ts            # TypeScript types
└── App.tsx             # Componente principal
```

---

## 🎯 Casos de Uso

### 🏠 Família
```
Workspace: "Família Santos"
Membros:
  👑 Carlos (dono)
  👤 Ana (membro)
  👤 João (membro)

Carlos cria: "Arrumar quarto" → para João
Ana cria: "Comprar pão" → para Ana
João vê apenas suas tarefas!
```

### 💼 Empresa
```
Workspace: "Startup Tech"
Membros:
  👑 Pedro (CEO/dono)
  👤 Lucas (dev)
  👤 Fernanda (design)

Pedro cria: "Feature X" → para Lucas
Pedro cria: "Logo novo" → para Fernanda
Cada um vê suas tarefas atribuídas!
```

---

## 🔑 Como Funciona

### Modo LOCAL (padrão)
- ✅ Sem configuração necessária
- ✅ Dados salvos no navegador (localStorage)
- ✅ Todas as funcionalidades disponíveis
- ⚠️ Dados não sincronizam entre dispositivos
- ⚠️ Sem autenticação real

### Modo SUPABASE
- ✅ Autenticação real (login/senha/Google)
- ✅ Dados salvos na nuvem
- ✅ Sincronização entre dispositivos
- ✅ Múltiplos usuários reais
- ✅ Segurança e isolamento de dados

---

## 📚 Documentação Adicional

- **`/DEPLOY.md`** - 🚀 **Guia completo de deploy para Vercel/Netlify**
- **`/SUPABASE_SETUP.md`** - Script SQL completo para configurar o banco de dados
- **`/ATTRIBUTIONS.md`** - Licenças e atribuições de bibliotecas

---

## 🛠️ Tecnologias Utilizadas

- **React 18** - Framework UI
- **TypeScript** - Type safety
- **Tailwind CSS v4** - Styling moderno
- **Motion** - Animações fluidas
- **Supabase** - Backend (PostgreSQL + Auth)
- **date-fns** - Manipulação de datas
- **Sonner** - Toast notifications
- **Lucide React** - Ícones

---

## 📝 Licença

MIT

---

## 🎨 Design

- Interface minimalista e moderna
- Animações suaves e polidas
- Dark mode completo
- Design system consistente
- Responsivo para mobile e desktop

---

**Status:** 🟢 Funcional em modo LOCAL | ✅ Supabase configurável | 🚀 Pronto para deploy