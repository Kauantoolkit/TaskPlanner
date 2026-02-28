import React, { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Search, CalendarCheck2, ListTodo, Menu, X, Loader2 } from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { TaskItem } from './components/TaskItem';
import { AddTaskModal } from './components/AddTaskModal';
import { CategoryModal } from './components/CategoryModal';
import { SettingsModal } from './components/SettingsModal';
import { CalendarView } from './components/CalendarView';
import { useDataRepository } from './hooks/useDataRepository';
import { Toaster, toast } from 'sonner';
import { ImageWithFallback } from './components/figma/ImageWithFallback';
import { Task, Category, Settings } from './types';
import { motion as Motion, AnimatePresence } from 'motion/react';
import { WorkspaceProvider } from './context/WorkspaceContext';
import { MembersModal } from './components/MembersModal';
import { AuthProvider } from './components/AuthProvider';
import { LocalModeBanner } from './components/LocalModeBanner';
import { AdBanner } from './components/AdBanner';
import { useIsMobile } from './components/ui/use-mobile';
import { Sheet, SheetContent, SheetTrigger } from './components/ui/sheet';

const INITIAL_CATEGORIES: Category[] = [
  { id: '1', name: 'Trabalho', color: 'bg-blue-500 text-white' },
  { id: '2', name: 'Pessoal', color: 'bg-emerald-500 text-white' },
  { id: '3', name: 'Saúde', color: 'bg-rose-500 text-white' },
];

const INITIAL_SETTINGS: Settings = {
  darkMode: false,
  showCompleted: true,
  confirmDelete: true,
};

export default function App() {
  return (
    <AuthProvider>
      <WorkspaceProvider>
        <AppContent />
      </WorkspaceProvider>
    </AuthProvider>
  );
}

