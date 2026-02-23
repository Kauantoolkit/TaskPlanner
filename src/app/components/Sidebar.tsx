import { format, addDays, subDays, isSameDay, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ListTodo, ChevronLeft, ChevronRight, Layers, Settings, Calendar as CalendarIcon, PlusCircle, LayoutDashboard, Users, LogOut, LogIn } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { motion as Motion, AnimatePresence } from 'motion/react';
import { useWorkspace } from '../context/WorkspaceContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { toast } from 'sonner';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface SidebarProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  onAddTask: () => void;
  onOpenCategories: () => void;
  onOpenSettings: () => void;
  onViewChange: (view: 'planner' | 'calendar') => void;
  currentView: 'planner' | 'calendar';
  onOpenMembers?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  selectedDate, 
  onDateChange, 
  onAddTask, 
  onOpenCategories, 
  onOpenSettings,
  onViewChange,
  currentView,
  onOpenMembers
}) => {
  // Calculamos o início e o fim da semana para a data selecionada (Segunda a Domingo)
  const start = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const end = endOfWeek(selectedDate, { weekStartsOn: 1 });
  
  // Geramos o array de 7 dias da semana
  const days = eachDayOfInterval({ start, end });

  const handleLogout = async () => {
    // No modo local, não há logout real
    if (!isSupabaseConfigured) {
      toast.info('Modo local ativo - sem sessão para sair');
      return;
    }

    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error('Erro ao sair');
    } else {
      toast.success('Saiu com sucesso');
    }
  };

  return (
    <aside className="w-80 h-screen bg-white dark:bg-gray-950 border-r border-gray-100 dark:border-gray-800 flex flex-col shrink-0 transition-colors">
      <div className="p-8 pb-4 flex items-center justify-between">
        <h1 className="text-2xl font-black text-blue-600 tracking-tight flex items-center gap-2">
          <ListTodo size={28} strokeWidth={3} /> Planner
        </h1>
        <button 
          onClick={() => onDateChange(new Date())}
          className="text-[10px] font-black uppercase tracking-widest text-blue-500 bg-blue-50 dark:bg-blue-950/30 px-2 py-1 rounded hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
        >
          Hoje
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-8">
        <section>
          <h2 className="text-xs uppercase tracking-[0.2em] font-black text-gray-400 dark:text-gray-500 mb-4 px-2">Navegação</h2>
          <div className="space-y-1">
            <button 
              onClick={() => onViewChange('planner')}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 font-bold rounded-xl transition-colors whitespace-nowrap",
                currentView === 'planner' 
                  ? "bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400" 
                  : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900"
              )}
            >
              <LayoutDashboard size={18} className={currentView === 'planner' ? "text-blue-600" : "text-gray-400"} /> Planner Diário
            </button>
            <button 
              onClick={() => onViewChange('calendar')}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 font-bold rounded-xl transition-colors whitespace-nowrap",
                currentView === 'calendar' 
                  ? "bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400" 
                  : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900"
              )}
            >
              <CalendarIcon size={18} className={currentView === 'calendar' ? "text-blue-600" : "text-gray-400"} /> Calendário Completo
            </button>
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-4 px-2">
            <h2 className="text-xs uppercase tracking-[0.2em] font-black text-gray-400 dark:text-gray-500">Próximos Dias</h2>
            <div className="flex gap-1">
              <button 
                onClick={() => onDateChange(subDays(selectedDate, 1))}
                className="p-1.5 hover:bg-gray-50 dark:hover:bg-gray-900 rounded-lg text-gray-400 transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <button 
                onClick={() => onDateChange(addDays(selectedDate, 1))}
                className="p-1.5 hover:bg-gray-50 dark:hover:bg-gray-900 rounded-lg text-gray-400 transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
          <div className="space-y-2 relative">
            <AnimatePresence mode="popLayout" initial={false}>
              <Motion.div 
                key={days[0].toISOString()}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2 }}
                className="space-y-2"
              >
                {days.map((date) => {
                  const isActive = isSameDay(date, selectedDate);
                  const isToday = isSameDay(date, new Date());
                  
                  return (
                    <button
                      key={date.toISOString()}
                      onClick={() => onDateChange(date)}
                      className={cn(
                        "w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all border border-transparent",
                        isActive 
                          ? "bg-blue-600 text-white shadow-lg shadow-blue-200 dark:shadow-none border-blue-500" 
                          : "hover:bg-blue-50/50 dark:hover:bg-blue-900/20 hover:border-blue-100 dark:hover:border-blue-900 group"
                      )}
                    >
                      <div className="flex flex-col items-start">
                        <span className={cn(
                          "text-xs uppercase tracking-widest font-black",
                          isActive ? "text-blue-200" : (isToday ? "text-blue-500" : "text-gray-400 dark:text-gray-600 group-hover:text-blue-400")
                        )}>
                          {format(date, 'EEEE', { locale: ptBR })}
                        </span>
                        <span className={cn(
                          "text-base font-bold",
                          isActive ? "text-white" : "text-gray-700 dark:text-gray-300"
                        )}>
                          {format(date, 'dd MMM', { locale: ptBR })}
                        </span>
                      </div>
                      {isToday && !isActive && <div className="w-1.5 h-1.5 rounded-full bg-blue-500 ring-4 ring-blue-50 dark:ring-blue-950" />}
                    </button>
                  );
                })}
              </Motion.div>
            </AnimatePresence>
          </div>
        </section>

        <section>
          <h2 className="text-xs uppercase tracking-[0.2em] font-black text-gray-400 dark:text-gray-500 mb-4 px-2">Configuração</h2>
          <div className="space-y-1">
            <button 
              onClick={onOpenCategories}
              className="w-full flex items-center gap-3 px-4 py-3 text-gray-600 dark:text-gray-300 font-bold hover:bg-gray-50 dark:hover:bg-gray-900 rounded-xl transition-colors whitespace-nowrap"
            >
              <Layers size={18} className="text-gray-400" /> Categorias
            </button>
            <button 
              onClick={onOpenSettings}
              className="w-full flex items-center gap-3 px-4 py-3 text-gray-600 dark:text-gray-300 font-bold hover:bg-gray-50 dark:hover:bg-gray-900 rounded-xl transition-colors whitespace-nowrap"
            >
              <Settings size={18} className="text-gray-400" /> Configurações
            </button>
            {onOpenMembers && (
              <button 
                onClick={onOpenMembers}
                className="w-full flex items-center gap-3 px-4 py-3 text-gray-600 dark:text-gray-300 font-bold hover:bg-gray-50 dark:hover:bg-gray-900 rounded-xl transition-colors whitespace-nowrap"
              >
                <Users size={18} className="text-gray-400" /> Membros
              </button>
            )}
          </div>
        </section>
      </div>

      <div className="p-6 pt-2 space-y-2">
        <button 
          onClick={onAddTask}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl transition-all active:scale-98"
        >
          <PlusCircle size={20} /> NOVA TAREFA
        </button>

        <button 
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-black py-4 rounded-2xl transition-all active:scale-98"
        >
          <LogOut size={20} /> SAIR
        </button>
      </div>
    </aside>
  );
};