# Problemas Identificados em Produção

Este documento lista os problemas de código identificados no projeto TaskPlanner que podem causar falhas ou comportamentos inesperados em ambiente de produção.

---

## 1. SupabaseRepository.ts

### 1.1 Uso de `any` para tipagem de dados do banco
**Severidade:** Média
**Local:** `src/app/services/SupabaseRepository.ts`

```typescript
// Linha ~109
return data.map((row: any) => ({
  id: row.id,
  text: row.text,
  // ...
}));
```

**Problema:** O uso de `any` elimina a verificação de tipos e pode causar erros difíceis de rastrear quando a estrutura do banco muda.

**Recomendação:** Definir interfaces para as respostas do banco:
```typescript
interface TaskRow {
  id: string;
  text: string;
  is_permanent: boolean;
  // ... outros campos
}
```

### 1.2 `crypto.randomUUID()` sem verificação
**Severidade:** Média
**Local:** `src/app/services/SupabaseRepository.ts` (linhas 4-6)

```typescript
const INITIAL_CATEGORIES: Category[] = [
  { id: crypto.randomUUID(), name: 'Trabalho', color: 'bg-blue-500 text-white' },
  // ...
];
```

**Problema:** `crypto.randomUUID()` pode não estar disponível em todos os navegadores ou contextos (SSR).

**Recomendação:** Usar uma função wrapper:
```typescript
function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
```

### 1.3 Erros silenciados na criação de categorias
**Severidade:** Alta
**Local:** `src/app/services/SupabaseRepository.ts` (~linha 213)

```typescript
} catch (e: any) {
  // Se der erro de uniqueness, a categoria já existe
  if (e.code !== '23505') throw e;
}
```

**Problema:** Apenas o erro de uniqueness é tratado. Outros erros (RLS, conexão, etc.) são silenciados.

**Recomendação:** Tratar erros específicos e informar o usuário.

### 1.4 Timeout hardcoded de 8 segundos
**Severidade:** Baixa
**Local:** `src/app/hooks/useDataRepository.ts` (~linha 89)

```typescript
setTimeout(() => reject(new Error('Timeout')), 8000);
```

**Problema:** Tempo fixo pode ser muito longo ou curto dependendo da conexão.

**Recomendação:** Tornar configurável via variável de ambiente.

---

## 2. useLocalStorage.ts

### 2.1 Erros silenciados completamente
**Severidade:** Alta
**Local:** `src/app/hooks/useLocalStorage.ts`

```typescript
try {
  const item = window.localStorage.getItem(key);
  return item ? JSON.parse(item) : initialValue;
} catch (error) {
  return initialValue; // Silencia TODOS os erros
}

try {
  window.localStorage.setItem(key, JSON.stringify(storedValue));
} catch (error) {
  // Error saving to localStorage - silenciado!
}
```

**Problema:** 
- Erros de quota exceeded, dados corrompidos, ou acesso negado são ignorados
- Usuário não sabe que seus dados não estão sendo salvos

**Recomendação:** 
```typescript
catch (error) {
  console.error('Erro ao salvar no localStorage:', error);
  // Opcional: Notificar o usuário
}
```

### 2.2 Sem verificação de `window`
**Severidade:** Média
**Local:** `src/app/hooks/useLocalStorage.ts`

**Problema:** O hook assume que está rodando no browser, mas pode falhar em SSR ou testes.

**Recomendação:**
```typescript
const [storedValue, setStoredValue] = useState<T>(() => {
  if (typeof window === 'undefined') {
    return initialValue;
  }
  try {
    // ...
  } catch (error) {
    return initialValue;
  }
});
```

---

## 3. useDataRepository.ts

### 3.1 Singleton do repository pode causar vazamento de estado
**Severidade:** Média
**Local:** `src/app/hooks/useDataRepository.ts` (~linhas 31-37)

```typescript
let repositoryInstance: SupabaseRepository | null = null;

function getRepository(): SupabaseRepository {
  if (!repositoryInstance) {
    repositoryInstance = new SupabaseRepository();
  }
  return repositoryInstance;
}
```

**Problema:** O singleton mantém referência ao estado entre hot reloads em desenvolvimento, podendo causar comportamentos inesperados.

