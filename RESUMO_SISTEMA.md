# 📋 Resumo Completo do Sistema TaskPlanner

## 1. Visão Geral do Sistema

O **TaskPlanner** é um aplicativo de gerenciamento de tarefas (agenda/planner) construído com **React**, **TypeScript**, **Vite**, **Tailwind CSS** e **Supabase**. Permite gerenciar tarefas diárias com diferentes tipos, categorias, visualização em calendário e funcionalidades colaborativas.

### 1.1 Modos de Operação

| Modo | Descrição | Armazenamento |
|------|------------|---------------|
| **Local** (padrão) | Sem Supabase configurado | localStorage |
| **Cloud** | Com Supabase configurado | PostgreSQL (Supabase) |

---

## 2. Fluxos do Sistema

### 2.1 Fluxo de Autenticação

```
App Start → AuthProvider
                │
                ├── isSupabaseConfigured = NÃO → Direct to App (Local Mode)
                │
                └── isSupabaseConfigured = SIM → LoginScreen → User Login
                                                      │
                                                      ▼
                                            WorkspaceContext (cria workspace)
                                                      │
                                                      ▼
                                            useDataRepository (carrega dados)
```

### 2.2 Fluxo de Dados (Repository)

```
useDataRepository()
        │
        ▼
isSupabaseConfigured = true?
        │
    SIM ▼           ▼ NÃO
┌─────────────┐   ┌─────────────┐
│ Supabase    │   │ localStorage│
│ Repository  │   │             │
│ (CRUD)     │   │ getItem/    │
│             │   │ setItem     │
└─────────────┘   └─────────────┘
```

### 2.3 Fluxo de Criação de Tarefa

```
Sidebar "Nova Tarefa" → AppContent → AddTaskModal (Formulário)
                                              │
                                              ▼
                                    Task Types:
                                    • Única (dia específico)
                                    • Permanente (todos os dias)
                                    • Entrega (prazo final)
                                              │
                                              ▼
                                    handleAddTask → addTask()
                                              │
                                              ▼
                                    Repository (Create)
```

### 2.4 Fluxo de Visualização

```
Sidebar
├── Navigation: Planner | Calendário
├── Date Picker: Próximos 7 dias
├── Categorias | Configurações | Membros
│
└──► Planner View ◄─────────────► Calendar View
      │                              │
      │                              │
      • Data atual                  • Mês completo
      • Tarefas do dia              • Dias com tarefas
      • Progresso                   • Lista dia selecionado
      • Agrupamento:
        - Entregas                  │
        - Permanentes               │
        - Únicas                    ▼
                            Tarefas do Dia Selecionado
```

---

## 3. Todas as Funcionalidades

### 3.1 Gerenciamento de Tarefas
- ✅ **Tarefas Únicas** - Tarefas para um dia específico
- ✅ **Tarefas Permanentes** - Rotinas que aparecem todos os dias
- ✅ **Tarefas de Entrega** - Tarefas com prazo final (mostradas até a data)
- ✅ **Categorização** - Associar tarefas a categorias (Trabalho, Pessoal, Saúde)
- ✅ **Edição** - Editar tarefas existentes
- ✅ **Exclusão** - Remover tarefas (com confirmação opcional)
- ✅ **Conclusão** - Alternar status de conclusão

### 3.2 Visualização
- ✅ **Planner Diário** - Lista de tarefas do dia com progresso
- ✅ **Calendário** - Visualização mensal com indicadores de tarefas
- ✅ **Navegação por Data** - Navegar entre datas usando a sidebar
- ✅ **Busca** - Pesquisar tarefas por texto

### 3.3 Configurações
- ✅ **Modo Escuro** - Toggle dark mode
- ✅ **Confirmar Exclusão** - Confirmação antes de deletar
- ✅ **Mostrar Concluídas** - Mostrar/ocultar tarefas concluídas
- ✅ **Limpar Dados** - Limpar todos os dados

### 3.4 Colaboração
- ✅ **Workspaces** - Múltiplos workspaces (Pessoal, Família, Empresa)
- ✅ **Membros** - Adicionar/remover membros da equipe
- ✅ **Perfis** - Owner (dono) e Member (membro)

### 3.5 Sistema
- ✅ **Modo Local** - Funcionalidade offline sem Supabase
- ✅ **Modo Cloud** - Sincronização com Supabase (quando configurado)
- ✅ **Autenticação** - Login/logout (quando Supabase configurado)

---

## 4. Fluxo de Arquivos para Execução

### 4.1 Estrutura de Arquivos

