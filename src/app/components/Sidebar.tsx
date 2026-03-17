import React, { useState, useRef, useEffect } from 'react';
import { format, addDays, subDays, isSameDay, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ListTodo, ChevronLeft, ChevronRight, Layers, Settings, Calendar as CalendarIcon, PlusCircle, LayoutDashboard, Users, LogOut, ChevronDown, Plus, Hash, Briefcase, Home, User as UserIcon } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { motion as Motion, AnimatePresence } from 'motion/react';
import { useWorkspace } from '../context/WorkspaceContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { toast } from 'sonner';
import { Workspace } from '../types';

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

const WORKSPACE_TYPE_ICONS: Record<string, React.ReactNode> = {
  personal: <UserIcon size={14} />,
  family: <Home size={14} />,
  business: <Briefcase size={14} />,
};

const WORKSPACE_TYPE_LABELS: Record<string, string> = {
  personal: 'Pessoal',
  family: 'Família',
  business: 'Negócio',
};

// ── Modal to create or join a workspace ──────────────────────────
function WorkspaceActionModal({ mode, onClose }: {
  mode: 'create' | 'join';
  onClose: () => void;
}) {
  const { createWorkspace, joinWorkspace } = useWorkspace();
  const [name, setName] = useState('');
  const [type, setType] = useState<Workspace['type']>('personal');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === 'create') {
        if (!name.trim()) return;
        await createWorkspace(name.trim(), type);
        toast.success('Workspace criado!');
      } else {
        if (!code.trim()) return;
        await joinWorkspace(code.trim());
        toast.success('Entrou no workspace!');
      }
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao processar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <Motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm border border-gray-100 dark:border-gray-800 p-6"
      >
        <h2 className="text-lg font-black text-gray-900 dark:text-gray-100 mb-4">
          {mode === 'create' ? 'Criar Workspace' : 'Entrar com Código'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'create' ? (
            <>
              <div>
                <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1">Nome</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Ex: Casa, Empresa..."
                  autoFocus
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-bold focus:outline-none focus:border-blue-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1">Tipo</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['personal', 'family', 'business'] as Workspace['type'][]).map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setType(t)}
                      className={cn(
                        'py-2 px-3 rounded-xl border-2 font-bold text-xs transition-all flex flex-col items-center gap-1',
                        type === t
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400'
                          : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300'
                      )}
                    >
                      {WORKSPACE_TYPE_ICONS[t]}
                      {WORKSPACE_TYPE_LABELS[t]}
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div>
              <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1">Código de Convite</label>
              <input
                type="text"
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
                placeholder="XXXXXX"
                autoFocus
                maxLength={10}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-black text-center tracking-[0.3em] text-lg focus:outline-none focus:border-blue-500 transition-all"
              />
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={loading || (mode === 'create' ? !name.trim() : !code.trim())}
              className={cn(
                'flex-1 py-3 rounded-xl font-black transition-all',
                loading || (mode === 'create' ? !name.trim() : !code.trim())
                  ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              )}
            >
              {loading ? 'Aguarde...' : mode === 'create' ? 'Criar' : 'Entrar'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-black hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
            >
              Cancelar
            </button>
          </div>
        </form>
      </Motion.div>
    </div>
  );
}

// ── Workspace switcher dropdown ───────────────────────────────────
function WorkspaceSwitcher({ onOpenMembers }: { onOpenMembers?: () => void }) {
  const { currentWorkspace, workspaces, switchWorkspace } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'join' | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <>
      <div ref={ref} className="relative px-4 md:px-6 py-3 border-b border-gray-100 dark:border-gray-800">
        <button
          onClick={() => setOpen(o => !o)}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors group"
        >
          <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center text-white shrink-0">
            {WORKSPACE_TYPE_ICONS[currentWorkspace?.type || 'personal']}
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-sm font-black text-gray-800 dark:text-gray-100 truncate">
              {currentWorkspace?.name || 'Workspace'}
            </p>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              {WORKSPACE_TYPE_LABELS[currentWorkspace?.type || 'personal']}
            </p>
          </div>
          <ChevronDown
            size={16}
            className={cn('text-gray-400 transition-transform shrink-0', open && 'rotate-180')}
          />
        </button>

        <AnimatePresence>
          {open && (
            <Motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.12 }}
              className="absolute left-4 right-4 top-full mt-1 bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 z-50 overflow-hidden"
            >
              {/* Workspace list */}
              <div className="p-2 space-y-0.5 max-h-48 overflow-y-auto">
                {workspaces.map(ws => (
                  <button
                    key={ws.id}
                    onClick={() => { switchWorkspace(ws.id); setOpen(false); }}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold transition-colors text-left',
                      ws.id === currentWorkspace?.id
                        ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                    )}
                  >
                    <span className="shrink-0 text-gray-400">
                      {WORKSPACE_TYPE_ICONS[ws.type]}
                    </span>
                    <span className="truncate flex-1">{ws.name}</span>
                    {ws.id === currentWorkspace?.id && (
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                    )}
                  </button>
                ))}
              </div>

              <div className="border-t border-gray-100 dark:border-gray-800 p-2 space-y-0.5">
                {onOpenMembers && (
                  <button
                    onClick={() => { setOpen(false); onOpenMembers(); }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <Users size={14} className="text-gray-400 shrink-0" />
                    Membros
                  </button>
                )}
                {isSupabaseConfigured && (
                  <>
                    <button
                      onClick={() => { setOpen(false); setModalMode('create'); }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <Plus size={14} className="text-gray-400 shrink-0" />
                      Criar workspace
                    </button>
                    <button
                      onClick={() => { setOpen(false); setModalMode('join'); }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <Hash size={14} className="text-gray-400 shrink-0" />
                      Entrar com código
                    </button>
                  </>
                )}
              </div>
            </Motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {modalMode && (
          <WorkspaceActionModal
            mode={modalMode}
            onClose={() => setModalMode(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

// ── Main Sidebar component ────────────────────────────────────────
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
  const start = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const end = endOfWeek(selectedDate, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start, end });

  const handleLogout = async () => {
    if (!isSupabaseConfigured) {
      toast.info('Modo local ativo - sem sessão para sair');
      return;
    }

    try {
      localStorage.clear();
      sessionStorage.clear();

      const { error } = await supabase.auth.signOut();

      if (error) {
        toast.error('Erro ao sair');
      } else {
        toast.success('Saiu com sucesso');
        window.location.reload();
      }
    } catch (err) {
      console.error('Erro ao sair:', err);
    }
  };

  return (
    <aside className="w-80 h-[100dvh] bg-white dark:bg-gray-950 border-r border-gray-100 dark:border-gray-800 flex flex-col shrink-0 transition-colors">
      {/* Logo */}
      <div className="p-4 md:px-8 md:pt-8 pb-3 flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-black text-blue-600 tracking-tight flex items-center gap-2">
          <ListTodo size={24} className="md:w-7" strokeWidth={3} /> <span className="hidden md:inline">Planner</span>
        </h1>
        <button
          onClick={() => onDateChange(new Date())}
          className="text-[10px] font-black uppercase tracking-widest text-blue-500 bg-blue-50 dark:bg-blue-950/30 px-2 py-1 rounded hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
        >
          Hoje
        </button>
      </div>

      {/* Workspace switcher */}
      <WorkspaceSwitcher onOpenMembers={onOpenMembers} />

      <div className="flex-1 min-h-0 overflow-y-auto px-3 md:px-6 py-2 md:py-4 space-y-6 md:space-y-8">
        <section>
          <h2 className="text-xs uppercase tracking-[0.2em] font-black text-gray-400 dark:text-gray-500 mb-3 md:mb-4 px-2">Navegação</h2>
          <div className="space-y-1">
            <button
              onClick={() => onViewChange('planner')}
              className={cn(
                "w-full flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-3 font-bold rounded-xl transition-colors whitespace-nowrap",
                currentView === 'planner'
                  ? "bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400"
                  : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900"
              )}
            >
              <LayoutDashboard size={18} className={currentView === 'planner' ? "text-blue-600" : "text-gray-400"} /> <span className="text-sm md:text-base">Planner Diário</span>
            </button>
            <button
              onClick={() => onViewChange('calendar')}
              className={cn(
                "w-full flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-3 font-bold rounded-xl transition-colors whitespace-nowrap",
                currentView === 'calendar'
                  ? "bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400"
                  : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900"
              )}
            >
              <CalendarIcon size={18} className={currentView === 'calendar' ? "text-blue-600" : "text-gray-400"} /> <span className="text-sm md:text-base">Calendário</span>
            </button>
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-3 md:mb-4 px-2">
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
                          "text-[9px] md:text-xs uppercase tracking-widest font-black",
                          isActive ? "text-blue-200" : (isToday ? "text-blue-500" : "text-gray-400 dark:text-gray-600 group-hover:text-blue-400")
                        )}>
                          {format(date, 'EEE', { locale: ptBR })}
                        </span>
                        <span className={cn(
                          "text-sm md:text-base font-bold",
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
          <h2 className="text-xs uppercase tracking-[0.2em] font-black text-gray-400 dark:text-gray-500 mb-3 md:mb-4 px-2">Configuração</h2>
          <div className="space-y-1">
            <button
              onClick={onOpenCategories}
              className="w-full flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-3 text-gray-600 dark:text-gray-300 font-bold hover:bg-gray-50 dark:hover:bg-gray-900 rounded-xl transition-colors whitespace-nowrap"
            >
              <Layers size={18} className="text-gray-400" /> <span className="text-sm md:text-base">Categorias</span>
            </button>
            <button
              onClick={onOpenSettings}
              className="w-full flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-3 text-gray-600 dark:text-gray-300 font-bold hover:bg-gray-50 dark:hover:bg-gray-900 rounded-xl transition-colors whitespace-nowrap"
            >
              <Settings size={18} className="text-gray-400" /> <span className="text-sm md:text-base">Configurações</span>
            </button>
          </div>
        </section>
      </div>

      <div className="p-3 md:p-6 pt-2 space-y-2 mt-auto">
        <button
          onClick={onAddTask}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-black py-2.5 md:py-3 rounded-xl md:rounded-2xl transition-all active:scale-98"
        >
          <PlusCircle size={18} className="md:w-5" /> <span className="text-sm md:text-base">NOVA TAREFA</span>
        </button>

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-black py-2.5 md:py-3 rounded-xl md:rounded-2xl transition-all active:scale-98"
        >
          <LogOut size={18} className="md:w-5" /> <span className="text-sm md:text-base">SAIR</span>
        </button>
      </div>
    </aside>
  );
};