**Recomendação:** Em desenvolvimento, sempre criar nova instância:
```typescript
const isDev = process.env.NODE_ENV === 'development';
if (!repositoryInstance || isDev) {
  repositoryInstance = new SupabaseRepository();
}
```

### 3.2 Erros silenciados nos callbacks
**Severidade:** Alta
**Local:** `src/app/hooks/useDataRepository.ts` (múltiplas linhas)

```typescript
try {
  await repository.createTask(newTask);
} catch (err) {
  // Silenciosamente ignora erros
}
```

**Problema:** Operações podem falhar sem o usuário saber. Dados locais são atualizados mas o servidor não recebe.

**Recomendação:**
```typescript
try {
  await repository.createTask(newTask);
} catch (err) {
  console.error('Erro ao salvar tarefa no servidor:', err);
  // Opcional: Reverter a mudança local ou notificar
}
```

### 3.3 Race conditions entre estado local e servidor
**Severidade:** Alta
**Local:** `src/app/hooks/useDataRepository.ts` (~linhas 139-147)

```typescript
const addTask = useCallback(async (taskData) => {
  // Atualiza estado local IMEDIATAMENTE
  setTasks(prev => [newTask, ...prev]);

  // Tenta salvar no servidor DEPOIS
  if (isSupabaseMode && !loading) {
    try {
      await repository.createTask(newTask);
    } catch (err) {
      // Se falhar, a tarefa fica no estado local mas não no servidor!
    }
  }
}, [...]);
```

**Problema:** Se a operação do servidor falhar, o estado local fica inconsistente.

**Recomendação:** Usar padrão de optimistic updates com rollback:
```typescript
try {
  await repository.createTask(newTask);
  // Só atualiza local após sucesso
  setTasks(prev => [newTask, ...prev]);
} catch (err) {
  console.error('Erro ao salvar:', err);
  toast.error('Erro ao salvar. Tente novamente.');
}
```

---

## 4. AddTaskModal.tsx

### 4.1 Timer sem cleanup adequado
**Severidade:** Média
**Local:** `src/app/components/AddTaskModal.tsx` (~linhas 75-85)

```typescript
useEffect(() => {
  const newDuration = calculateDefaultDuration(scheduledTime);
  setEstimatedDurationMinutes(newDuration);
  setYellowAlertMinutes(Math.max(15, Math.floor(newDuration / 2)));
}, [scheduledTime]);
```

**Problema:** O useEffect não cria timers, mas se houvesse, poderiam vazar.

### 4.2 Parse de inteiros sem validação
**Severidade:** Baixa
**Local:** `src/app/components/AddTaskModal.tsx`

```typescript
onChange={(e) => setEstimatedDurationMinutes(parseInt(e.target.value) || 60)}
```

**Problema:** `parseInt` retorna NaN para valores inválidos, mas o `|| 60` trata isso.

**Recomendação:** Validar explicitamente:
```typescript
const value = parseInt(e.target.value);
if (isNaN(value) || value < 15 || value > 720) return;
setEstimatedDurationMinutes(value);
```

---

## 5. TaskItem.tsx

### 5.1 Cálculos de tempo em cada render
**Severidade:** Baixa
**Local:** `src/app/components/TaskItem.tsx` (~linhas 36-65)

```typescript
const getTimeStatus = (): 'normal' | 'yellow' | 'red' => {
  // Calcula tempo atual
  const now = new Date();
  // ...
}
```

**Problema:** `new Date()` é chamado em cada render, causando re-renders constantes.

**Recomendação:** Usar `useMemo` com intervalo:
```typescript
const [now, setNow] = useState(() => new Date());

useEffect(() => {
  const interval = setInterval(() => setNow(new Date()), 60000); // a cada minuto
  return () => clearInterval(interval);
}, []);

const timeStatus = useMemo(() => calculateTimeStatus(now, task), [now, task]);
```

### 5.2 Parse de data sem try/catch
**Severidade:** Média
**Local:** `src/app/components/TaskItem.tsx` (~linha 42)

```typescript
const delivery = parseISO(task.deliveryDate);
```

**Problema:** Se `deliveryDate` for inválido, `parseISO` pode lançar erro.

**Recomendação:**
```typescript
try {
  const delivery = parseISO(task.deliveryDate);
  return differenceInDays(delivery, currentDate);
} catch {
  return null;
}
```

---

## 6. App.tsx