```
Entry Point
    │
    └── index.html
            │
            └── src/main.tsx
                    │
                    └── src/app/App.tsx (Main Component)
                            │
                            ├── AuthProvider (Auth Wrapper)
                            │       │
                            │       └── LoginScreen (se não autenticado)
                            │
                            ├── WorkspaceProvider (Workspace Context)
                            │       │
                            │       └── AppContent
                            │
                            ├── Sidebar (Navigation)
                            │       ├── Date Navigation
                            │       ├── View Switcher (Planner/Calendar)
                            │       └── Modals Trigger
                            │
                            ├── Main Content Area
                            │       ├── PlannerView / CalendarView
                            │       └── TaskList → TaskItem (x N)
                            │
                            └── Modals
                                    ├── AddTaskModal
                                    ├── CategoryModal
                                    ├── SettingsModal
                                    └── MembersModal
```

### 4.2 Cadeia de Dados (Data Flow)

```
src/app/App.tsx
    │
    └── useDataRepository()
            │
            ├── isSupabaseConfigured?
            │       │
            │       ├── SIM → SupabaseRepository
            │       │       │
            │       │       └── supabase (lib/supabase.ts)
            │       │               │
            │       │               └── Tabelas: tasks, categories, settings
            │       │
            │       └── NÃO → localStorage
            │               │
            │               ├── agenda-tasks
            │               ├── agenda-categories
            │               └── agenda-settings
            │
            └── Returns:
                    • tasks[]
                    • categories[]
                    • settings{}
                    • addTask(), updateTask(), deleteTask()
                    • addCategory(), deleteCategory()
                    • updateSettings(), clearAll()
```

### 4.3 Arquivos Principais e Suas Responsabilidades

| Arquivo | Responsabilidade |
|---------|------------------|
| `src/main.tsx` | Entry point da aplicação React |
| `src/app/App.tsx` | Componente principal, gerencia estado global |
| `src/app/components/AuthProvider.tsx` | Gerencia autenticação |
| `src/app/components/Sidebar.tsx` | Navegação e seleção de data |
| `src/app/components/AddTaskModal.tsx` | Modal para criar/editar tarefas |
| `src/app/components/TaskItem.tsx` | Componente individual de tarefa |
| `src/app/components/CalendarView.tsx` | Visualização em calendário |
| `src/app/components/CategoryModal.tsx` | Gerenciar categorias |
| `src/app/components/SettingsModal.tsx` | Configurações do app |
| `src/app/components/MembersModal.tsx` | Gerenciar membros do workspace |
| `src/app/components/LoginScreen.tsx` | Tela de login |
| `src/app/components/LocalModeBanner.tsx` | Banner modo local |
| `src/app/components/AdBanner.tsx` | Banner de anúncios |
| `src/app/hooks/useDataRepository.ts` | Hook central de dados |
| `src/app/context/WorkspaceContext.tsx` | Context de workspaces |
| `src/app/services/SupabaseRepository.ts` | Repositório para Supabase |
| `src/app/types.ts` | Definições de tipos TypeScript |
| `src/app/lib/supabase.ts` | Configuração do cliente Supabase |

### 4.4 Diretórios

```
src/
├── main.tsx                    # Entry point
├── app/
│   ├── App.tsx                # Componente principal
│   ├── types.ts               # TypeScript interfaces
│   ├── components/            # Componentes React
│   │   ├── AuthProvider.tsx
│   │   ├── Sidebar.tsx
│   │   ├── TaskItem.tsx
│   │   ├── AddTaskModal.tsx
│   │   ├── CalendarView.tsx
│   │   ├── CategoryModal.tsx
│   │   ├── SettingsModal.tsx
│   │   ├── MembersModal.tsx
│   │   ├── LoginScreen.tsx
│   │   ├── LocalModeBanner.tsx
│   │   ├── AdBanner.tsx
│   │   └── ui/                # Componentes shadcn/ui
│   ├── hooks/                  # Custom hooks
│   │   ├── useDataRepository.ts
│   │   ├── useLocalStorage.ts
│   │   └── useRepository.ts
│   ├── context/                # React Contexts
│   │   └── WorkspaceContext.tsx
│   ├── services/              # Repositórios
│   │   ├── SupabaseRepository.ts
│   │   └── types.ts
│   ├── lib/                   # Bibliotecas
│   │   └── supabase.ts
│   └── utils/                 # Utilitários
│       └── migrateFromLocalStorage.ts
├── styles/                     # Estilos
│   ├── index.css
│   ├── tailwind.css
│   ├── theme.css
│   └── fonts.css
```