function AppContent() {
  const {
    tasks,
    categories,
    settings,
    loading,
    addTask,
    updateTask,
    deleteTask,
    addCategory,
    deleteCategory,
    updateSettings,
    clearAll,
  } = useDataRepository();
  const isMobile = useIsMobile();
  
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentView, setCurrentView] = useState<'planner' | 'calendar'>('planner');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingTask, setEditingTask] = useState<Task | undefined>(undefined);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Mostrar loading se ainda carregando dados
  if (loading) {
    return (
      <div className="min-h-screen bg-[#fafafa] dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={48} className="text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-400 font-bold">Carregando dados...</p>
        </div>
      </div>
    );
  }

  const formattedSelectedDate = format(selectedDate, 'yyyy-MM-dd');

  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const matchesSearch = task.text.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      if (task.isPermanent) return true;
      
      if (task.isDelivery && task.deliveryDate) {
        return formattedSelectedDate <= task.deliveryDate;
      }
      
      return task.date === formattedSelectedDate;
    });
  }, [tasks, formattedSelectedDate, searchQuery]);

  const stats = useMemo(() => {
    const dailyTasks = filteredTasks;
    const completedCount = dailyTasks.filter(task => {
      if (task.isPermanent) {
        return task.completedDates.includes(formattedSelectedDate);
      }
      return task.completed;
    }).length;

    return {
      total: dailyTasks.length,
      completed: completedCount,
      percentage: dailyTasks.length > 0 ? Math.round((completedCount / dailyTasks.length) * 100) : 0
    };
  }, [filteredTasks, formattedSelectedDate]);

  const handleAddTask = async (newTask: { text: string; isPermanent: boolean; date?: string; categoryId?: string; isDelivery?: boolean; deliveryDate?: string }) => {
    try {
      await addTask({
        text: newTask.text,
        isPermanent: newTask.isPermanent,
        completedDates: [],
        date: newTask.isPermanent || newTask.isDelivery ? undefined : newTask.date,
        completed: false,
        categoryId: newTask.categoryId,
        isDelivery: newTask.isDelivery,
        deliveryDate: newTask.deliveryDate,
      });
      toast.success(newTask.isDelivery ? 'Entrega criada!' : 'Tarefa adicionada!');
    } catch (err) {
      toast.error('Erro ao adicionar tarefa');
    }
  };

  const handleToggleTask = async (id: string, customDate?: string) => {
    const targetDate = customDate || formattedSelectedDate;
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    if (task.isPermanent) {
      const isCompleted = task.completedDates.includes(targetDate);
      const newCompletedDates = isCompleted
        ? task.completedDates.filter(d => d !== targetDate)
        : [...task.completedDates, targetDate];
      await updateTask(id, { completedDates: newCompletedDates });
    } else {
      await updateTask(id, { completed: !task.completed });
    }
  };

  const handleDeleteTask = async (id: string) => {
    if (settings.confirmDelete) {
      if (!confirm('Deseja excluir esta tarefa?')) return;
    }
    try {
      await deleteTask(id);
      toast.info('Tarefa removida');
    } catch (err) {
      toast.error('Erro ao remover tarefa');
    }
  };

  const handleAddCategory = async (name: string, color: string) => {
    try {
      await addCategory(name, color);
      toast.success('Categoria criada!');
    } catch (err) {
      toast.error('Erro ao criar categoria');
    }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      await deleteCategory(id);
      toast.info('Categoria removida');
    } catch (err) {
      toast.error('Erro ao remover categoria');
    }
  };

  const handleClearAll = async () => {
    try {
      await clearAll();
      setIsSettingsModalOpen(false);
      toast.success('Todos os dados foram limpos.');
    } catch (err) {
      toast.error('Erro ao limpar dados');
    }
  };

  const handleEditTask = (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (task) {
      setEditingTask(task);
      setIsModalOpen(true);
    }
  };

  const handleUpdateTask = async (id: string, updatedData: { text: string; isPermanent: boolean; date?: string; categoryId?: string; isDelivery?: boolean; deliveryDate?: string }) => {
    try {
      await updateTask(id, {
        text: updatedData.text,
        isPermanent: updatedData.isPermanent,
        date: updatedData.isPermanent || updatedData.isDelivery ? undefined : updatedData.date,
        categoryId: updatedData.categoryId,
        isDelivery: updatedData.isDelivery,
        deliveryDate: updatedData.deliveryDate
      });
      toast.success('Tarefa atualizada!');
    } catch (err) {
      toast.error('Erro ao atualizar tarefa');
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingTask(undefined);
  };

  return (
    <div className={`flex h-screen bg-[#fafafa] text-gray-900 font-sans selection:bg-blue-100 ${settings.darkMode ? 'dark' : ''}`}>
      <Toaster position="top-right" />
      
      <div className="flex h-full w-full bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-300">
        {/* Sidebar - Desktop: sempre visível | Mobile: via Sheet */}
        {isMobile ? (
          <>
            {/* Botão do menu hamburguer - só visível em mobile */}
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="fixed top-4 left-4 z-50 p-2 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-100 dark:border-gray-800 min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              <Menu size={24} />
            </button>
            
            {/* Sheet - Sidebar em mobile */}
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
                    key={formattedSelectedDate}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-8 md:space-y-10"
                  >
                    {filteredTasks.filter(t => t.isDelivery).length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-4 px-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                          <h3 className="text-xs uppercase tracking-[0.2em] font-black text-gray-400">Entregas Pendentes</h3>
                        </div>
                        <div className="grid gap-3">
                          {filteredTasks
                            .filter(t => t.isDelivery)
                            .map(task => (
                              <TaskItem
                                key={task.id}
                                task={{
                                  ...task,
                                  completed: !!task.completed
                                }}
                                category={categories.find(c => c.id === task.categoryId)}
                                onToggle={handleToggleTask}
                                onDelete={handleDeleteTask}
                                onEdit={handleEditTask}
                                selectedDate={formattedSelectedDate}
                              />
                            ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <div className="flex items-center gap-2 mb-4 px-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                        <h3 className="text-xs uppercase tracking-[0.2em] font-black text-gray-400">Rotina Permanente</h3>
                      </div>
                      <div className="grid gap-3">
                        {filteredTasks.filter(t => t.isPermanent).length > 0 ? (
                          filteredTasks
                            .filter(t => t.isPermanent)
                            .map(task => (
                              <TaskItem
                                key={task.id}
                                task={{
                                  ...task,
                                  completed: task.completedDates.includes(formattedSelectedDate)
                                }}
                                category={categories.find(c => c.id === task.categoryId)}
                                onToggle={handleToggleTask}
                                onDelete={handleDeleteTask}
                                onEdit={handleEditTask}
                              />
                            ))
                        ) : (
                          <p className="text-sm font-bold text-gray-300 px-2 italic">Nenhuma rotina para exibir.</p>
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-4 px-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                        <h3 className="text-xs uppercase tracking-[0.2em] font-black text-gray-400">Tarefas do Dia</h3>
                      </div>
                      <div className="grid gap-3">
                        {filteredTasks.filter(t => !t.isPermanent && !t.isDelivery).length > 0 ? (
                          filteredTasks
                            .filter(t => !t.isPermanent && !t.isDelivery)
                            .map(task => (
                              <TaskItem
                                key={task.id}
                                task={{
                                  ...task,
                                  completed: !!task.completed
                                }}
                                category={categories.find(c => c.id === task.categoryId)}
                                onToggle={handleToggleTask}
                                onDelete={handleDeleteTask}
                                onEdit={handleEditTask}
                              />
                            ))
                        ) : (
                          <p className="text-sm font-bold text-gray-300 px-2 italic">Nenhuma tarefa específica hoje.</p>
                        )}
                      </div>
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
              onToggleTask={handleToggleTask}
              onDeleteTask={handleDeleteTask}
              onAddTask={() => setIsModalOpen(true)}
            />
          )}
        </main>

        {isModalOpen && (
          <AddTaskModal
            onClose={handleCloseModal}
            onAdd={handleAddTask}
            selectedDate={selectedDate}
            categories={categories}
            editingTask={editingTask}
            onUpdate={handleUpdateTask}
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
            onUpdate={updateSettings}
            onClose={() => setIsSettingsModalOpen(false)}
            onClearAll={handleClearAll}
          />
        )}

        {isMembersModalOpen && (
          <MembersModal onClose={() => setIsMembersModalOpen(false)} />
        )}

        <LocalModeBanner />
      </div>
    </div>
  );
}