### 6.1 Recarregamento de página após login
**Severidade:** Média
**Local:** `src/app/App.tsx` (~linha 90)

```typescript
<LoginScreen onLoginSuccess={() => {
  // Forçar re-render após login bem-sucedido
  window.location.reload();
}} />
```

**Problema:** `window.location.reload()` causa perda de estado e experiência ruim.

**Recomendação:** Atualizar estado de autenticação:
```typescript
const { loading, isLoggedIn, isSupabaseConfigured } = useAuthCheck();

useEffect(() => {
  if (!loading && isLoggedIn && appState === 'auth') {
    setAppState('app');
  }
}, [loading, isLoggedIn]);
```

### 6.2 Estados inicializados com funções
**Severidade:** Baixa
**Local:** `src/app/App.tsx` (~linha 114)

```typescript
const [selectedDate, setSelectedDate] = useState(() => new Date());
```

**Problema:** `new Date()` é executado em cada render se não usar função. Mas este código está correto.

### 6.3 Memoziação pesada com cálculos
**Severidade:** Baixa
**Local:** `src/app/App.tsx` (~linhas 150-170)

```typescript
const filteredTasks = useMemo(() => {
  return tasks.filter(task => {
    // múltiplas verificações
  });
}, [tasks, formattedSelectedDate, searchQuery, currentDayOfWeek]);
```

**Problema:** O cálculo pode ser pesado se houver muitas tarefas.

---

## 7. LoginScreen.tsx

### 7.1 Rate limiting client-side pode ser burlado
**Severidade:** Baixa
**Local:** `src/app/components/LoginScreen.tsx` (~linhas 30-60)

```typescript
const isBlocked = useCallback(() => {
  return blockedUntil !== null && new Date() < blockedUntil;
}, [blockedUntil]);
```

**Problema:** Usuário pode limpar localStorage ou usar múltiplos dispositivos para burlar.

**Recomendação:** O rate limiting real deve ser feito no servidor (Supabase já faz isso).

### 7.2 Countdown com memory leak potencial
**Severidade:** Baixa
**Local:** `src/app/components/LoginScreen.tsx` (~linhas 31-45)

```typescript
useEffect(() => {
  if (blockedUntil && countdown > 0) {
    countdownRef.current = setTimeout(() => {
      setCountdown(prev => prev - 1);
    }, 1000);
    return () => {
      if (countdownRef.current) clearTimeout(countdownRef.current);
    };
  }
}, [blockedUntil, countdown]);
```

**Problema:** O cleanup está correto, mas pode haver race condition se `blockedUntil` mudar rapidamente.

### 7.3 Ref para evitar múltiplas chamadas
**Severidade:** Baixa
**Local:** `src/app/components/LoginScreen.tsx` (~linha 26)

```typescript
const hasCalledOnLoginSuccess = useRef(false);
```

**Problema:** Usar ref para controle de fluxo pode ser confuso. Pode ser substituído por useEffect.

---

## 8. Problemas Gerais

### 8.1 Ausência de Error Boundaries
**Severidade:** Alta

O React não tem Error Boundaries para capturar erros de componentes filhos.

**Recomendação:** Criar um Error Boundary:
```typescript
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  
  static getDerivedStateFromError(error) {
    return { hasError: true };
  }
  
  render() {
    if (this.state.hasError) {
      return <div>Algo deu errado. <button onClick={() => window.location.reload()}>Recarregar</button></div>;
    }
    return this.props.children;
  }
}
```

### 8.2 Falta de validação de entrada
**Severidade:** Média

Diversos componentes não validam dados antes de processar.

### 8.3 Ausência de testes automatizados
**Severidade:** Alta

Sem testes, bugs podem passar despercebidos até produção.

---

## Priorização de Correções

### Crítico (Corrigir imediatamente):
1. Error Boundaries
2. Erros silenciados no repository (3.2, 3.3)
3. localStorage sem tratamento de erros (2.1)

### Alto (Corrigir em breve):
1. Uso de `any` no repository (1.1)
2. Race conditions (3.3)
3. Singleton com hot reload (3.1)

### Médio (Corrigir quando possível):
1. Validação de entrada
2. Timeout configurável
3. Verificações de SSR

### Baixo (Nice to have):
1. Cálculos de tempo otimizados
2. Rate limiting server-side
3. Testes automatizados

---

*Documento gerado automaticamente em $(date)*

