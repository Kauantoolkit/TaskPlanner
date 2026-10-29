import React, { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Search, CalendarCheck2, ListTodo, Menu, Loader2 } from 'lucide-react';
import { Toaster, toast } from 'sonner';
import { motion as Motion, AnimatePresence } from 'motion/react';
import { Sidebar } from './components/Sidebar';
import { TaskItem } from './components/TaskItem';
import { AddTaskModal } from './components/AddTaskModal';
import { CategoryModal } from './components/CategoryModal';
import { SettingsModal } from './components/SettingsModal';
import { CalendarView } from './components/CalendarView';
import { ConfirmDialog } from './components/ConfirmDialog';
import { MembersModal } from './components/MembersModal';
import { LoginScreen } from './components/LoginScreen';
import { AdBanner } from './components/AdBanner';
import { ImageWithFallback } from './components/figma/ImageWithFallback';
import { useIsMobile } from './components/ui/use-mobile';
import { Sheet, SheetContent } from './components/ui/sheet';
import { isSupabaseConfigured } from './lib/supabase';
import { useAuth } from './auth/AuthProvider';
import { WorkspaceProvider, useWorkspace } from './context/WorkspaceContext';
import {
  useCategories, useCategoryActions, useDailyLogs, usePreferences, useSaveDailyLog,
  useSavePreferences, useTaskActions, useTasks,
} from './data/hooks';
import { clearWorkspace } from './data/api';
import { useQueryClient } from '@tanstack/react-query';
import { dayProgress, tasksForDay, toIsoDate, type Task, type TaskDraft } from './domain/tasks';

function FullScreenLoader() {
  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-gray-950 flex items-center justify-center">
      <div className="text-center">
        <Loader2 size={48} className="text-blue-600 animate-spin mx-auto mb-4" />
        <p className="text-gray-400 font-bold">Carregando...</p>
      </div>
    </div>
  );
}

function MissingConfig() {
  return (
    <div className="min-h-screen bg-[#fafafa] flex items-center justify-center p-6">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-black text-gray-800 mb-2">Supabase não configurado</h1>
        <p className="text-gray-500">
          Defina <code>VITE_SUPABASE_URL</code> e <code>VITE_SUPABASE_ANON_KEY</code> no <code>.env</code> e
          reinicie o servidor. Veja <code>SUPABASE_SETUP.md</code>.
        </p>
      </div>
    </div>
  );
}

export default function App() {
  const { loading, user } = useAuth();

  if (!isSupabaseConfigured) return <MissingConfig />;
  if (loading) return <FullScreenLoader />;
  if (!user) {
    return (
      <div className="min-h-screen bg-[#fafafa] dark:bg-gray-950">
        <Toaster position="top-right" />
        <LoginScreen />
      </div>
    );
  }

  return (
    // key: trocar de usuário recria todo o estado
    <WorkspaceProvider key={user.id}>
      <WorkspaceGate />
    </WorkspaceProvider>
  );
}

function WorkspaceGate() {
  const { loading, currentWorkspace } = useWorkspace();
  if (loading || !currentWorkspace) return <FullScreenLoader />;
  // key: trocar de workspace zera filtros, modais e o dia selecionado
  return <AppContent key={currentWorkspace.id} />;
}

