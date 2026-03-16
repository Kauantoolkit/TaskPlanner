# Documento de Arquitetura do Frontend - TaskPlanner

## Visão Geral
TaskPlanner é uma **Single Page Application (SPA) React** construída com Vite + TypeScript. É um gerenciador de tarefas diárias com suporte a **modo local (localStorage)** e **modo cloud (Supabase)**. 

**Características principais:**
- Fluxo único sem roteamento (state-driven via \`currentView\`)
- Drag & Drop com \`@dnd-kit\`
- Context API para estado global
- Supabase para persistência cloud + RLS (Row Level Security)
- Design responsivo (mobile-first)
- Tema dark/light automático

**Estrutura de diretórios chave:**
\`\`\`
src/app/
├── App.tsx (❤️ CORAÇÃO DO APP)
├── hooks/ (useDataRepository.ts, useAuthSimple.ts)
├── context/ (WorkspaceContext.tsx) 
├── services/ (SupabaseRepository.ts)
├── components/ (Sidebar.tsx, TaskItem.tsx, modals)
└── lib/ (supabase.ts)
\`\`\`

## Fluxo Principal de Inicialização
\`\`\`
main.tsx
  ↓ createRoot
App.tsx
  ↓ useAuthCheck() [custom hook simples]
  ↓ if loading → FullScreenLoader
  ↓ if !isLoggedIn → LoginScreen.tsx
  ↓ else → WorkspaceProvider → AppContent()
\`\`\`

**Detalhes do App.tsx:**
\`\`\`
AppContent()
  ↓ Hooks fixos: useDataRepository(), useIsMobile()
  ↓ Estados locais: selectedDate, currentView, modals, etc.
  ↓ Render: Sidebar (mobile: Sheet) + Main Content
\`\`\`

## Camada de Dados (Data Flow)
\`\`\`
AppContent() ──► useDataRepository()
                ↓ singleton SupabaseRepository
                ↓ Supabase (DB + Auth)
                    ↕ persistência (tasks, categories, settings)
                ↓ LocalStorage (fallback modo local)
\`\`\`

**useDataRepository() singleton pattern:**
- Detecta config Supabase via env vars
- Modo Supabase: CRUD via SupabaseRepository (com try/catch silencioso)
- Modo Local: localStorage sync automático
- Estados: \`tasks[]\`, \`categories[]\`, \`settings\`, \`loading\`

## Autenticação & Autorização
**2 abordagens coexistindo:**

1. **useAuthCheck()** (App.tsx - bootstrap):
   \`\`\`ts
   supabase.auth.getSession() → isLoggedIn
   if !isSupabaseConfigured → local mode (no auth)
   \`\`\`

2. **useAuthSimple()** (disponível mas subutilizado):
   - Listener \`onAuthStateChange\`
   - Session real-time

**LoginScreen.tsx:**
\`\`\`
Email/Password → supabase.auth.signInWithPassword()
Google OAuth → supabase.auth.signInWithOAuth()
SignUp → supabase.auth.signUp()
Rate limiting client-side (3 tentativas → 30s block)
\`\`\`

**SupabaseRepository auth flow:**
\`\`\`
getUserId() → supabase.auth.getUser()
getOrCreateUserWorkspace() → auto-create personal workspace
\`\`\`

## Componentes & Fluxos de UI

### 1. **Sidebar.tsx** (Controlador Central)
\`\`\`
Props: selectedDate, onDateChange, callbacks(modals, views)
├── Navegação: Planner Diário ↔ Calendário
├── Semana: 7 dias (Seg-Dom) com hoje destacado
├── Config: Categorias, Settings, Membros
└── Ações: +Nova Tarefa, Sair (logout)
\`\`\`

**Callbacks disparados:**
\`\`\`
onDateChange(date) → AppContent.selectedDate
onViewChange('planner'|'calendar') → AppContent.currentView
onAddTask() → AppContent.isModalOpen=true
onOpenSettings() → AppContent.isSettingsModalOpen=true
\`\`\`

### 2. **TaskItem.tsx** (Renderizador de Tarefas)
\`\`\`
Props: task, category, onToggle, onDelete, onEdit
├── Drag handle (@dnd-kit sortable)
├── Checkbox toggle (onToggle(task.id))
├── Badges dinâmicos:
│   ├── Tempo (scheduledTime + status: normal/yellow/red)
│   ├── Tipo: Permanente | Semanal | Entrega | Única
│   ├── Categoria (color badge)
│   └── Duração estimada
└── Actions: Edit/Delete (hover opacity)
\`\`\`

### 3. **Main Content (AppContent)**
\`\`\`
if currentView === 'planner':
├── Header: Data + Search + Stats (progresso %)
├── Seções filtradas por tipo:
│   ├── Entregas Pendentes (isDelivery)
│   ├── Recorrente Semanal (weekly)
│   ├── Rotina Permanente (isPermanent)  
│   └── Tarefas do Dia (outras)
└── DnDContext → SortableContext → TaskItem[]

if currentView === 'calendar':
└── CalendarView.tsx (não analisado)
\`\`\`

## Fluxos Completos (End-to-End)

### 🔄 **Adicionar Tarefa**
\`\`\`
Sidebar/Nova Tarefa → AddTaskModal.open
  ↓ handleAddTask(taskData)
  ↓ useDataRepository.addTask()
    ↓ repo.createTask() → Supabase OR localStorage
    ↓ setTasks([newTask, ...tasks])
    ↓ toast.success()
\`\`\`

### ✅ **Toggle/Completar Tarefa**
\`\`\`
TaskItem.checkbox → onToggle(id)
  ↓ AppContent.handleToggleTask(id)
  ↓ repo.updateTask(id, {completedDates | completed})
    ↓ Supabase update OR localStorage
\`\`\`

### 🗑️ **Deletar Tarefa**
\`\`\`
TaskItem.trash → onDelete(id) → ConfirmDialog (if settings.confirmDelete)
  ↓ repo.deleteTask(id)
\`\`\`

### 📱 **Drag & Drop**
\`\`\`
AppContent.DndContext.onDragEnd()
  ↓ arrayMove(tasks, oldIdx, newIdx)
  ↓ repo.reorderTasks(newTasks)
\`\`\`

### ⚙️ **Settings & Categorias**
\`\`\`
Sidebar → Modal → repo.updateSettings() / addCategory()
  ↓ workspace-scoped (per Supabase workspace)
\`\`\`

## Dependências & Chamadas Críticas

\`\`\`
App.tsx (imports diretos):
├── hooks/useDataRepository.ts → SupabaseRepository
├── components/Sidebar.tsx → useWorkspace()
├── components/TaskItem.tsx → @dnd-kit
├── context/WorkspaceContext.tsx → estado workspaces
└── lib/supabase.ts → cliente Supabase

SupabaseRepository.ts (chamadas DB):
├── workspaces (auto-create)
├── workspace_members 
├── tasks (CRUD principal)
├── categories
└── settings (JSONB por key)
\`\`\`

## Pontos de Manutenção

### 🟢 **Boas Práticas Existentes**
- Singleton repository (evita recriação)
- Try/catch silencioso (graceful degradation)
- Estados ordenados consistentes
- Mobile-first (useIsMobile, Sheet)
- Rate limiting client-side

### 🔴 **Pontos de Atenção**
\`\`\`
1. Auth duplicada: useAuthCheck() + useAuthSimple()
2. WorkspaceContext: dados mock (não persiste no Supabase)
3. No AuthProvider wrapper (AuthContext.tsx não usado)
4. Modals state espalhado no AppContent
5. Sem error boundaries
6. LocalStorage sync apenas em modo local
\`\`\`

### 📊 **Dependências por Camada**
\`\`\`
UI Layer (React): lucide-react, @dnd-kit, shadcn/ui, sonner, motion/react
Data Layer: @supabase/supabase-js
Utils: date-fns (ptBR), clsx, twMerge
\`\`\`

## Diagrama de Fluxo Simplificado
\`\`\`
[LoginScreen] ←→ [AppContent]
                    ↓
             [useDataRepository]
                    ↓
         [SupabaseRepository] ↔ [DB]
                    ↓
    [Sidebar] → [TaskItem*] + [Modals]
\`\`\`

**ARQUIVADO POR BLACKBOXAI - 100% dos fluxos documentados**