---

## 5. Modelos de Dados (Types)

```
typescript
// Tarefa
interface Task {
  id: string;
  text: string;
  isPermanent: boolean;        // Tarefa permanente (todos os dias)
  completedDates: string[];    // Datas de conclusão (para tasks permanentes)
  date?: string;               // Data específica (YYYY-MM-DD)
  completed?: boolean;        // Concluída (para tasks únicas)
  categoryId?: string;
  isDelivery?: boolean;        // É tarefa de entrega
  deliveryDate?: string;       // Data de entrega
  assignedToId: string;       // ID do responsável
  createdById: string;        // ID de quem criou
  workspaceId: string;        // ID do workspace
}

// Categoria
interface Category {
  id: string;
  name: string;
  color: string;
}

// Configurações
interface Settings {
  darkMode: boolean;
  showCompleted: boolean;
  confirmDelete: boolean;
}

// Workspace
interface Workspace {
  id: string;
  name: string;
  type: 'family' | 'business' | 'personal';
  ownerId: string;
  memberIds: string[];
  createdAt: string;
}

// Usuário
interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'owner' | 'member';
}
```

---

## 6. Resumo Visual do Fluxo Completo

```
┌────────────────────────────────────────────────────────────────────┐
│                        USER INTERFACE                               │
│                                                                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐            │
│  │ Sidebar  │  │  Header  │  │  Modal   │  │  Banner  │            │
│  │          │  │          │  │          │  │          │            │
│  │• Dates   │  │• Date    │  │• AddTask │  │• Local   │            │
│  │• Views   │  │• Search  │  │• Category│  │• Ads     │            │
│  │• Config  │  │• Stats   │  │• Settings│  │          │            │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └──────────┘            │
│       │               │              │                                 │
│       └───────────────┴──────────────┘                                │
│                           │                                           │
│                           ▼                                           │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │                         App.tsx                                 │   │
│  │  ┌──────────────────────────────────────────────────────────┐  │   │
│  │  │              WorkspaceContext                              │  │   │
│  │  │  • currentWorkspace • members • createWorkspace()         │  │   │
│  │  └──────────────────────────────────────────────────────────┘  │   │
│  │                              │                                   │   │
│  │                              ▼                                   │   │
│  │  ┌──────────────────────────────────────────────────────────┐  │   │
│  │  │                   useDataRepository                        │  │   │
│  │  │                                                            │  │   │
│  │  │  tasks[] ◄───────────┐   categories[] ◄──────────┐       │  │   │
│  │  │                     │                            │       │  │   │
│  │  │  addTask() ─────────┼────► createTask()          │       │  │   │
│  │  │  updateTask() ──────┼────► updateTask()          │       │  │   │
│  │  │  deleteTask() ──────┼────► deleteTask()          │       │  │   │
│  │  │                     │                            │       │  │   │
│  │  └─────────────────────┼────────────────────────────┘       │  │   │
│  │                        │                                     │  │   │
│  └────────────────────────┼────────────────────────────────────┘  │   │
│                           │                                          │
└───────────────────────────┼──────────────────────────────────────────┘
                            │
            ┌───────────────┴───────────────┐
            ▼                               ▼
┌─────────────────────┐         ┌─────────────────────┐
│    LOCAL MODE      │         │    CLOUD MODE      │
│                    │         │                    │
│  localStorage      │         │  Supabase (Postgre)│
│                    │         │                    │
│  • agenda-tasks    │         │  • tasks table    │
│  • agenda-categories│        │  • categories table│
│  • agenda-settings │         │  • settings table  │
│  • workspaces_*   │         │  • RLS policies    │
│  • members_*      │         │  • Auth required   │
└─────────────────────┘         └─────────────────────┘
```

---

## 7. Como Executar o Projeto

### Pré-requisitos
- Node.js 18+
- npm ou yarn

### Instalação
```
bash
npm install
```

### Executar em modo desenvolvimento
```
bash
npm run dev
```

### Build para produção
```
bash
npm run build
```

### Configurar Supabase (opcional)
1. Criar projeto no Supabase
2. Criar arquivo `.env` na raiz:
```
VITE_SUPABASE_URL=sua_url_aqui
VITE_SUPABASE_ANON_KEY=sua_chave_aqui
```
3. Sem estas variáveis, o app funciona em modo local (localStorage)

---

Este é o resumo completo de todos os fluxos do sistema TaskPlanner, suas funcionalidades e a jornada dos arquivos para executá-lo! 🚀