/** Relógio que atualiza a cada minuto, para os alertas de horário. */
function useMinuteClock(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

// AppContent SEM props - todos os hooks são fixos
function AppContent() {
  const isMobile = useIsMobile();
  const now = useMinuteClock();
  const queryClient = useQueryClient();
  const { currentWorkspace, isOwner } = useWorkspace();

  const tasksQuery = useTasks();
  const tasks = tasksQuery.data ?? [];
  const categories = useCategories().data ?? [];
  const settings = usePreferences();
  const savePreferences = useSavePreferences();
  const taskActions = useTaskActions();
  const categoryActions = useCategoryActions();
  const deliveryIds = useMemo(() => tasks.filter(t => t.kind === 'delivery').map(t => t.id), [tasks]);
  const dailyLogs = useDailyLogs(deliveryIds).data ?? [];
  const saveDailyLog = useSaveDailyLog();

  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [currentView, setCurrentView] = useState<'planner' | 'calendar'>('planner');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingTask, setEditingTask] = useState<Task | undefined>(undefined);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<{ id: string; text: string } | null>(null);

  const day = toIsoDate(selectedDate);

  const filteredTasks = useMemo(
    () => tasksForDay(tasks, day, {
      search: searchQuery,
      sortByTime: settings.sortByTime,
      showCompleted: settings.showCompleted,
    }),
    [tasks, day, searchQuery, settings.sortByTime, settings.showCompleted],
  );

  const stats = useMemo(() => dayProgress(tasks, day), [tasks, day]);

  if (tasksQuery.isPending) return <FullScreenLoader />;
  if (tasksQuery.isError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="font-bold text-gray-700">Não foi possível carregar as tarefas.</p>
        <p className="text-sm text-gray-400">{tasksQuery.error.message}</p>
        <button onClick={() => tasksQuery.refetch()} className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold">
          Tentar de novo
        </button>
      </div>
    );
  }

  const handleSubmitTask = async (draft: TaskDraft) => {
    if (editingTask) {
      await taskActions.edit(editingTask.id, draft);
      toast.success('Tarefa atualizada!');
    } else {
      await taskActions.create(draft);
      toast.success(draft.kind === 'delivery' ? 'Entrega criada!' : draft.kind === 'weekly' ? 'Tarefa semanal criada!' : 'Tarefa adicionada!');
    }
  };

  const handleSaveLog = (taskId: string, date: string, description: string) =>
    saveDailyLog.mutate({ taskId, date, description });

  const handleDeleteTask = async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (settings.confirmDelete && task) {
      setTaskToDelete({ id: task.id, text: task.text });
      return;
    }
    await taskActions.remove(id).then(() => toast.info('Tarefa removida'), () => {});
  };

  const confirmDeleteTask = async () => {
    if (!taskToDelete) return;
    await taskActions.remove(taskToDelete.id).then(() => toast.info('Tarefa removida'), () => {});
    setTaskToDelete(null);
  };

  const handleAddCategory = (name: string, color: string) =>
    categoryActions.create(name, color).then(() => toast.success('Categoria criada!'), () => {});

  const handleDeleteCategory = (id: string) =>
    categoryActions.remove(id).then(() => toast.info('Categoria removida'), () => {});

  const handleClearAll = async () => {
    try {
      await clearWorkspace(currentWorkspace!.id);
      await queryClient.invalidateQueries();
      setIsSettingsModalOpen(false);
      toast.success('Todos os dados foram limpos.');
    } catch (err) {
      toast.error(`Erro ao limpar dados: ${(err as Error).message}`);
    }
  };

  const handleEditTask = (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (task) {
      setEditingTask(task);
      setIsModalOpen(true);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingTask(undefined);
  };

  return (
    <div className={`flex h-[100dvh] bg-[#fafafa] text-gray-900 font-sans selection:bg-blue-100 ${settings.darkMode ? 'dark' : ''}`}>
      <Toaster position="top-right" />
      
      <div className="flex h-full w-full bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-300">
        {isMobile ? (
          <>
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="fixed top-4 left-4 z-50 p-2 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-100 dark:border-gray-800 min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              <Menu size={24} />
            </button>
            
            <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
              <SheetContent side="left" className="w-80 p-0 bg-white dark:bg-gray-950">
                <Sidebar 
                  selectedDate={selectedDate} 
                  onDateChange={(date) => {
                    setSelectedDate(date);
                    setIsSidebarOpen(false);
                  }} 
                  onAddTask={() => {
                    setIsModalOpen(true);
                    setIsSidebarOpen(false);
                  }}
                  onOpenCategories={() => {
                    setIsCategoryModalOpen(true);
                    setIsSidebarOpen(false);
                  }}
                  onOpenSettings={() => {
                    setIsSettingsModalOpen(true);
                    setIsSidebarOpen(false);
                  }}
                  onViewChange={(view) => {
                    setCurrentView(view);
                    setIsSidebarOpen(false);
                  }}
                  currentView={currentView}
                  onOpenMembers={() => {
                    setIsMembersModalOpen(true);
                    setIsSidebarOpen(false);
                  }}
                />
              </SheetContent>
            </Sheet>
          </>
        ) : (
          <Sidebar 
            selectedDate={selectedDate} 
            onDateChange={setSelectedDate} 
            onAddTask={() => setIsModalOpen(true)}
            onOpenCategories={() => setIsCategoryModalOpen(true)}
            onOpenSettings={() => setIsSettingsModalOpen(true)}
            onViewChange={setCurrentView}
            currentView={currentView}
            onOpenMembers={() => setIsMembersModalOpen(true)}
          />
        )}

        <main className={`flex-1 overflow-y-auto bg-[#fafafa] dark:bg-gray-950 transition-colors duration-300 ${isMobile ? 'pt-16' : ''}`}>
          <AdBanner />
          
          {currentView === 'planner' ? (
            <div className="max-w-4xl mx-auto px-4 md:px-8 py-6 md:py-12">
              <header className="mb-6 md:mb-12">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-4 md:mb-6">
                  <div>
                    <p className="text-sm font-black text-blue-500 uppercase tracking-[0.2em] mb-1">
                      {format(selectedDate, "EEEE", { locale: ptBR })}
                    </p>
                    <h2 className="text-2xl md:text-4xl font-black text-gray-800 dark:text-gray-100 tracking-tight transition-colors">
                      {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
                    </h2>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="relative group w-full md:w-auto">
                      <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                      <input
                        type="text"
                        placeholder="Buscar..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl pl-10 pr-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all w-full md:w-64 text-gray-700 dark:text-gray-200"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-900 p-4 md:p-6 rounded-2xl md:rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col md:flex-row items-center gap-4 md:gap-6 transition-colors">
                  <div className="flex-1 w-full">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Progresso do dia</span>
                      <span className="text-xs font-black text-blue-600">{stats.percentage}%</span>
                    </div>
                    <div className="h-3 w-full bg-gray-50 dark:bg-gray-800 rounded-full overflow-hidden border border-gray-100 dark:border-gray-700 transition-colors">
                      <div 
                        className="h-full bg-blue-600 rounded-full transition-all duration-700 ease-out" 
                        style={{ width: `${stats.percentage}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-right border-l border-gray-100 dark:border-gray-800 md:pl-6 shrink-0 transition-colors">
                    <p className="text-xl md:text-2xl font-black text-gray-800 dark:text-gray-100">{stats.completed}/{stats.total}</p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Concluídas</p>
                  </div>
                </div>
              </header>

              {filteredTasks.length > 0 ? (
                <AnimatePresence mode="popLayout">
                  <Motion.div
                    key={day}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-8 md:space-y-10"
                  >
                    <div className="grid gap-3">
                      {filteredTasks.map(task => (
                        <TaskItem
                          key={task.id}
                          task={task}
                          day={day}
                          now={now}
                          category={categories.find(c => c.id === task.categoryId)}
                          dailyLogs={task.kind === 'delivery' ? dailyLogs.filter(l => l.taskId === task.id) : undefined}
                          onToggle={t => taskActions.toggleDone(t, day)}
                          onDelete={handleDeleteTask}
                          onEdit={handleEditTask}
                          onSaveLog={handleSaveLog}
                        />
                      ))}
                    </div>
                  </Motion.div>
                </AnimatePresence>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 md:py-20 text-center animate-in zoom-in-95 duration-500">
                  <div className="relative mb-6 md:mb-8 px-4">
                    <div className="absolute inset-0 bg-blue-100 rounded-full blur-3xl opacity-30 animate-pulse" />
                    <div className="relative w-48 md:w-64 h-48 md:h-64 rounded-3xl overflow-hidden shadow-2xl rotate-3 mx-auto">
                      <ImageWithFallback 
                        src="https://images.unsplash.com/photo-1551042710-de601b4dcdc3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtaW5pbWFsaXN0JTIwd29ya3NwYWNlJTIwYWdlbmRhJTIwbm90ZWJvb2t8ZW58MXx8fHwxNzcxNjA5OTg0fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
                        alt="Empty agenda"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="absolute -bottom-4 -right-4 bg-white p-3 md:p-4 rounded-2xl shadow-xl">
                      <CalendarCheck2 size={28} className="text-blue-600" />
                    </div>
                  </div>
                  <h3 className="text-xl md:text-2xl font-black text-gray-800 mb-2">Seu dia está livre!</h3>
                  <p className="text-gray-400 font-medium max-w-xs mx-auto">
                    {searchQuery 
                      ? "Não encontramos tarefas com esse termo." 
                      : "Aproveite para descansar ou adicione novas tarefas para se organizar."
                    }
                  </p>
                  {!searchQuery && (
                    <button 
                      onClick={() => setIsModalOpen(true)}
                      className="mt-6 md:mt-8 text-blue-600 font-black flex items-center gap-2 hover:gap-3 transition-all min-h-[44px] px-4"
                    >
                      Criar primeira tarefa <ListTodo size={18} />
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <CalendarView
              tasks={tasks}
              categories={categories}
              selectedDate={selectedDate}
              onDateChange={setSelectedDate}
              now={now}
              sortByTime={settings.sortByTime}
              dailyLogs={dailyLogs}
              onToggleTask={taskActions.toggleDone}
              onSaveLog={handleSaveLog}
              onDeleteTask={handleDeleteTask}
              onAddTask={() => setIsModalOpen(true)}
              onEditTask={handleEditTask}
            />
          )}
        </main>

        {isModalOpen && (
          <AddTaskModal
            onClose={handleCloseModal}
            onSubmit={handleSubmitTask}
            selectedDate={selectedDate}
            categories={categories}
            editingTask={editingTask}
          />
        )}

        {isCategoryModalOpen && (
          <CategoryModal
            categories={categories}
            onClose={() => setIsCategoryModalOpen(false)}
            onAdd={handleAddCategory}
            onDelete={handleDeleteCategory}
          />
        )}

        {isSettingsModalOpen && (
          <SettingsModal
            settings={settings}
            onUpdate={savePreferences}
            onClose={() => setIsSettingsModalOpen(false)}
            onClearAll={isOwner ? handleClearAll : undefined}
          />
        )}

        {isMembersModalOpen && (
          <MembersModal onClose={() => setIsMembersModalOpen(false)} />
        )}

        {taskToDelete && (
          <ConfirmDialog
            isOpen={!!taskToDelete}
            onClose={() => setTaskToDelete(null)}
            onConfirm={confirmDeleteTask}
            title="Excluir tarefa"
            description={`Tem certeza que deseja excluir "${taskToDelete.text}"?`}
            confirmText="Excluir"
            cancelText="Cancelar"
            variant="danger"
          />
        )}

      </div>
    </div>
  );
}
